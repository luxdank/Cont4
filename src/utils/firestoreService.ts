import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  CompanyConfig,
  WhatsAppSector,
  BioLinkItem,
  LeadRecord,
  PixClickRecord,
  LinkClickRecord,
} from '../types';
import {
  INITIAL_COMPANY_CONFIG,
  INITIAL_SECTORS,
  INITIAL_BIO_LINKS,
  INITIAL_LEADS,
} from '../data/initialData';

const CONFIG_DOC_PATH = 'config/main';
const SECTORS_COLLECTION = 'sectors';
const LINKS_COLLECTION = 'links';
const LEADS_COLLECTION = 'leads';
const PIX_CLICKS_COLLECTION = 'pixClicks';
const LINK_CLICKS_COLLECTION = 'linkClicks';

/**
 * Clean object of any undefined fields for Firestore
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Initializes and seeds Firestore if empty
 */
export async function initializeFirestoreDatabase(): Promise<void> {
  try {
    const configDocRef = doc(db, 'config', 'main');
    const configSnap = await getDoc(configDocRef);

    if (!configSnap.exists()) {
      // Seed main company configuration
      await setDoc(configDocRef, sanitizeForFirestore(INITIAL_COMPANY_CONFIG));
    }

    // Ensure all standard sectors exist
    for (const sector of INITIAL_SECTORS) {
      const sRef = doc(db, SECTORS_COLLECTION, sector.id);
      const sSnap = await getDoc(sRef);
      if (!sSnap.exists()) {
        await setDoc(sRef, sanitizeForFirestore(sector));
      }
    }

    // Ensure all standard bio links exist
    for (const link of INITIAL_BIO_LINKS) {
      const lRef = doc(db, LINKS_COLLECTION, link.id);
      const lSnap = await getDoc(lRef);
      if (!lSnap.exists()) {
        await setDoc(lRef, sanitizeForFirestore(link));
      }
    }

    // Ensure leads collection is populated
    const leadsSnap = await getDocs(collection(db, LEADS_COLLECTION));
    if (leadsSnap.empty) {
      for (const lead of INITIAL_LEADS) {
        await setDoc(doc(db, LEADS_COLLECTION, lead.id), sanitizeForFirestore(lead));
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('offline') || msg.includes('unavailable')) {
      console.warn('Firestore offline during initial seed check. Local cache and subscriptions will sync automatically.');
      return;
    }
    if (msg.toLowerCase().includes('permission') || (error as any)?.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.WRITE, 'init_seed');
    } else {
      console.warn('Firestore initialization notice:', error);
    }
  }
}

/**
 * Real-time subscription to Company Configuration
 */
export function subscribeToCompanyConfig(
  onUpdate: (config: CompanyConfig) => void
): () => void {
  const docRef = doc(db, 'config', 'main');

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as CompanyConfig);
      } else {
        // Auto-seed if not found
        setDoc(docRef, sanitizeForFirestore(INITIAL_COMPANY_CONFIG)).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, CONFIG_DOC_PATH)
        );
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, CONFIG_DOC_PATH);
    }
  );
}

/**
 * Save Company Configuration to Firestore
 */
export async function saveCompanyConfigToFirestore(config: CompanyConfig): Promise<void> {
  try {
    const docRef = doc(db, 'config', 'main');
    await setDoc(docRef, sanitizeForFirestore(config));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CONFIG_DOC_PATH);
  }
}

/**
 * Real-time subscription to WhatsApp Sectors
 */
export function subscribeToSectors(
  onUpdate: (sectors: WhatsAppSector[]) => void
): () => void {
  const colRef = collection(db, SECTORS_COLLECTION);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (!snapshot.empty) {
        const sectors = snapshot.docs.map((d) => d.data() as WhatsAppSector);
        onUpdate(sectors);
      } else {
        // Seed default sectors
        for (const sector of INITIAL_SECTORS) {
          await setDoc(doc(db, SECTORS_COLLECTION, sector.id), sanitizeForFirestore(sector)).catch(
            (err) => handleFirestoreError(err, OperationType.CREATE, SECTORS_COLLECTION)
          );
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, SECTORS_COLLECTION);
    }
  );
}

/**
 * Save Sectors list to Firestore
 */
export async function saveSectorsToFirestore(sectors: WhatsAppSector[]): Promise<void> {
  try {
    const activeIds = new Set(sectors.map((s) => s.id));
    const existingSnap = await getDocs(collection(db, SECTORS_COLLECTION));
    for (const d of existingSnap.docs) {
      if (!activeIds.has(d.id)) {
        await deleteDoc(d.ref);
      }
    }
    for (const sector of sectors) {
      await setDoc(doc(db, SECTORS_COLLECTION, sector.id), sanitizeForFirestore(sector));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SECTORS_COLLECTION);
  }
}

/**
 * Increment visits counter in Firestore
 */
export async function incrementBioVisitsInFirestore(): Promise<void> {
  try {
    const configDocRef = doc(db, 'config', 'main');
    await updateDoc(configDocRef, {
      totalVisits: increment(1),
    });
  } catch (e) {
    // Non-blocking if offline
  }
}

/**
 * Real-time subscription to Bio Links
 */
export function subscribeToBioLinks(
  onUpdate: (links: BioLinkItem[]) => void
): () => void {
  const colRef = collection(db, LINKS_COLLECTION);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (!snapshot.empty) {
        let links = snapshot.docs.map((d) => d.data() as BioLinkItem);
        const existingIds = new Set(links.map((l) => l.id));
        const existingSectors = new Set(links.map((l) => l.sectorId));

        // Detect missing standard defaults
        const missingDefaults = INITIAL_BIO_LINKS.filter(
          (def) => !existingIds.has(def.id) && !existingSectors.has(def.sectorId)
        );

        if (missingDefaults.length > 0) {
          for (const missing of missingDefaults) {
            setDoc(doc(db, LINKS_COLLECTION, missing.id), sanitizeForFirestore(missing)).catch(console.warn);
          }
          links = [...links, ...missingDefaults];
        }

        // If only 1 link or 0 links are active, automatically restore default links to active: true
        const activeCount = links.filter((l) => l.active).length;
        if (activeCount <= 1) {
          links = links.map((l) => {
            const isDefault = INITIAL_BIO_LINKS.some(
              (def) => def.id === l.id || def.sectorId === l.sectorId
            );
            if (isDefault && !l.active) {
              setDoc(doc(db, LINKS_COLLECTION, l.id), sanitizeForFirestore({ ...l, active: true })).catch(console.warn);
              return { ...l, active: true };
            }
            return l;
          });
        }

        // Sort by order
        links.sort((a, b) => a.order - b.order);
        onUpdate(links);
      } else {
        // Seed default bio links
        for (const link of INITIAL_BIO_LINKS) {
          await setDoc(doc(db, LINKS_COLLECTION, link.id), sanitizeForFirestore(link)).catch(
            (err) => handleFirestoreError(err, OperationType.CREATE, LINKS_COLLECTION)
          );
        }
        onUpdate(INITIAL_BIO_LINKS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LINKS_COLLECTION);
    }
  );
}

/**
 * Reset all Bio Links in Firestore back to standard 4 options
 */
export async function resetBioLinksInFirestore(): Promise<BioLinkItem[]> {
  try {
    for (const link of INITIAL_BIO_LINKS) {
      await setDoc(doc(db, LINKS_COLLECTION, link.id), sanitizeForFirestore(link));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LINKS_COLLECTION);
  }
  return INITIAL_BIO_LINKS;
}

/**
 * Save Bio Links list to Firestore
 */
export async function saveBioLinksToFirestore(links: BioLinkItem[]): Promise<void> {
  try {
    const activeIds = new Set(links.map((l) => l.id));
    // Fetch existing docs to delete any links removed in UI
    const existingSnap = await getDocs(collection(db, LINKS_COLLECTION));
    for (const d of existingSnap.docs) {
      if (!activeIds.has(d.id)) {
        await deleteDoc(d.ref);
      }
    }
    // Save updated/new links
    for (const link of links) {
      await setDoc(doc(db, LINKS_COLLECTION, link.id), sanitizeForFirestore(link));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LINKS_COLLECTION);
  }
}

/**
 * Delete a single Bio Link from Firestore
 */
export async function deleteBioLinkFromFirestore(linkId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LINKS_COLLECTION, linkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LINKS_COLLECTION}/${linkId}`);
  }
}

/**
 * Real-time subscription to Captured Leads
 */
export function subscribeToLeads(
  onUpdate: (leads: LeadRecord[]) => void
): () => void {
  const colRef = collection(db, LEADS_COLLECTION);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (!snapshot.empty) {
        const leads = snapshot.docs.map((d) => d.data() as LeadRecord);
        // Sort newest first
        leads.sort((a, b) => (b.fullDate || '').localeCompare(a.fullDate || ''));
        onUpdate(leads);
      } else {
        // If Firestore has no leads, auto-seed INITIAL_LEADS so user data is recovered
        for (const lead of INITIAL_LEADS) {
          setDoc(doc(db, LEADS_COLLECTION, lead.id), sanitizeForFirestore(lead)).catch(console.warn);
        }
        onUpdate(INITIAL_LEADS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LEADS_COLLECTION);
    }
  );
}

/**
 * Restore all default leads in Firestore
 */
export async function restoreLeadsInFirestore(): Promise<LeadRecord[]> {
  try {
    for (const lead of INITIAL_LEADS) {
      await setDoc(doc(db, LEADS_COLLECTION, lead.id), sanitizeForFirestore(lead));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LEADS_COLLECTION);
  }
  return INITIAL_LEADS;
}

/**
 * Add newly captured lead to Firestore
 */
export async function addLeadToFirestore(lead: LeadRecord): Promise<void> {
  try {
    await setDoc(doc(db, LEADS_COLLECTION, lead.id), sanitizeForFirestore(lead));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${LEADS_COLLECTION}/${lead.id}`);
  }
}

/**
 * Update existing lead in Firestore (e.g. funnel stage, notes, scheduled date)
 */
export async function updateLeadInFirestore(lead: LeadRecord): Promise<void> {
  try {
    await setDoc(doc(db, LEADS_COLLECTION, lead.id), sanitizeForFirestore(lead), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${LEADS_COLLECTION}/${lead.id}`);
  }
}

/**
 * Delete a lead from Firestore
 */
export async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LEADS_COLLECTION, leadId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LEADS_COLLECTION}/${leadId}`);
  }
}

/**
 * Real-time subscription to PIX clicks
 */
export function subscribeToPixClicks(
  onUpdate: (clicks: PixClickRecord[]) => void
): () => void {
  const colRef = collection(db, PIX_CLICKS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const clicks = snapshot.docs.map((d) => d.data() as PixClickRecord);
      // Sort newest first
      clicks.sort((a, b) => (b.fullDate || '').localeCompare(a.fullDate || ''));
      onUpdate(clicks);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PIX_CLICKS_COLLECTION);
    }
  );
}

/**
 * Record a PIX click event in Firestore
 */
export async function recordPixClickInFirestore(click: PixClickRecord): Promise<void> {
  try {
    await setDoc(doc(db, PIX_CLICKS_COLLECTION, click.id), sanitizeForFirestore(click));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PIX_CLICKS_COLLECTION}/${click.id}`);
  }
}

/**
 * Delete a PIX click event from Firestore
 */
export async function deletePixClickFromFirestore(clickId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PIX_CLICKS_COLLECTION, clickId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PIX_CLICKS_COLLECTION}/${clickId}`);
  }
}

/**
 * Real-time subscription to ALL Bio Link clicks
 */
export function subscribeToLinkClicks(
  onUpdate: (clicks: LinkClickRecord[]) => void
): () => void {
  const colRef = collection(db, LINK_CLICKS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const clicks = snapshot.docs.map((d) => d.data() as LinkClickRecord);
      // Sort newest first
      clicks.sort((a, b) => (b.fullDate || '').localeCompare(a.fullDate || ''));
      onUpdate(clicks);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LINK_CLICKS_COLLECTION);
    }
  );
}

/**
 * Record a link click event in Firestore
 */
export async function recordLinkClickInFirestore(click: LinkClickRecord): Promise<void> {
  try {
    await setDoc(doc(db, LINK_CLICKS_COLLECTION, click.id), sanitizeForFirestore(click));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${LINK_CLICKS_COLLECTION}/${click.id}`);
  }
}

/**
 * Delete a link click event from Firestore
 */
export async function deleteLinkClickFromFirestore(clickId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LINK_CLICKS_COLLECTION, clickId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LINK_CLICKS_COLLECTION}/${clickId}`);
  }
}

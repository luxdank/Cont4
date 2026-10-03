import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CompanyConfig, WhatsAppSector, BioLinkItem, LeadRecord } from '../types';
import {
  INITIAL_COMPANY_CONFIG,
  INITIAL_SECTORS,
  INITIAL_BIO_LINKS,
} from '../data/initialData';

const CONFIG_DOC_PATH = 'config/main';
const SECTORS_COLLECTION = 'sectors';
const LINKS_COLLECTION = 'links';
const LEADS_COLLECTION = 'leads';

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

      // Seed sectors
      for (const sector of INITIAL_SECTORS) {
        await setDoc(doc(db, SECTORS_COLLECTION, sector.id), sanitizeForFirestore(sector));
      }

      // Seed bio links
      for (const link of INITIAL_BIO_LINKS) {
        await setDoc(doc(db, LINKS_COLLECTION, link.id), sanitizeForFirestore(link));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'init_seed');
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
    for (const sector of sectors) {
      await setDoc(doc(db, SECTORS_COLLECTION, sector.id), sanitizeForFirestore(sector));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SECTORS_COLLECTION);
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
        const links = snapshot.docs.map((d) => d.data() as BioLinkItem);
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
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LINKS_COLLECTION);
    }
  );
}

/**
 * Save Bio Links list to Firestore
 */
export async function saveBioLinksToFirestore(links: BioLinkItem[]): Promise<void> {
  try {
    for (const link of links) {
      await setDoc(doc(db, LINKS_COLLECTION, link.id), sanitizeForFirestore(link));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LINKS_COLLECTION);
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
    (snapshot) => {
      const leads = snapshot.docs.map((d) => d.data() as LeadRecord);
      // Sort newest first
      leads.sort((a, b) => (b.fullDate || '').localeCompare(a.fullDate || ''));
      onUpdate(leads);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LEADS_COLLECTION);
    }
  );
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
 * Delete a lead from Firestore
 */
export async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LEADS_COLLECTION, leadId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LEADS_COLLECTION}/${leadId}`);
  }
}

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

export const STORAGE_KEYS = {
  CONFIG: 'smartlink_company_config',
  SECTORS: 'smartlink_sectors',
  LINKS: 'smartlink_bio_links',
  LEADS: 'smartlink_leads_records',
  PIX_CLICKS: 'smartlink_pix_clicks_records',
  LINK_CLICKS: 'smartlink_all_link_clicks_records',
};

export const loadCompanyConfig = (): CompanyConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load config from storage', e);
  }
  return INITIAL_COMPANY_CONFIG;
};

export const saveCompanyConfig = (config: CompanyConfig) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartlink_config_updated', { detail: config }));
    }
  } catch (e) {
    console.error('Failed to save config to storage', e);
  }
};

export const loadSectors = (): WhatsAppSector[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SECTORS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load sectors', e);
  }
  return INITIAL_SECTORS;
};

export const saveSectors = (sectors: WhatsAppSector[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(sectors));
  } catch (e) {
    console.error('Failed to save sectors', e);
  }
};

export const loadBioLinks = (): BioLinkItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LINKS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if essential default links are missing
        const parsedIds = new Set(parsed.map((p: any) => p.id));
        const parsedSectors = new Set(parsed.map((p: any) => p.sectorId));
        const missing = INITIAL_BIO_LINKS.filter(
          (def) => !parsedIds.has(def.id) && !parsedSectors.has(def.sectorId)
        );

        let combined = parsed;
        if (missing.length > 0) {
          combined = [...parsed, ...missing];
        }

        // Ensure that at least the default links are active if only 1 option was active
        const activeCount = combined.filter((l: any) => l.active).length;
        if (activeCount <= 1) {
          combined = combined.map((l: any) => {
            if (INITIAL_BIO_LINKS.some((def) => def.id === l.id || def.sectorId === l.sectorId)) {
              return { ...l, active: true };
            }
            return l;
          });
        }

        combined.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        return combined;
      }
    }
  } catch (e) {
    console.error('Failed to load bio links', e);
  }
  return INITIAL_BIO_LINKS;
};

export const saveBioLinks = (links: BioLinkItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save bio links', e);
  }
};

export const resetDefaultBioLinks = (): BioLinkItem[] => {
  try {
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(INITIAL_BIO_LINKS));
  } catch (e) {
    console.error('Failed to reset default bio links', e);
  }
  return INITIAL_BIO_LINKS;
};

export const getBioVisits = (): number => {
  try {
    return parseInt(localStorage.getItem('smartlink_bio_visits') || '0', 10);
  } catch {
    return 0;
  }
};

export const incrementBioVisits = (): number => {
  try {
    const current = getBioVisits();
    const next = current + 1;
    localStorage.setItem('smartlink_bio_visits', next.toString());
    return next;
  } catch {
    return 0;
  }
};

export const loadLeads = (): LeadRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LEADS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load leads', e);
  }
  return [];
};

export const saveLeads = (leads: LeadRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  } catch (e) {
    console.error('Failed to save leads', e);
  }
};

export const clearAllLeads = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
    localStorage.setItem('smartlink_bio_visits', '0');
  } catch (e) {
    console.error('Failed to clear leads', e);
  }
};

export const loadPixClicks = (): PixClickRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PIX_CLICKS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load pix clicks', e);
  }
  return [];
};

export const savePixClicks = (clicks: PixClickRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PIX_CLICKS, JSON.stringify(clicks));
  } catch (e) {
    console.error('Failed to save pix clicks', e);
  }
};

export const recordLocalPixClick = (record: PixClickRecord): PixClickRecord[] => {
  const current = loadPixClicks();
  const updated = [record, ...current];
  savePixClicks(updated);
  return updated;
};

export const clearPixClicks = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.PIX_CLICKS, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear pix clicks', e);
  }
};

export const loadLinkClicks = (): LinkClickRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LINK_CLICKS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load link clicks', e);
  }
  return [];
};

export const saveLinkClicks = (clicks: LinkClickRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LINK_CLICKS, JSON.stringify(clicks));
  } catch (e) {
    console.error('Failed to save link clicks', e);
  }
};

export const recordLocalLinkClick = (record: LinkClickRecord): LinkClickRecord[] => {
  const current = loadLinkClicks();
  const updated = [record, ...current];
  saveLinkClicks(updated);
  return updated;
};

export const clearLinkClicks = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.LINK_CLICKS, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear link clicks', e);
  }
};

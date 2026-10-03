import { CompanyConfig, WhatsAppSector, BioLinkItem, LeadRecord, PixClickRecord } from '../types';
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
};

export const loadCompanyConfig = (): CompanyConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      const parsed: CompanyConfig = JSON.parse(saved);
      // Migrate company name and Google Script URL
      let changed = false;
      if (!parsed.googleScriptUrl || parsed.googleScriptUrl.includes('AKfycbz_bio_endpoint')) {
        parsed.googleScriptUrl = INITIAL_COMPANY_CONFIG.googleScriptUrl;
        parsed.sheetsConnected = true;
        changed = true;
      }
      if (!parsed.name || parsed.name === 'Sua Empresa') {
        parsed.name = 'Nova ISP';
        changed = true;
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(parsed));
      }
      return parsed;
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
      const parsed: WhatsAppSector[] = JSON.parse(saved);
      let changed = false;
      const migrated = parsed.map((s) => {
        // Migrate commercial sector message to exact requested Nova ISP phrase
        if (s.id === 'comercial') {
          if (!s.initialMessage || !s.initialMessage.includes('Nova ISP')) {
            s.initialMessage = 'Olá! Vim pelas rede sociais da Nova ISP e gostaria de conhecer os planos disponíveis. 😁💜';
            changed = true;
          }
        }
        // Migrate old "outros" sector to "pix"
        if (s.id === 'outros' || s.name.toLowerCase().includes('outros')) {
          changed = true;
          return {
            id: 'pix',
            name: 'Pague com PIX',
            icon: 'qr_code_2',
            phone: s.phone || '5521999990004',
            initialMessage: 'Olá! Gostaria de receber a chave PIX ou QR Code para pagamento rápido.',
            isOnline: true,
            responseTime: 'Imediato',
            colorType: 'primary' as const,
          };
        }
        return s;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(migrated));
      }
      return migrated;
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
      const parsed: BioLinkItem[] = JSON.parse(saved);
      let changed = false;
      const migrated = parsed.map((item) => {
        // Ensure "Quero contratar" link has the exact requested Nova ISP phrase
        if (item.id === 'link-1' || item.sectorId === 'comercial') {
          if (!item.customMessage || !item.customMessage.includes('Nova ISP')) {
            item.customMessage = 'Olá! Vim pelas rede sociais da Nova ISP e gostaria de conhecer os planos disponíveis. 😁💜';
            changed = true;
          }
        }
        // Migrate PIX link to redirect to https://pix.novaisp.com.br/login
        if (item.title === 'Pague com PIX' || item.sectorId === 'pix' || item.id === 'link-4') {
          if (item.customUrl !== 'https://pix.novaisp.com.br/login') {
            item.customUrl = 'https://pix.novaisp.com.br/login';
            changed = true;
          }
        }
        // Migrate old "Outros assuntos" to "Pague com PIX"
        if (item.title === 'Outros assuntos' || item.sectorId === 'outros') {
          changed = true;
          return {
            ...item,
            title: 'Pague com PIX',
            subtitle: 'Chave, QR Code e confirmação imediata',
            sectorId: 'pix',
            responseTime: 'Imediato',
            badgeIcon: 'bolt',
            icon: 'qr_code_2',
            colorType: 'primary' as const,
            customUrl: 'https://pix.novaisp.com.br/login',
          };
        }
        return item;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(migrated));
      }
      return migrated;
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

const RESET_DATA_KEY = 'smartlink_reset_leads_zero_v1';

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
    // Force reset existing mock leads and visits to zero so fresh counting begins now
    if (!localStorage.getItem(RESET_DATA_KEY)) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
      localStorage.setItem('smartlink_bio_visits', '0');
      localStorage.setItem(RESET_DATA_KEY, 'true');
      return [];
    }

    const saved = localStorage.getItem(STORAGE_KEYS.LEADS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load leads', e);
  }
  return INITIAL_LEADS;
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

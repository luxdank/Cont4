export interface CompanyConfig {
  name: string;
  bioHeadline: string;
  bioSubtitle: string;
  logoUrl: string;
  verified: boolean;
  onlineStatus: boolean;
  onlineLabel: string;
  primaryColor: string;
  bioSlug: string;
  googleScriptUrl: string;
  sheetsConnected: boolean;
  detectedOrigin: string;
  securityNoticeText: string;
}

export interface WhatsAppSector {
  id: string;
  name: string;
  icon: string;
  phone: string;
  initialMessage: string;
  isOnline: boolean;
  responseTime: string;
  colorType: 'primary' | 'secondary' | 'tertiary' | 'neutral';
}

export interface BioLinkItem {
  id: string;
  title: string;
  subtitle: string;
  sectorId: string;
  responseTime: string;
  badgeIcon: string;
  icon: string;
  colorType: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  active: boolean;
  order: number;
  imageUrl?: string; // Direct image URL support
  customUrl?: string; // If direct link without lead form
  customMessage?: string; // Custom WhatsApp greeting phrase
}

export interface LeadRecord {
  id: string;
  timestamp: string;
  fullDate: string;
  name: string;
  phone: string;
  sector: string;
  sectorId: string;
  origin: string;
  status: 'redirected' | 'pending';
  initials: string;
  issue?: string;
  cep?: string;
}

export interface PixClickRecord {
  id: string;
  timestamp: string;
  fullDate: string;
  linkId: string;
  linkTitle: string;
  destinationUrl: string;
  origin?: string;
}

export type ActiveTab = 'links' | 'analytics' | 'contacts' | 'settings';
export type AppMode = 'bio' | 'admin';
export type BioStep = 'step1_select' | 'step2_lead';

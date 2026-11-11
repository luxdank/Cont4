export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Format a lead's date dynamically based on fullDate or timestamp
 * Displays: "Hoje, 14:30", "Ontem, 09:15", or "DD/MM/YYYY, HH:mm"
 */
export function formatLeadDateLabel(fullDate?: string, rawTimestamp?: string, leadId?: string): string {
  let targetDate: Date | null = null;

  if (fullDate) {
    const d = new Date(fullDate);
    if (!isNaN(d.getTime())) targetDate = d;
  }

  if (!targetDate && leadId && leadId.startsWith('lead-')) {
    const ts = parseInt(leadId.replace('lead-', ''), 10);
    if (!isNaN(ts) && ts > 100000000000) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) targetDate = d;
    }
  }

  if (!targetDate && rawTimestamp) {
    // If it contains a date like 15/10 or 2026-10-15
    const match = rawTimestamp.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = match[3]
        ? match[3].length === 2
          ? 2000 + parseInt(match[3], 10)
          : parseInt(match[3], 10)
        : new Date().getFullYear();
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) targetDate = d;
    }
  }

  // If we couldn't parse a date, return the original raw timestamp or fallback
  if (!targetDate) {
    return rawTimestamp || 'Data não informada';
  }

  // Extract time from date
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Check if today, yesterday or other date
  const now = new Date();
  const isToday =
    targetDate.getDate() === now.getDate() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    targetDate.getDate() === yesterday.getDate() &&
    targetDate.getMonth() === yesterday.getMonth() &&
    targetDate.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return `Hoje, ${timeStr}`;
  }
  if (isYesterday) {
    return `Ontem, ${timeStr}`;
  }

  const day = String(targetDate.getDate()).padStart(2, '0');
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const year = targetDate.getFullYear();

  return `${day}/${month}/${year}, ${timeStr}`;
}

export function cleanPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function buildWhatsAppLink(
  phoneNumber: string,
  userName: string,
  sectorName: string,
  origin: string,
  customInitialMsg?: string,
  issue?: string,
  cep?: string
): string {
  // Ensure digits and DDI
  let cleanNumber = cleanPhoneDigits(phoneNumber);
  if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
    cleanNumber = `55${cleanNumber}`;
  }

  // Determine user's custom phrase configured in the panel
  let mainPhrase = (customInitialMsg && customInitialMsg.trim())
    ? customInitialMsg.trim()
    : `Olá! Vim pelas rede sociais da Nova ISP e gostaria de conhecer os planos disponíveis. 😁💜`;

  // Support smart variable tags if configured in the phrase: {nome}, {cep}, {problema}, {setor}, {origem}
  if (
    /\{nome\}/i.test(mainPhrase) ||
    /\{cep\}/i.test(mainPhrase) ||
    /\{problema\}/i.test(mainPhrase) ||
    /\{setor\}/i.test(mainPhrase) ||
    /\{origem\}/i.test(mainPhrase)
  ) {
    mainPhrase = mainPhrase
      .replace(/\{nome\}/gi, userName || '')
      .replace(/\{cep\}/gi, cep || '')
      .replace(/\{problema\}/gi, issue || '')
      .replace(/\{setor\}/gi, sectorName || '')
      .replace(/\{origem\}/gi, origin || '');
  }

  const textEncoded = encodeURIComponent(mainPhrase);
  return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${textEncoded}`;
}

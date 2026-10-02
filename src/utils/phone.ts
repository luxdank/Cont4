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

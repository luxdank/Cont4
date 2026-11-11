import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { LeadRecord } from '../types';

// Workspace Google Sheets Scope
export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token cache (DO NOT store in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize Google Auth listener
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup and obtain access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter o token de acesso do Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação com Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sign out from Google Auth
 */
export const googleSignOut = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error('Erro ao desconectar Google:', error);
  }
};

/**
 * Format lead into spreadsheet row values
 */
export const formatLeadToRow = (lead: LeadRecord): (string | number)[] => {
  const stageLabels: Record<string, string> = {
    novo: 'Novo Lead',
    ass_enviada: '1. Ass. enviada',
    agenda: '2. Agenda',
    executado: '3. Executado',
    cancelado: '4. Cancelado',
  };

  return [
    lead.timestamp || new Date(lead.fullDate || Date.now()).toLocaleString('pt-BR'),
    lead.name || 'Sem nome',
    lead.phone || '',
    lead.cep || '-',
    lead.sector || 'Comercial',
    stageLabels[lead.funnelStage || 'novo'] || lead.funnelStage || 'Novo Lead',
    lead.scheduledDate || '-',
    lead.notes || '-',
    lead.origin || 'Bio WhatsApp',
    lead.status === 'redirected' ? 'Redirecionado' : 'Pendente',
  ];
};

export const SPREADSHEET_HEADERS = [
  'Data e Hora',
  'Nome do Cliente',
  'WhatsApp',
  'CEP',
  'Setor',
  'Etapa do Funil',
  'Data Agendada',
  'Anotações do Lead',
  'Origem',
  'Status',
];

/**
 * Create a new Google Spreadsheet in the user Google account
 */
export const createGoogleSpreadsheet = async (
  accessToken: string,
  title: string,
  initialLeads: LeadRecord[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  // 1. Create spreadsheet resource
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'SmartLink - Leads WhatsApp Nova ISP',
        locale: 'pt_BR',
        autoRecalc: 'ON_CHANGE',
      },
      sheets: [
        {
          properties: {
            title: 'Leads',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ao criar planilha (HTTP ${createRes.status})`
    );
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl =
    createdData.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Header & Initial Leads
  const rows = [
    SPREADSHEET_HEADERS,
    ...initialLeads.map(formatLeadToRow),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:J${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `Leads!A1:J${rows.length}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Append a single lead to an existing Google Spreadsheet
 */
export const appendLeadToGoogleSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  lead: LeadRecord
): Promise<void> => {
  const row = formatLeadToRow(lead);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:J:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao sincronizar lead na planilha.');
  }
};

/**
 * Full Sync of all leads to an existing Google Spreadsheet
 */
export const syncAllLeadsToGoogleSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  leads: LeadRecord[]
): Promise<void> => {
  const rows = [
    SPREADSHEET_HEADERS,
    ...leads.map(formatLeadToRow),
  ];

  // 1. Clear sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:J:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  ).catch(() => {});

  // 2. Write all rows
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:J${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `Leads!A1:J${rows.length}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao sincronizar dados na planilha.');
  }
};

/**
 * Export Leads to CSV file (UTF-8 with BOM for Excel & Sheets compatibility)
 */
export const exportLeadsToCSV = (leads: LeadRecord[], companyName: string = 'Nova ISP') => {
  const rows = [
    SPREADSHEET_HEADERS,
    ...leads.map((lead) => formatLeadToRow(lead)),
  ];

  const escapeCSV = (value: any) => {
    const str = String(value ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM
    rows.map((row) => row.map(escapeCSV).join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `leads_${companyName.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

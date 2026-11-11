import { cleanPhoneDigits } from './phone';

export interface EvolutionSendParams {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
  number: string;
  text: string;
}

export interface EvolutionTestResult {
  success: boolean;
  message: string;
}

/**
 * Format phone to international WhatsApp standard (e.g. 5521999999999 or 552127625350)
 */
export function formatToWhatsAppNumber(phone: string): string {
  let cleaned = cleanPhoneDigits(phone);
  if (cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

/**
 * Sends a text message through Evolution API v1 or v2
 */
export async function sendEvolutionTextMessage({
  serverUrl,
  apiKey,
  instanceName,
  number,
  text,
}: EvolutionSendParams): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!serverUrl || !apiKey || !instanceName || !number || !text) {
      return { success: false, error: 'Parâmetros incompletos da Evolution API.' };
    }

    const cleanBaseUrl = serverUrl.trim().replace(/\/+$/, '');
    const cleanInstance = instanceName.trim();
    const cleanKey = apiKey.trim();
    const formattedNumber = formatToWhatsAppNumber(number);

    // Evolution API v1/v2 endpoint
    const endpoint = `${cleanBaseUrl}/message/sendText/${cleanInstance}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cleanKey,
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: text,
        options: {
          delay: 1000,
          presence: 'composing',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Erro Evolution API HTTP ${response.status}: ${errText || response.statusText}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Tests connection with Evolution API instance
 */
export async function testEvolutionConnection({
  serverUrl,
  apiKey,
  instanceName,
}: {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
}): Promise<EvolutionTestResult> {
  try {
    if (!serverUrl || !apiKey || !instanceName) {
      return {
        success: false,
        message: 'Preencha a URL, Nome da Instância e API Key para testar.',
      };
    }

    const cleanBaseUrl = serverUrl.trim().replace(/\/+$/, '');
    const cleanInstance = instanceName.trim();
    const cleanKey = apiKey.trim();

    // Check instance state
    const endpoint = `${cleanBaseUrl}/instance/connectionState/${cleanInstance}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: cleanKey,
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state || 'open';
      if (state === 'open' || state === 'connected') {
        return {
          success: true,
          message: 'Instância conectada ao WhatsApp com sucesso (Status: Online)!',
        };
      }
      return {
        success: true,
        message: `Instância encontrada! Estado atual: ${state}`,
      };
    }

    // Fallback: check instances list
    const fallbackEndpoint = `${cleanBaseUrl}/instance/fetchInstances`;
    const fallbackRes = await fetch(fallbackEndpoint, {
      method: 'GET',
      headers: { apikey: cleanKey },
    });

    if (fallbackRes.ok) {
      return {
        success: true,
        message: 'API Key validada com sucesso no servidor Evolution API!',
      };
    }

    return {
      success: false,
      message: `Servidor respondeu com código ${response.status}. Verifique se a URL e a API Key estão corretas.`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Falha ao conectar: ${msg}. Verifique se o servidor Evolution API aceita requisições CORS ou HTTPS.`,
    };
  }
}

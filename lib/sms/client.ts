export class InfobipSmsError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InfobipSmsError";
    this.status = status;
  }
}

function infobipHeaders(apiKey: string) {
  return {
    Authorization: `App ${apiKey}`,
    Accept: "application/json",
  };
}

export function infobipDestination(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new InfobipSmsError("Numéro destinataire invalide.", 400);
  }
  return digits;
}

async function readInfobipError(res: Response) {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as {
      requestError?: {
        serviceException?: { text?: string; messageId?: string };
      };
      description?: string;
    };
    const service = data.requestError?.serviceException?.text;
    if (service) return service;
    if (data.description) return data.description;
  } catch {
    // Réponse non JSON : on garde le statut HTTP.
  }
  return `Infobip a répondu ${res.status}`;
}

/**
 * Une clé d'envoi n'a souvent pas le droit de lire le solde du compte.
 * On interroge l'API d'envoi avec un corps vide : 400 = clé acceptée, 401 = refus.
 */
export async function verifyInfobipAccount(input: {
  apiKey: string;
  baseUrl: string;
  scope?: "sms" | "whatsapp";
}) {
  const path =
    input.scope === "whatsapp"
      ? "/whatsapp/1/message/template"
      : "/sms/3/messages";
  const res = await fetch(`${input.baseUrl}${path}`, {
    method: "POST",
    headers: {
      ...infobipHeaders(input.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [] }),
  });
  if (res.ok || res.status === 400) {
    await res.text().catch(() => "");
    return;
  }
  throw new InfobipSmsError(await readInfobipError(res), res.status);
}

type InfobipSendResponse = {
  messages?: Array<{
    messageId?: string;
    status?: { groupName?: string; description?: string; name?: string };
  }>;
};

export async function sendInfobipSms(input: {
  apiKey: string;
  baseUrl: string;
  sender: string;
  to: string;
  text: string;
}) {
  const res = await fetch(`${input.baseUrl}/sms/3/messages`, {
    method: "POST",
    headers: {
      ...infobipHeaders(input.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          destinations: [{ to: infobipDestination(input.to) }],
          sender: input.sender,
          content: { text: input.text },
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new InfobipSmsError(await readInfobipError(res), res.status);
  }
  const data = (await res.json()) as InfobipSendResponse;
  const message = data.messages?.[0];
  const group = message?.status?.groupName?.toUpperCase();
  if (!message?.messageId || group === "REJECTED") {
    throw new InfobipSmsError(
      message?.status?.description ||
        "Infobip n'a pas accepté le message.",
      502,
    );
  }
  return { messageId: message.messageId };
}

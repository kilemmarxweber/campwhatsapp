import { randomUUID } from "crypto";
import {
  InfobipSmsError,
  infobipDestination,
} from "@/lib/sms/client";

export { verifyInfobipAccount } from "@/lib/sms/client";

type InfobipTemplateResponse = {
  messages?: Array<{
    messageId?: string;
    status?: { groupName?: string; description?: string };
  }>;
};

function headers(apiKey: string) {
  return {
    Authorization: `App ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function readError(res: Response) {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as {
      requestError?: { serviceException?: { text?: string } };
      description?: string;
    };
    return (
      data.requestError?.serviceException?.text ||
      data.description ||
      `Infobip a répondu ${res.status}`
    );
  } catch {
    return `Infobip a répondu ${res.status}`;
  }
}

/** Envoi d'un modèle WhatsApp Infobip : POST /whatsapp/1/message/template. */
export async function sendInfobipWhatsappTemplate(input: {
  apiKey: string;
  baseUrl: string;
  from: string;
  to: string;
  templateName: string;
  language: string;
  placeholders: string[];
}) {
  const messageId = randomUUID();
  const res = await fetch(
    `${input.baseUrl.replace(/\/$/, "")}/whatsapp/1/message/template`,
    {
      method: "POST",
      headers: headers(input.apiKey),
      body: JSON.stringify({
        messages: [
          {
            from: input.from,
            to: infobipDestination(input.to),
            messageId,
            content: {
              templateName: input.templateName,
              templateData: {
                body: { placeholders: input.placeholders },
              },
              language: input.language,
            },
          },
        ],
      }),
    },
  );
  if (!res.ok) {
    throw new InfobipSmsError(await readError(res), res.status);
  }
  const data = (await res.json()) as InfobipTemplateResponse;
  const message = data.messages?.[0];
  const group = message?.status?.groupName?.toUpperCase();
  if (group === "REJECTED") {
    const description = message?.status?.description || "";
    const detail = /invalid source/i.test(description)
      ? "Le numéro expéditeur n'est pas un numéro WhatsApp Infobip. Utilisez 447860088970, pas le numéro du destinataire."
      : description || "Infobip a refusé le modèle WhatsApp.";
    throw new InfobipSmsError(detail, 502);
  }
  return { messageId: message?.messageId || messageId };
}

export type InfobipTemplateRecord = {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
};

function asTemplateRecord(data: unknown): InfobipTemplateRecord {
  if (!data || typeof data !== "object") return {};
  const row = data as Record<string, unknown>;
  const status = row.status;
  const statusText =
    typeof status === "string"
      ? status
      : status && typeof status === "object" && "name" in status
        ? String((status as { name?: unknown }).name ?? "")
        : "";
  return {
    id: row.id == null ? undefined : String(row.id),
    name: typeof row.name === "string" ? row.name : undefined,
    language: typeof row.language === "string" ? row.language : undefined,
    status: statusText || undefined,
  };
}

export async function createInfobipWhatsappTemplate(input: {
  apiKey: string;
  baseUrl: string;
  sender: string;
  name: string;
  language: string;
  bodyText: string;
  examples: string[];
}) {
  const res = await fetch(
    `${input.baseUrl.replace(/\/$/, "")}/whatsapp/2/senders/${encodeURIComponent(input.sender)}/templates`,
    {
      method: "POST",
      headers: headers(input.apiKey),
      body: JSON.stringify({
        name: input.name,
        language: input.language,
        category: "MARKETING",
        structure: {
          body: input.examples.length
            ? { text: input.bodyText, examples: input.examples }
            : { text: input.bodyText },
          type: "TEXT",
        },
      }),
    },
  );
  if (!res.ok) {
    throw new InfobipSmsError(await readError(res), res.status);
  }
  return asTemplateRecord(await res.json());
}

export async function getInfobipWhatsappTemplate(input: {
  apiKey: string;
  baseUrl: string;
  sender: string;
  templateId: string;
}) {
  const res = await fetch(
    `${input.baseUrl.replace(/\/$/, "")}/whatsapp/2/senders/${encodeURIComponent(input.sender)}/templates/${encodeURIComponent(input.templateId)}`,
    { headers: headers(input.apiKey) },
  );
  if (!res.ok) {
    throw new InfobipSmsError(await readError(res), res.status);
  }
  return asTemplateRecord(await res.json());
}

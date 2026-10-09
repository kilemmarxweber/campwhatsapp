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

export function smsTemplateError(input: {
  channel: "whatsapp" | "sms";
  messageType: string;
  mediaId?: string | null;
}): string | null {
  if (input.channel !== "sms") return null;
  if (input.messageType !== "text" || input.mediaId) {
    return "Un modèle SMS accepte uniquement du texte et des liens, sans média";
  }
  return null;
}

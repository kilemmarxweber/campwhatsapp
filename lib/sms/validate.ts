import { normalizePhone } from "@/lib/phone";

const ACCOUNT_SID = /^AC[0-9a-f]{32}$/i;

export function assertTwilioAccountSid(value: string) {
  const sid = value.trim();
  if (!ACCOUNT_SID.test(sid)) {
    throw new Error(
      "Account SID invalide. Il commence par AC et se trouve dans la console Twilio.",
    );
  }
  return sid;
}

export function assertTwilioAuthToken(value: string) {
  const token = value.trim();
  if (token.length < 16 || /\s/.test(token)) {
    throw new Error("Auth Token Twilio invalide.");
  }
  return token;
}

/** Numéro expéditeur Twilio, au format international (+…). */
export function assertTwilioFromNumber(value: string) {
  const raw = value.trim();
  if (!raw.startsWith("+")) {
    throw new Error(
      "Le numéro expéditeur doit être au format international, par exemple +243…",
    );
  }
  const phone = normalizePhone(raw);
  if (!phone) {
    throw new Error("Numéro expéditeur invalide.");
  }
  return phone;
}

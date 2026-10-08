import assert from "node:assert/strict";
import test from "node:test";
import { composeSmsText } from "./compose-caption";
import { smsTemplateError } from "./channel-rules";

test("un modèle SMS avec média est refusé", () => {
  assert.match(
    smsTemplateError({
      channel: "sms",
      messageType: "text",
      mediaId: "media-1",
    }) ?? "",
    /sans média/,
  );
});

test("un modèle WhatsApp image reste accepté", () => {
  assert.equal(
    smsTemplateError({
      channel: "whatsapp",
      messageType: "image",
      mediaId: "media-1",
    }),
    null,
  );
});

test("le SMS conserve l'URL en texte brut", () => {
  const text = composeSmsText("Bonjour {{name}}", {
    link1Label: "Offre",
    link1Url: "https://example.com/offre",
  });
  assert.match(text, /https:\/\/example\.com\/offre/);
  assert.doesNotMatch(text, /media|image|vidéo/i);
});

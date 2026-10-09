import assert from "node:assert/strict";
import test from "node:test";
import {
  assertInfobipApiKey,
  assertInfobipBaseUrl,
  assertInfobipSender,
} from "./validate";

test("l'URL de base Infobip est normalisée", () => {
  assert.equal(
    assertInfobipBaseUrl("https://l2gerd.api.infobip.com/"),
    "https://l2gerd.api.infobip.com",
  );
});

test("une URL hors Infobip est refusée", () => {
  assert.throws(
    () => assertInfobipBaseUrl("https://api.twilio.com"),
    /api\.infobip\.com/,
  );
});

test("une clé API avec espace est refusée", () => {
  assert.throws(() => assertInfobipApiKey("clé avec espace"), /Clé API/);
});

test("le préfixe App de l'en-tête est retiré", () => {
  assert.equal(assertInfobipApiKey("App abcdefghijklmnop"), "abcdefghijklmnop");
});

test("l'expéditeur alphanumérique est accepté", () => {
  assert.equal(assertInfobipSender("ServiceSMS"), "ServiceSMS");
  assert.equal(assertInfobipSender("+243812345678"), "243812345678");
});

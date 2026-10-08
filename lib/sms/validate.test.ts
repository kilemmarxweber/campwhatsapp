import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTwilioAccountSid,
  assertTwilioAuthToken,
  assertTwilioFromNumber,
} from "./validate";

test("un Account SID Twilio est accepté", () => {
  assert.equal(
    assertTwilioAccountSid("AC" + "a".repeat(32)),
    "AC" + "a".repeat(32),
  );
});

test("un Account SID trop court est refusé", () => {
  assert.throws(() => assertTwilioAccountSid("AC123"), /Account SID/);
});

test("un Auth Token avec espace est refusé", () => {
  assert.throws(() => assertTwilioAuthToken("token avec espace"), /Auth Token/);
});

test("le numéro expéditeur doit être international", () => {
  assert.equal(assertTwilioFromNumber("+243812345678"), "+243812345678");
  assert.throws(() => assertTwilioFromNumber("0812345678"), /international/);
});

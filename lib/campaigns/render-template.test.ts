import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  toInfobipPlaceholders,
  valuesForPlaceholderKeys,
} from "./render-template";

describe("placeholders Infobip", () => {
  it("numérote name puis phone et réutilise le même numéro", () => {
    const result = toInfobipPlaceholders(
      "Bonjour {{name}},\n\nVotre numéro {{phone}} est lié à {{name}}.",
    );
    assert.equal(
      result.text,
      "Bonjour {{1}}, Votre numéro {{2}} est lié à {{1}}.",
    );
    assert.deepEqual(result.keys, ["name", "phone"]);
  });

  it("remplit les valeurs depuis le contact", () => {
    const values = valuesForPlaceholderKeys(["name", "phone"], {
      name: "kilem marx",
      phone: "+243844952966",
    });
    assert.deepEqual(values, ["kilem marx", "+243844952966"]);
  });
});

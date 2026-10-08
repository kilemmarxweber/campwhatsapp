import assert from "node:assert/strict";
import test from "node:test";
import { crossTenantJoinError } from "./tenant-access";

test("refuse une succursale sans organisation parente", () => {
  assert.equal(
    crossTenantJoinError({
      targetTenantId: null,
      alreadyMemberOfTarget: false,
      otherBranchTenantIds: [],
      directTenantIds: [],
    }),
    "Cette succursale n'est liée à aucune organisation.",
  );
});

test("autorise plusieurs succursales de la même organisation", () => {
  assert.equal(
    crossTenantJoinError({
      targetTenantId: "org-a",
      alreadyMemberOfTarget: false,
      otherBranchTenantIds: ["org-a"],
      directTenantIds: ["org-a"],
    }),
    null,
  );
});

test("refuse une appartenance croisée entre organisations", () => {
  assert.equal(
    crossTenantJoinError({
      targetTenantId: "org-b",
      alreadyMemberOfTarget: false,
      otherBranchTenantIds: ["org-a"],
      directTenantIds: [],
    }),
    "Cet utilisateur appartient déjà à une autre organisation.",
  );
});

test("refuse un second rattachement à la même succursale", () => {
  assert.match(
    crossTenantJoinError({
      targetTenantId: "org-a",
      alreadyMemberOfTarget: true,
      otherBranchTenantIds: [],
      directTenantIds: ["org-a"],
    }) ?? "",
    /déjà membre/,
  );
});

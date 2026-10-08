import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessBranch,
  canCreateBranchInTenant,
  canCreateOrganization,
  governanceLevel,
  mergeTenantRole,
  tenantRoleFromBranchRole,
  visibleTenantIds,
} from "./governance-rules";

test("le propriétaire voit toutes les organisations", () => {
  assert.equal(
    governanceLevel({
      appRole: "user",
      tenantRoles: ["owner"],
      branchRoles: [],
    }),
    "owner",
  );
  assert.deepEqual(
    visibleTenantIds({
      level: "owner",
      allTenantIds: ["org-a", "org-b"],
      ownTenantIds: ["org-a"],
    }),
    ["org-a", "org-b"],
  );
  assert.equal(canCreateOrganization("owner"), true);
});

test("l'administrateur ne voit que son organisation et peut y créer une succursale", () => {
  assert.equal(
    governanceLevel({
      appRole: "user",
      tenantRoles: ["admin"],
      branchRoles: ["admin"],
    }),
    "admin",
  );
  assert.deepEqual(
    visibleTenantIds({
      level: "admin",
      allTenantIds: ["org-a", "org-b"],
      ownTenantIds: ["org-a"],
    }),
    ["org-a"],
  );
  assert.equal(canCreateOrganization("admin"), false);
  assert.equal(
    canCreateBranchInTenant({
      level: "admin",
      tenantId: "org-a",
      ownTenantIds: ["org-a"],
    }),
    true,
  );
  assert.equal(
    canCreateBranchInTenant({
      level: "admin",
      tenantId: "org-b",
      ownTenantIds: ["org-a"],
    }),
    false,
  );
});

test("un membre simple n'a pas la page de gouvernance", () => {
  assert.equal(
    governanceLevel({
      appRole: "user",
      tenantRoles: ["member"],
      branchRoles: ["user"],
    }),
    null,
  );
  assert.equal(canCreateOrganization(null), false);
});

test("l'administrateur d'une organisation ouvre n'importe quelle succursale de celle-ci", () => {
  assert.equal(
    canAccessBranch({
      isPlatformOwner: false,
      tenantRole: "admin",
      hasBranchMembership: false,
    }),
    true,
  );
  assert.equal(
    canAccessBranch({
      isPlatformOwner: false,
      tenantRole: null,
      hasBranchMembership: false,
    }),
    false,
  );
  assert.equal(
    canAccessBranch({
      isPlatformOwner: true,
      tenantRole: null,
      hasBranchMembership: false,
    }),
    true,
  );
});

test("le rôle succursale se répercute sans abaisser un propriétaire", () => {
  assert.equal(tenantRoleFromBranchRole("admin"), "admin");
  assert.equal(tenantRoleFromBranchRole("owner"), "owner");
  assert.equal(mergeTenantRole("admin", "member"), "admin");
  assert.equal(mergeTenantRole("member", "admin"), "admin");
  assert.equal(mergeTenantRole("owner", "admin"), "owner");
});

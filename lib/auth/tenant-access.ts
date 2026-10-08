/** Règle pure : plusieurs succursales d'une même organisation sont autorisées. */
export function crossTenantJoinError(input: {
  targetTenantId: string | null;
  alreadyMemberOfTarget: boolean;
  otherBranchTenantIds: Array<string | null>;
  directTenantIds: string[];
}): string | null {
  if (!input.targetTenantId) {
    return "Cette succursale n'est liée à aucune organisation.";
  }
  if (input.alreadyMemberOfTarget) {
    return "Vous êtes déjà membre de cette organisation.";
  }
  const foreignBranch = input.otherBranchTenantIds.some(
    (tenantId) => tenantId !== input.targetTenantId,
  );
  const foreignTenant = input.directTenantIds.some(
    (tenantId) => tenantId !== input.targetTenantId,
  );
  if (foreignBranch || foreignTenant) {
    return "Cet utilisateur appartient déjà à une autre organisation.";
  }
  return null;
}

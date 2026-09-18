import { listGlobalRoles } from "@/lib/roles/actions";
import { RolesAdminClient } from "@/components/roles-admin-client";

export default async function AdminRolesPage() {
  const roles = await listGlobalRoles();
  return <RolesAdminClient roles={roles} />;
}

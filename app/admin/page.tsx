import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getTypes } from "@/lib/place-utils";
import { ADMIN_SESSION_COOKIE, parseAdminSessionToken } from "@/lib/server/admin-auth";
import { readPlaces } from "@/lib/server/places-repository";

export default async function AdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = parseAdminSessionToken(token);

  if (!session) {
    redirect("/admin/login");
  }

  const [places, placeTypes] = await Promise.all([readPlaces(), getTypes()]);

  return <AdminDashboard adminUsername={session.username} initialPlaces={places} placeTypes={placeTypes} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { ADMIN_SESSION_COOKIE, parseAdminSessionToken } from "@/lib/server/admin-auth";

export default function AdminLoginPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = parseAdminSessionToken(token);

  if (session) {
    redirect("/admin");
  }

  return (
    <section className="mx-auto mt-8 max-w-md rounded-3xl border border-slate-800/10 bg-white/95 p-5 shadow-panel sm:p-6">
      <h1 className="text-4xl font-semibold leading-tight text-rust">Вход администратора</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        После входа вы сможете добавлять и редактировать места, фотографии и источники.
      </p>
      <div className="mt-4">
        <AdminLoginForm />
      </div>
    </section>
  );
}

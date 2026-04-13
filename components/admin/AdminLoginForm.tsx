"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        setError("Неверный логин или пароль.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Не удалось выполнить вход. Попробуйте снова.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Логин</span>
        <input
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="min-h-11 w-full rounded-2xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Пароль</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 w-full rounded-2xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Входим..." : "Войти в админ-панель"}
      </button>
    </form>
  );
}

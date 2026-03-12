"use client";
import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setMeCache } from "@/lib/me";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let eNorm = email.trim().toLowerCase();
      if (!eNorm.includes("@")) {
        eNorm = `${eNorm}@bulog.co.id`;
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: eNorm, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Email atau password salah");
      }
      const payload = await res.json().catch(() => ({}));
      // Set cache immediately
      const meData = {
        authenticated: true,
        email: eNorm,
        role: payload?.role,
        regional: payload?.regional ?? null,
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("__me__", JSON.stringify(meData));
        (window as any).__me__ = meData;
      }
      
      const next = params.get("next") || "/";
      router.replace(next);
      // Force reload to ensure layout picks up the new role
      setTimeout(() => {
         window.location.href = next;
      }, 100);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#004A87] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white text-white shadow-2xl">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-black text-center">
            Welcome back
          </h1>
          <p className="text-sm text-black text-center mt-1">
            Login to your account
          </p>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 mt-6"
            suppressHydrationWarning
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-black">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-white px-3 py-2 text-sm text-black placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="m@example.com"
                required
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-black">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-white px-3 py-2 text-sm text-black placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                suppressHydrationWarning
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black text-white text-sm font-semibold px-3 py-2 hover:bg-slate-600 disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
            {error ? (
              <div className="text-xs text-red-400">{error}</div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#004A87]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

"use client";
import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

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
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4">
      {/* ── Deep navy background that won't clash with logos ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #0a1628 0%, #132240 30%, #1a3058 60%, #162544 100%)",
        }}
      />

      {/* ── Floating decorative orbs (very subtle) ── */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          top: "-200px",
          right: "-200px",
          animation: "float-slow 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)",
          bottom: "-150px",
          left: "-100px",
          animation: "float-slow 28s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute w-[250px] h-[250px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)",
          top: "50%",
          left: "10%",
          animation: "float-slow 18s ease-in-out infinite",
        }}
      />

      {/* ── Subtle dot pattern overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ── Main card ── */}
      <div
        className="relative z-10 w-full max-w-[420px]"
        style={{ animation: "fade-up 0.6s ease-out" }}
      >
        {/* ── White card with logos + form ── */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{
            boxShadow: "0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* ── Logo header area (white background) ── */}
          <div className="bg-white px-8 pt-8 pb-6">
            <div className="flex items-center justify-center gap-5">
              <img
                src="https://rzjlkpumrsjpafduhlgt.supabase.co/storage/v1/object/public/logo-img/logo-bulog/logo-ubi-full.png"
                alt="UBI Logo"
                className="h-11 w-auto object-contain"
              />
              <div className="w-px h-9 bg-slate-200" />
              <img
                src="https://rzjlkpumrsjpafduhlgt.supabase.co/storage/v1/object/public/logo-img/logo-bulog/logo-bulog.png"
                alt="Bulog Logo"
                className="h-11 w-auto object-contain"
              />
            </div>
            <div className="text-center mt-5">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Procurement System
              </h1>
              <p className="text-[13px] text-slate-400 mt-1">
                Masuk ke akun Anda untuk melanjutkan
              </p>
            </div>
          </div>

          {/* ── Divider accent ── */}
          <div
            className="h-[3px]"
            style={{
              background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 40%, #60a5fa 70%, #93c5fd 100%)",
            }}
          />

          {/* ── Form area (dark glassmorphism) ── */}
          <div
            className="px-8 py-7"
            style={{
              background:
                "linear-gradient(180deg, #1a2d4a 0%, #162240 100%)",
            }}
          >
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              suppressHydrationWarning
            >
              {/* Email field */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300 tracking-wide">
                  Email
                </label>
                <div
                  className={`relative rounded-xl border transition-all duration-300 ${
                    focused === "email"
                      ? "border-blue-400/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    className="w-full rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none"
                    placeholder="nama@bulog.co.id"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300 tracking-wide">
                  Password
                </label>
                <div
                  className={`relative rounded-xl border transition-all duration-300 ${
                    focused === "password"
                      ? "border-blue-400/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    className="w-full rounded-xl bg-white/[0.06] px-4 py-3 pr-11 text-sm text-white placeholder-white/25 focus:outline-none"
                    placeholder="••••••••"
                    required
                    autoComplete="off"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-400/20 px-3 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="text-xs text-red-300">{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full rounded-xl text-sm font-semibold px-4 py-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: loading
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 14px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
                suppressHydrationWarning
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      Masuk
                    </>
                  )}
                </span>
                {!loading && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                    }}
                  />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400/40 mt-6 tracking-wide">
          © {new Date().getFullYear()} Perum BULOG • Procurement System
        </p>
      </div>

      {/* ── Keyframe animations ── */}
      <style jsx>{`
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-25px) scale(1.03);
          }
        }
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen"
          style={{
            background:
              "linear-gradient(160deg, #0a1628 0%, #132240 30%, #1a3058 60%, #162544 100%)",
          }}
        />
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

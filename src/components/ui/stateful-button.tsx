"use client";
import React, { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";

type Variant = "submit" | "cancel";
type Props = {
  onClick: () => Promise<any> | any;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
};

export function StatefulButton({
  onClick,
  children,
  variant = "submit",
  className,
  disabled,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";
  const base =
    variant === "submit"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-gray-200";
  const successBg = variant === "submit" ? "bg-emerald-600" : "bg-rose-600";
  const successText = "text-white";
  const disabledCls = "disabled:opacity-50";

  async function handlePress() {
    if (disabled || isLoading) return;
    setStatus("loading");
    try {
      await Promise.resolve(onClick());
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1100);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1100);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={disabled || isLoading}
      className={`px-4 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${disabledCls} ${
        isSuccess || isError ? `${successBg} ${successText}` : base
      } ${className || ""}`}
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Processing...
        </>
      ) : isSuccess ? (
        <>
          {variant === "submit" ? <Check size={18} /> : <X size={18} />}
          {variant === "submit" ? "Berhasil" : "Dibatalkan"}
        </>
      ) : isError ? (
        <>
          <X size={18} />
          Gagal
        </>
      ) : (
        children
      )}
    </button>
  );
}

export const Button = StatefulButton;

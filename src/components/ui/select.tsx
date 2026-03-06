import React from "react";

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function SelectTrigger({
  className = "",
  ariaLabel,
  children,
}: {
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return <div className={className} aria-label={ariaLabel}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-xs text-slate-500">{placeholder}</span>;
}

export function SelectContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`relative ${className}`}>{children}</div>;
}

export function SelectItem({
  value,
  className = "",
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <div data-value={value} className={`px-3 py-2 text-xs ${className}`}>{children}</div>;
}

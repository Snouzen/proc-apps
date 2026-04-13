import React from "react";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`px-6 py-6 border-b border-gray-50 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-lg font-bold text-slate-800 ${className}`}>{children}</h3>;
}

export function CardDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm text-slate-500 ${className}`}>{children}</p>;
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`px-6 py-6 ${className}`}>{children}</div>;
}

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

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold text-slate-800">{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
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

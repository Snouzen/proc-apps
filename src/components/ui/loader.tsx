import React from "react";
import { Zap } from "lucide-react";

type Props = {
  label?: string;
  fullscreen?: boolean;
  className?: string;
};

export function LoaderThree({ label, fullscreen = false, className }: Props) {
  const container = fullscreen
    ? "fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    : "flex items-center justify-center";
  return (
    <div className={`${container} ${className || ""}`}>
      <div className="relative flex items-center justify-center w-32 h-32 rounded-3xl bg-neutral-900 shadow-inner">
        <svg className="absolute w-28 h-28" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="6"
            fill="none"
            className="stroke-neutral-700"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            className="stroke-amber-500 ldr-dash"
          />
        </svg>
        <div className="ldr-flicker text-amber-500">
          <Zap size={36} />
        </div>
        {label && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-neutral-400">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

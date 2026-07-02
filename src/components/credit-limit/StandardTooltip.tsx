"use client";

import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export function StandardTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  if (!content || content === "-") return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={5}
            className="z-[9999] px-3 py-1.5 bg-slate-800 dark:bg-slate-800 text-white dark:text-slate-100 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl border border-slate-700 dark:border-slate-700/50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            {content}
            <Tooltip.Arrow className="fill-slate-800 dark:fill-slate-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

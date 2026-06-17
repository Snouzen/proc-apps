import React from "react";
import { ChevronDown, X } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  disabled = false,
  className = "",
  align = "left",
  onClear,
}: {
  value: string | number;
  onChange: (val: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
  onClear?: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label || placeholder;

  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          disabled={disabled}
          className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 ${className} ${
            disabled
              ? "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:border-blue-400 shadow-sm"
          }`}
        >
          <span className="truncate">{selectedLabel}</span>
          <div className="flex items-center gap-1.5 ml-2">
            {onClear && value && !disabled && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onClear();
                  }
                }}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={14} />
              </div>
            )}
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      </Popover.Trigger>
      
      {!disabled && (
        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align={align === "left" ? "start" : align === "right" ? "end" : "center"}
            className="z-[9999] min-w-[200px] max-w-[300px] max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-xl animate-in fade-in zoom-in-95 duration-200"
          >
            {options.length > 0 ? (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium ${
                    String(opt.value) === String(value)
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                Tidak ada data
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}

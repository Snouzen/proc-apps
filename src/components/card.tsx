import { Info } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subValue: string;
  subLabel: string;
  icon: React.ReactNode;
  color: string;
  variant: "amber" | "blue" | "emerald" | "rose";
  onClick?: () => void;
  clickable?: boolean;
  tooltip?: string;
}

export default function StatCard({
  title,
  value,
  subValue,
  subLabel,
  icon,
  color,
  variant,
  onClick,
  clickable,
  tooltip,
}: StatCardProps) {
  const variants = {
    amber:
      "bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-100/50",
    blue: "bg-gradient-to-br from-blue-50/80 via-white to-white border-blue-100/50",
    emerald:
      "bg-gradient-to-br from-emerald-50/80 via-white to-white border-emerald-100/50",
    rose: "bg-gradient-to-br from-rose-50/80 via-white to-white border-rose-100/50",
  };

  const iconColors = {
    amber: "text-amber-600 bg-amber-100/50",
    blue: "text-blue-600 bg-blue-100/50",
    emerald: "text-emerald-600 bg-emerald-100/50",
    rose: "text-rose-600 bg-rose-100/50",
  };

  const subTextColors = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  };
  const isClickable = clickable ?? !!onClick;
  const className = `w-full text-left p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-md ${variants[variant]} ${
    isClickable
      ? "cursor-pointer hover:-translate-y-[1px] active:translate-y-0"
      : ""
  }`;

  const content = (
    <>
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 relative group/tooltip">
            <h3 className="text-sm font-bold text-slate-600 tracking-tight">
              {title}
            </h3>
            {tooltip && (
              <>
                <div className="cursor-help">
                  <Info size={14} className="text-slate-400 hover:text-slate-600 transition-colors" />
                </div>
                {/* Custom Premium Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 translate-y-2 pointer-events-none transition-all duration-200 z-[100]">
                  <p className="text-[11px] font-medium leading-relaxed text-slate-600">
                    {tooltip}
                  </p>
                  {/* Tooltip Arrow */}
                  <div className="absolute -bottom-1 left-3 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className={`p-2 rounded-xl ${iconColors[variant]}`}>{icon}</div>
      </div>

      <div className="mt-2">
        <p className="text-4xl font-bold text-slate-800 tracking-tighter leading-none">
          {value}
        </p>
        <p
          className={`text-xs font-bold mt-3 flex items-center gap-1 ${subTextColors[variant]}`}
        >
          {subValue}
        </p>
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

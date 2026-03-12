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
        <h3 className="text-sm font-bold text-slate-600 tracking-tight">
          {title}
        </h3>
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

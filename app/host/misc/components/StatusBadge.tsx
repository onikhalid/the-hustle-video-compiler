import React from "react";

export type StatusTone = "default" | "success" | "danger" | "warning" | "accent";

export type StatusBadgeProps = {
  label: string;
  value?: string;
  tone?: StatusTone;
  className?: string;
};

const toneStyles: Record<StatusTone, string> = {
  default: "bg-white/10 text-white",
  success: "bg-emerald-500/10 text-emerald-300",
  danger: "bg-rose-500/10 text-rose-300",
  warning: "bg-amber-500/10 text-amber-200",
  accent: "bg-indigo-500/10 text-indigo-200",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, value, tone = "default", className }) => (
  <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[0.6rem] md:text-xs font-semibold ${toneStyles[tone]} ${className ?? ""}`}>
    <span className="uppercase tracking-wide text-white/60">{label}</span>
    {value && <span>{value}</span>}
  </div>
);

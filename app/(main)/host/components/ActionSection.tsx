import React from "react";

export type ActionConfig = {
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "accent" | "danger" | "neutral";
};

type ActionSectionProps = {
  title: string;
  hint?: string;
  actions: ActionConfig[];
};

const toneMap: Record<NonNullable<ActionConfig["tone"]>, string> = {
  primary:
    "bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-400 hover:to-blue-400",
  accent:
    "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-500 text-white hover:from-rose-500 hover:to-red-400",
  neutral:
    "bg-white/10 text-white hover:bg-white/20",
};

const ActionButton: React.FC<ActionConfig> = ({
  label,
  description,
  onClick,
  disabled,
  tone = "primary",
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full rounded-2xl px-4 py-3 text-left transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 ${toneMap[tone]}`}
  >
    <div className="flex flex-col">
      <span className="text-sm font-semibold">{label}</span>
      {description && (
        <span className="mt-1 text-xs text-white/80">{description}</span>
      )}
    </div>
  </button>
);

export const ActionSection: React.FC<ActionSectionProps> = ({ title, hint, actions }) => (
  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_45px_-24px_rgba(15,0,38,0.6)]">
    <div className="mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{title}</h3>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
    <div className="flex flex-col gap-2">
      {actions.map((action) => (
        <ActionButton key={action.label} {...action} />
      ))}
    </div>
  </div>
);

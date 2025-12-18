import React from "react";

export type DataPoint = {
  label: string;
  value?: string;
};

export const DataGrid: React.FC<{ points: DataPoint[] }> = ({ points }) => (
  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {points.map((point) => (
      <div
        key={point.label}
        className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
      >
        <dt className="text-xs uppercase tracking-[0.2em] text-white/50">
          {point.label}
        </dt>
        <dd className="mt-2 text-sm font-semibold text-white/90">
          {point.value || "—"}
        </dd>
      </div>
    ))}
  </dl>
);

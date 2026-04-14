"use client";

import type { SafetyIndices, StatusResult } from "@/types";
import { INDEX_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AnalyticsPanelProps {
  indices: SafetyIndices | null;
  status:  StatusResult;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  stable:   { bg: "bg-emerald-950/30", border: "border-[var(--safe)]",    text: "text-[var(--safe)]"   },
  elevated: { bg: "bg-yellow-950/20",  border: "border-[var(--warn)]",    text: "text-[var(--warn)]"   },
  warning:  { bg: "bg-orange-950/30",  border: "border-orange-400",       text: "text-orange-400"      },
  danger:   { bg: "bg-red-950/30",     border: "border-[var(--danger)]",  text: "text-[var(--danger)]" },
};

export default function AnalyticsPanel({ indices, status }: AnalyticsPanelProps) {
  const styles = STATUS_STYLES[status.level] ?? STATUS_STYLES.stable;

  return (
    <div className="glass p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xs tracking-[0.25em] text-[var(--accent)] font-bold">
          SAFETY ANALYTICS
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/20 tracking-widest">DGMS INDIA</span>
          <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
        </div>
      </div>

      {/* Index rows */}
      <div className="space-y-5">
        {INDEX_META.map(({ id, label, sublabel, color, description }) => {
          const val = indices?.[id] ?? 0;
          // For GSI/VEI higher is better; for MRI/FRI lower is better
          const isHighGood  = id === "gsi" || id === "vei";
          const barVal      = isHighGood ? val : val;
          const barColor    = (() => {
            if (id === "gsi" || id === "vei") {
              if (val > 60) return color;
              if (val > 30) return "var(--warn)";
              return "var(--danger)";
            } else {
              if (val < 40) return "var(--safe)";
              if (val < 70) return "var(--warn)";
              return "var(--danger)";
            }
          })();

          return (
            <div key={id} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-display font-bold tracking-widest"
                    style={{ color }}
                  >
                    {sublabel}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{label}</span>
                </div>
                <span
                  className="font-display text-sm font-bold tabular-nums"
                  style={{ color: barColor }}
                >
                  {val}%
                </span>
              </div>

              {/* Progress track */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width:      `${barVal}%`,
                    background: barColor,
                    boxShadow:  `0 0 8px ${barColor}`,
                  }}
                />
                {/* Shimmer */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s infinite linear",
                  }}
                />
              </div>

              {/* Tooltip on hover */}
              <p className="text-[9px] font-mono text-white/20 mt-1 group-hover:text-white/40 transition-colors">
                {description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status banner */}
      <div
        className={cn(
          "mt-6 px-4 py-3 rounded-lg border text-center",
          styles.bg,
          styles.border,
          styles.text,
          status.level === "danger" && "border-danger-pulse"
        )}
      >
        <span className="font-display text-xs font-bold tracking-[0.2em]">
          {status.message}
        </span>
      </div>
    </div>
  );
}

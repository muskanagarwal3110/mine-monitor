"use client";

import type { StatusResult, BleConnection } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  status:     StatusResult;
  connection: BleConnection;
}

const LEVEL_STYLES = {
  stable:   "bg-emerald-950/60 border-[var(--safe)]/40    text-[var(--safe)]",
  elevated: "bg-yellow-950/40  border-[var(--warn)]/40    text-[var(--warn)]",
  warning:  "bg-orange-950/50  border-orange-400/50       text-orange-400",
  danger:   "bg-red-950/60     border-[var(--danger)]/60  text-[var(--danger)] border-danger-pulse",
};

export default function StatusBar({ status, connection }: StatusBarProps) {
  const isConnected = connection.state === "connected";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-xl border",
        "transition-all duration-500",
        isConnected
          ? LEVEL_STYLES[status.level]
          : "bg-white/[0.02] border-white/10 text-white/20"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span
          className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            isConnected
              ? status.level === "danger"
                ? "bg-[var(--danger)] animate-ping"
                : status.level === "stable"
                ? "bg-[var(--safe)] animate-pulse"
                : "bg-[var(--warn)] animate-pulse"
              : "bg-white/20"
          )}
        />
        <span className="font-display text-xs font-bold tracking-[0.2em]">
          {isConnected ? status.message : "AWAITING CONNECTION"}
        </span>
      </div>

      {/* Right side: connection info */}
      <div className="flex items-center gap-4 text-[9px] font-mono opacity-70 tracking-widest">
        {isConnected && connection.deviceName && (
          <span>▸ {connection.deviceName}</span>
        )}
        <span
          className={cn(
            "px-2 py-0.5 rounded border text-[8px]",
            isConnected
              ? "border-current/30 text-current"
              : "border-white/10 text-white/20"
          )}
        >
          {connection.state.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

"use client";

import type { BleConnection } from "@/types";
//import BluetoothButton from "@/components/bluetooth/BluetoothButton";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const BluetoothButton = dynamic(
  () => import("../bluetooth/BluetoothButton"),
  { ssr: false }
);

interface HeaderProps {
  connection:    BleConnection;
  sirenActive:   boolean;
  recordCount:   number;
  onConnect:     () => void;
  onDisconnect:  () => void;
  onToggleSiren: () => void;
  onClear:       () => void;
  isSupported:   boolean;
}

export default function Header({
  connection,
  sirenActive,
  recordCount,
  onConnect,
  onDisconnect,
  onToggleSiren,
  onClear,
  isSupported,
}: HeaderProps) {
  const isConnected = connection.state === "connected";

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
      {/* Logo / Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {/* Animated mine shaft icon */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-md opacity-20"
              style={{ background: "var(--accent)", animation: "pulse 2s infinite" }}
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 relative z-10"
              stroke="var(--accent)"
              strokeWidth="1.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className="font-display text-xl sm:text-2xl font-black tracking-[0.08em]">
            <span style={{ color: "var(--accent)", textShadow: "0 0 14px var(--accent-glow)" }}>
              ENV
            </span>{" "}
            <span className="text-white">MONITOR</span>
          </h1>

          {/* Live indicator */}
          {isConnected && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-[var(--safe)]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--safe)] animate-pulse" />
              <span className="text-[9px] font-mono text-[var(--safe)] tracking-widest">LIVE</span>
            </span>
          )}
        </div>

        {/* Sub-line */}
        <div className="flex items-center gap-3 pl-11">
          <span className="text-[10px] font-mono text-white/25 tracking-widest">
            FIRE RISK INDEX APPARATUS
          </span>
          {recordCount > 0 && (
            <span className="text-[10px] font-mono text-white/20">
              ▸ {recordCount.toLocaleString()} READINGS
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Clear button */}
        {recordCount > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-2 rounded-lg border border-white/10 text-white/30 hover:text-white/60
                       hover:border-white/25 text-[10px] font-mono tracking-widest transition-all"
          >
            CLEAR
          </button>
        )}

        {/* Siren toggle */}
        <button
          onClick={onToggleSiren}
          className={cn(
            "relative px-4 py-2 rounded-lg border text-[10px] font-display tracking-widest font-bold",
            "transition-all duration-300 overflow-hidden",
            sirenActive
              ? "bg-[var(--danger)] border-[var(--danger)] text-white animate-pulse-danger shadow-[0_0_20px_var(--danger-glow)]"
              : "border-[var(--danger)]/50 text-[var(--danger)]/60 hover:border-[var(--danger)] hover:text-[var(--danger)] hover:bg-red-950/20"
          )}
        >
          {sirenActive ? "🚨 SIREN: ACTIVE" : "SIREN: OFF"}
        </button>

        {/* BT Connect */}
        <BluetoothButton
          connection={connection}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          isSupported={isSupported}
        />
      </div>
    </header>
  );
}

"use client";

import type { GasSensor } from "@/types";
import { cn, formatPPM } from "@/lib/utils";
import { ppmColor } from "@/lib/analytics";

interface GasCardProps {
  sensor:       GasSensor;
  ppm:          number;
  isSelected:   boolean;
  onClick:      () => void;
}

export default function GasCard({
  sensor,
  ppm,
  isSelected,
  onClick,
}: GasCardProps) {
  const valueColor = ppmColor(ppm, sensor.alarmPPM);
  const ratio      = Math.min(1, ppm / sensor.alarmPPM);
  const isDanger   = ratio >= 1;
  const isWarn     = ratio >= 0.5 && !isDanger;

  return (
    <button
      onClick={onClick}
      className={cn(
        "glass flex flex-col items-center overflow-hidden w-full text-left",
        "transition-all duration-300 cursor-pointer group",
        "hover:-translate-y-1",
        isSelected
          ? "border-[var(--accent)] shadow-[0_0_22px_var(--accent-glow)] -translate-y-1"
          : "hover:border-white/20",
        isDanger && "border-danger-pulse"
      )}
    >
      {/* Card header */}
      <div
        className={cn(
          "w-full px-4 py-3 border-b border-white/5 transition-colors duration-300",
          isSelected
            ? "bg-cyan-950/40"
            : "bg-black/30 group-hover:bg-white/5"
        )}
      >
        <p
          className="font-display text-s tracking-[0.18em] font-bold"
          style={{ color: sensor.color }}
        >
          {sensor.desc}
        </p>
        {/* <p className="text-[10px] text-[var(--text-sub)] font-mono mt-0.5">
          {sensor.id}
        </p> */}
      </div>

      {/* Value */}
      <div className="px-4 py-5 text-center w-full">
        <div
          className="font-display text-3xl font-bold transition-colors duration-300"
          style={{
            color:      valueColor,
            textShadow: `0 0 16px ${valueColor}66`,
          }}
        >
          {formatPPM(ppm)}
        </div>
        <div className="text-[10px] text-[var(--text-sub)] font-mono mt-1 tracking-widest">
          {sensor.unit}
        </div>

        {/* Mini threshold bar */}
        <div className="mt-3 w-full bg-white/5 rounded-full h-1 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${ratio * 100}%`,
              background: valueColor,
              boxShadow:  `0 0 6px ${valueColor}`,
            }}
          />
        </div>
        <div
          className={cn(
            "text-[12px] font-mono mt-1 tracking-wider",
            isDanger ? "text-[var(--danger)]" : isWarn ? "text-[var(--warn)]" : "text-white/20"
          )}
        >
          {isDanger ? "⚠ ALARM THRESHOLD" : isWarn ? "CAUTION" : `ALARM: ${sensor.alarmPPM} PPM`}
        </div>
      </div>
    </button>
  );
}

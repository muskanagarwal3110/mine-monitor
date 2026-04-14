"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SensorPayload } from "@/types";
import { GAS_SENSORS } from "@/lib/constants";

// ─── useDemoMode ──────────────────────────────────────────────────────────────
// Simulates realistic mine sensor data for UI testing without hardware.
// Oscillates values around a baseline with occasional spike events.
// Call startDemo() to begin, stopDemo() to halt.
// ─────────────────────────────────────────────────────────────────────────────
export function useDemoMode(onData: (payload: SensorPayload) => void) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef     = useRef(0);

  // Smooth noise generator
  const noise = (base: number, amp: number, phase: number, t: number) =>
    Math.max(0, base + amp * Math.sin(t * 0.07 + phase) + (Math.random() - 0.5) * amp * 0.3);

  const generate = useCallback((): SensorPayload => {
    const t      = tickRef.current;
    const spikes = t % 80 > 70; // occasional spike every ~80 ticks

    return {
      t:     parseFloat((27 + 2 * Math.sin(t * 0.03) + Math.random() * 0.5).toFixed(1)),
      h:     parseFloat((58 + 5 * Math.cos(t * 0.04) + Math.random() * 2).toFixed(1)),
      // MQ-2: HC combustibles — baseline ~0, spike to ~120 PPM
      mq2:   Math.round(noise(spikes ? 90 : 10, spikes ? 40 : 10, 0.0, t)),
      // MQ-4: Methane — normally quiet, occasional build-up
      mq4:   Math.round(noise(spikes ? 180 : 5,  spikes ? 60 : 5,  1.2, t)),
      // MQ-7: CO — always some background, spikes high
      mq7:   Math.round(noise(spikes ? 45 : 8,   spikes ? 20 : 5,  2.4, t)),
      // MQ-135: SOx/Air quality — moderate background
      mq135: Math.round(noise(spikes ? 60 : 12,  spikes ? 25 : 8,  3.6, t)),
    };
  }, []);

  const startDemo = useCallback(() => {
    if (intervalRef.current) return;
    tickRef.current = 0;
    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      onData(generate());
    }, 1000);
  }, [onData, generate]);

  const stopDemo = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopDemo(), [stopDemo]);

  return { startDemo, stopDemo };
}

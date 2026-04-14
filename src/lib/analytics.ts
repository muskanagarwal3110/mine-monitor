import type { SensorPayload, SafetyIndices, StatusResult } from "@/types";
import { GAS_SENSORS } from "@/lib/constants";

// ─── Compute Safety Indices ───────────────────────────────────────────────────
// All indices are 0–100.
// GSI / VEI: higher = better (100 = completely safe)
// MRI / FRI: higher = worse  (100 = at statutory alarm threshold)
export function computeIndices(data: SensorPayload): SafetyIndices {
  const sensors = GAS_SENSORS;

  const ppm = {
    mq2:   Math.max(0, data.mq2),
    mq4:   Math.max(0, data.mq4),
    mq7:   Math.max(0, data.mq7),
    mq135: Math.max(0, data.mq135),
  };

  // Excess ratio: 0 = clean, 100 = at or above alarm threshold
  const exc = (val: number, alarm: number) =>
    Math.min(100, Math.round((val / alarm) * 100));

  const excHC  = exc(ppm.mq2,   sensors[0].alarmPPM);
  const excCH4 = exc(ppm.mq4,   sensors[1].alarmPPM);
  const excCO  = exc(ppm.mq7,   sensors[2].alarmPPM);
  const excSOx = exc(ppm.mq135, sensors[3].alarmPPM);

  // GSI: 100 = all safe, 0 = worst sensor at alarm
  const worstExcess = Math.max(excHC, excCH4, excCO, excSOx);
  const gsi = Math.max(0, 100 - worstExcess);

  // VEI: CO + SOx are primary ventilation quality markers
  const vei = Math.max(0, 100 - Math.round((excCO + excSOx) / 2));

  // MRI: direct methane ratio
  const mri = excCH4;

  // FRI: combustibles + CO (both spike during fire/blasting events)
  const fri = Math.min(100, Math.round((excHC + excCO) / 2));

  return { gsi, vei, mri, fri };
}

// ─── Derive Status Result ─────────────────────────────────────────────────────
export function computeStatus(data: SensorPayload): StatusResult {
  const sensors = GAS_SENSORS;
  const co  = data.mq7;
  const hc  = data.mq2;
  const ch4 = data.mq4;
  const sox = data.mq135;

  const alarmCO  = sensors[2].alarmPPM;
  const alarmHC  = sensors[0].alarmPPM;
  const alarmCH4 = sensors[1].alarmPPM;
  const alarmSOx = sensors[3].alarmPPM;

  if (co >= alarmCO && hc >= alarmHC) {
    return { level: "danger",  message: "SMOKE / FIRE DETECTED" };
  }
  if (ch4 >= alarmCH4) {
    return { level: "danger",  message: "METHANE ACCUMULATION" };
  }
  if (co >= alarmCO) {
    return { level: "danger",  message: "HIGH CO — POOR VENTILATION" };
  }
  if (hc >= alarmHC / 2 && ch4 >= alarmCH4 / 2) {
    return { level: "warning", message: "BLASTING FUMES DETECTED" };
  }
  if (co >= alarmCO / 2 && sox >= alarmSOx / 2) {
    return { level: "warning", message: "VEHICLE EXHAUST PRESENT" };
  }
  if (Math.max(co / alarmCO, hc / alarmHC, ch4 / alarmCH4, sox / alarmSOx) > 0.3) {
    return { level: "elevated", message: "ELEVATED — MONITOR CLOSELY" };
  }
  return { level: "stable", message: "STABLE / NORMAL" };
}

// ─── PPM Colour Helper ────────────────────────────────────────────────────────
export function ppmColor(ppm: number, alarmPPM: number): string {
  const ratio = ppm / alarmPPM;
  if (ratio >= 1.0)  return "#ff2a2a";  // danger
  if (ratio >= 0.5)  return "#ffca28";  // warn
  return "#00e676";                      // safe
}

// ─── Clamp Helper ─────────────────────────────────────────────────────────────
export function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

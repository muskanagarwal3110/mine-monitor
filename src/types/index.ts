// ─── Sensor Raw Payload (received from ESP32 over Bluetooth) ─────────────────
export interface SensorPayload {
  t:     number;   // Temperature °C
  h:     number;   // Humidity %
  mq2:   number;   // MQ-2  PPM (Combustible/HC)
  mq4:   number;   // MQ-4  PPM (Methane CH₄)
  mq7:   number;   // MQ-7  PPM (Carbon Monoxide)
  mq135: number;   // MQ-135 PPM (SOx / Air Quality)
}

// ─── Gas Sensor Metadata ─────────────────────────────────────────────────────
export interface GasSensor {
  id:        string;   // e.g. "MQ2"
  jsonKey:   keyof Pick<SensorPayload, "mq2" | "mq4" | "mq7" | "mq135">;
  desc:      string;   // e.g. "COMBUSTIBLE"
  color:     string;   // chart/display colour hex
  alarmPPM:  number;   // statutory alarm threshold (DGMS India)
  maxPPM:    number;   // realistic max for this sensor in mine env.
  unit:      string;   // display unit label
}

// ─── Safety Indices ───────────────────────────────────────────────────────────
export interface SafetyIndices {
  gsi: number;   // Gas Stability Index       (0–100, higher = safer)
  vei: number;   // Ventilation Effectiveness  (0–100, higher = better)
  mri: number;   // Methane Risk Index         (0–100, higher = riskier)
  fri: number;   // Fire Risk Index            (0–100, higher = riskier)
}

// ─── Status Levels ────────────────────────────────────────────────────────────
export type StatusLevel = "stable" | "elevated" | "warning" | "danger";

export interface StatusResult {
  level:   StatusLevel;
  message: string;
}

// ─── Bluetooth Connection State ───────────────────────────────────────────────
export type BleState =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface BleConnection {
  state:       BleState;
  deviceName?: string;
  error?:      string;
}

// ─── History Buffer ───────────────────────────────────────────────────────────
export const HISTORY_LEN = 40;

export interface SensorHistory {
  mq2:   number[];
  mq4:   number[];
  mq7:   number[];
  mq135: number[];
  timestamps: string[];
}

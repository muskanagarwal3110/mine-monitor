import type { GasSensor } from "@/types";

// ─── Sensor Configuration ─────────────────────────────────────────────────────
// alarmPPM: DGMS India statutory limits for underground coal mines
// maxPPM:   calibrated to your real-world measurement range from report
export const GAS_SENSORS: GasSensor[] = [
  {
    id:       "MQ2",
    jsonKey:  "mq2",
    desc:     "COMBUSTIBLE",
    color:    "#ffb74d",
    alarmPPM: 100,    // 10% LEL for LPG/Propane in air
    maxPPM:   500,
    unit:     "PPM",
  },
  {
    id:       "MQ4",
    jsonKey:  "mq4",
    desc:     "METHANE",
    color:    "#4dd0e1",
    alarmPPM: 250,    // DGMS early warning: 0.25% vol CH₄
    maxPPM:   500,
    unit:     "PPM",
  },
  {
    id:       "MQ7",
    jsonKey:  "mq7",
    desc:     "CO GAS",
    color:    "#ce93d8",
    alarmPPM: 50,     // DGMS statutory CO limit in mines
    maxPPM:   5000,
    unit:     "PPM",
  },
  {
    id:       "MQ135",
    jsonKey:  "mq135",
    desc:     "SOx / AIR",
    color:    "#ef9a9a",
    alarmPPM: 50,     // DGMS SO₂ limit in mines
    maxPPM:   200,
    unit:     "PPM",
  },
];

// ─── BLE Protocol Config ──────────────────────────────────────────────────────
// These UUIDs must match what you program into the ESP32's BLE server.
// You can regenerate with: https://www.uuidgenerator.net/
export const BLE_CONFIG = {
  // Primary service UUID — set this in your ESP32 sketch
  SERVICE_UUID:     "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  // Characteristic the ESP32 writes JSON payloads to (NOTIFY property)
  CHAR_UUID_NOTIFY: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  // Optional: writable characteristic for sending commands back (siren on/off)
  CHAR_UUID_WRITE:  "beb5483e-36e1-4688-b7f5-ea07361b26a9",
} as const;

// ─── Index Metadata ───────────────────────────────────────────────────────────
export const INDEX_META = [
  { id: "gsi" as const, label: "GAS STABILITY",   sublabel: "GSI", color: "#07FFEB",
    description: "Overall atmospheric stability. Higher = safer environment." },
  { id: "vei" as const, label: "VENTILATION EFF.", sublabel: "VEI", color: "#7986cb",
    description: "Effectiveness of current ventilation at clearing toxic gases." },
  { id: "mri" as const, label: "METHANE RISK",    sublabel: "MRI", color: "#00e676",
    description: "Direct methane hazard level relative to DGMS alarm threshold." },
  { id: "fri" as const, label: "FIRE RISK",       sublabel: "FRI", color: "#ffca28",
    description: "Combined combustible + CO risk indicator. High = fire/blast hazard." },
] as const;

# Mine Monitor — Fire Risk Index Apparatus
### Real-time Bluetooth gas monitoring dashboard built with Next.js 14

---

## 📁 Project Structure

```
mine-monitor/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with fonts
│   │   ├── page.tsx            # Entry point
│   │   └── globals.css         # Global styles + CSS variables
│   │
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces
│   │
│   ├── lib/
│   │   ├── constants.ts        # Sensor config, BLE UUIDs, alarm thresholds
│   │   ├── analytics.ts        # GSI / VEI / MRI / FRI index calculations
│   │   └── utils.ts            # cn(), formatPPM(), formatTime()
│   │
│   ├── hooks/
│   │   ├── useBluetooth.ts     # Web Bluetooth API lifecycle management
│   │   ├── useSensorStore.ts   # Live data state + history buffer
│   │   └── useDemoMode.ts      # Simulated data for testing without hardware
│   │
│   └── components/
│       ├── bluetooth/
│       │   ├── BluetoothButton.tsx   # Connect/disconnect button with states
│       │   └── ConnectionHelp.tsx    # Setup guide shown before first connect
│       │
│       ├── dashboard/
│       │   ├── Dashboard.tsx         # Main orchestrator (all state lives here)
│       │   ├── Header.tsx            # Title + siren + BT + controls
│       │   ├── StatusBar.tsx         # Current system status strip
│       │   ├── EnvCards.tsx          # Temperature + Humidity cards
│       │   └── GasCard.tsx           # Individual sensor card (clickable)
│       │
│       ├── charts/
│       │   └── TelemetryChart.tsx    # Chart.js live line chart with alarm line
│       │
│       └── analytics/
│           └── AnalyticsPanel.tsx    # GSI/VEI/MRI/FRI index bars + status
│
└── esp32_ble_server/
    └── esp32_ble_server.ino    # Arduino sketch for the ESP32
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd mine-monitor
npm install
```

### 2. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in **Chrome or Edge** (Firefox/Safari don't support Web Bluetooth).

### 3. Flash the ESP32
1. Open `esp32_ble_server/esp32_ble_server.ino` in Arduino IDE
2. Install required libraries via Library Manager:
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - ESP32 BLE Arduino (included with the esp32 board package)
3. Select your ESP32 board and port, then Upload

---

## 🔵 Bluetooth Setup

### How it works
The ESP32 runs a BLE GATT server with two characteristics:

| Characteristic | UUID | Direction | Purpose |
|---|---|---|---|
| `CHAR_UUID_NOTIFY` | `beb5483e-...26a8` | ESP32 → Browser | Streams sensor JSON at 1Hz |
| `CHAR_UUID_WRITE`  | `beb5483e-...26a9` | Browser → ESP32 | Sends commands (`SIREN_ON`, `SIREN_OFF`) |

### JSON payload format
The ESP32 sends one JSON line per second, terminated with `\n`:
```json
{"t":27.3,"h":58,"mq2":12,"mq4":0,"mq7":8,"mq135":4}
```

| Key | Type | Description |
|---|---|---|
| `t` | float | Temperature in °C |
| `h` | float | Relative Humidity % |
| `mq2` | int | MQ-2 reading in PPM (combustible/HC) |
| `mq4` | int | MQ-4 reading in PPM (Methane CH₄) |
| `mq7` | int | MQ-7 reading in PPM (Carbon Monoxide) |
| `mq135` | int | MQ-135 reading in PPM (SOx / air quality) |

### Connecting from the browser
1. Click **CONNECT BLUETOOTH** in the dashboard header
2. The browser shows a native device picker
3. Select **MineMonitor-ESP32** from the list
4. The dashboard activates and begins streaming live data

---

## ⚙️ Calibration

Update the baselines in `src/lib/constants.ts` **and** `esp32_ble_server.ino` to match your device's clean-air ADC readings:

```typescript
// src/lib/constants.ts
export const GAS_SENSORS = [
  { id: "MQ2",   alarmPPM: 100,  maxPPM: 500,  ... },
  { id: "MQ4",   alarmPPM: 250,  maxPPM: 500,  ... },
  { id: "MQ7",   alarmPPM: 50,   maxPPM: 5000, ... },
  { id: "MQ135", alarmPPM: 50,   maxPPM: 200,  ... },
];
```

```cpp
// esp32_ble_server.ino
const int BASE[4]     = {1627, 2032, 851, 3042};  // your clean-air ADC values
const int ALARM_PPM[4]= {100,  250,  50,  50};    // DGMS India limits
```

---

## 🧪 Demo Mode

No hardware? Click **▶ RUN DEMO MODE** on the dashboard to simulate realistic mine sensor data including occasional spike events.

---

## 🏗️ Production Build
```bash
npm run build
npm start
```

---

## 📋 Alarm Thresholds (DGMS India)

| Sensor | Gas | Alarm Limit | Reference |
|---|---|---|---|
| MQ-2 | LPG/HC Combustibles | 100 PPM (10% LEL) | DGMS Circular |
| MQ-4 | Methane (CH₄) | 250 PPM (0.25% vol) | DGMS Early Warning |
| MQ-7 | Carbon Monoxide | 50 PPM | DGMS Statutory Limit |
| MQ-135 | Sulphur Dioxide | 50 PPM | DGMS Mine Air Quality |

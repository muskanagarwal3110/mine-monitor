"use client";

import { useState, useCallback } from "react";
import { useBluetooth }    from "@/hooks/useBluetooth";
import { useSensorStore }  from "@/hooks/useSensorStore";
import { useDemoMode }     from "@/hooks/useDemoMode";
import Header              from "@/components/dashboard/Header";
import StatusBar           from "@/components/dashboard/StatusBar";
import EnvCards            from "@/components/dashboard/EnvCards";
import GasCard             from "@/components/dashboard/GasCard";
import AnalyticsPanel      from "@/components/analytics/AnalyticsPanel";
import TelemetryChart      from "@/components/charts/TelemetryChart";
import ConnectionHelp      from "@/components/bluetooth/ConnectionHelp";
import { GAS_SENSORS }     from "@/lib/constants";

export default function Dashboard() {
  const [selectedSensorIdx, setSelectedSensorIdx] = useState(0);
  const [demoRunning, setDemoRunning]             = useState(false);

  // ─── Sensor state store ────────────────────────────────────────────────────
  const {
    latest,
    history,
    indices,
    status,
    sirenActive,
    recordCount,
    pushPayload,
    toggleSiren,
    clearHistory,
  } = useSensorStore();

  // ─── Bluetooth ─────────────────────────────────────────────────────────────
  const { connection, connect, disconnect, sendCommand, isSupported } =
    useBluetooth(pushPayload);

  // ─── Demo mode ─────────────────────────────────────────────────────────────
  const { startDemo, stopDemo } = useDemoMode(pushPayload);

  const toggleDemo = useCallback(() => {
    if (demoRunning) {
      stopDemo();
      clearHistory();
      setDemoRunning(false);
    } else {
      startDemo();
      setDemoRunning(true);
    }
  }, [demoRunning, startDemo, stopDemo, clearHistory]);

  // ─── Siren — also send BLE command to hardware ────────────────────────────
  const handleToggleSiren = useCallback(() => {
    toggleSiren();
    const cmd = sirenActive ? "SIREN_OFF" : "SIREN_ON";
    sendCommand(cmd);
  }, [toggleSiren, sirenActive, sendCommand]);

  // ─── Derived display values ────────────────────────────────────────────────
  const isConnected    = connection.state === "connected";
  const hasData        = recordCount > 0;
  const showHelp       = !isConnected && !demoRunning && !hasData;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <Header
          connection={connection}
          sirenActive={sirenActive}
          recordCount={recordCount}
          onConnect={connect}
          onDisconnect={disconnect}
          onToggleSiren={handleToggleSiren}
          onClear={clearHistory}
          isSupported={isSupported}
        />

        {/* ── Status bar ────────────────────────────────────────────────────── */}
        <StatusBar status={status} connection={connection} />

        {/* ── Demo mode toggle ──────────────────────────────────────────────── */}
        {!isConnected && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-white/30">
            <div className="h-px flex-1 bg-white/5" />
            <button
              onClick={toggleDemo}
              className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/25
                         hover:text-white/60 tracking-widest transition-all"
            >
              {demoRunning ? "⬛ STOP DEMO" : "▶ RUN DEMO MODE"}
            </button>
            <div className="h-px flex-1 bg-white/5" />
          </div>
        )}

        {/* ── Help panel (shown before first connection) ─────────────────────── */}
        {showHelp && <ConnectionHelp />}

        {/* ── Main content (shown once data arrives) ─────────────────────────── */}
        {hasData && (
          <>
            {/* Environment */}
            <EnvCards
              temperature={latest?.t ?? null}
              humidity={latest?.h ?? null}
            />

            {/* Gas sensor cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {GAS_SENSORS.map((sensor, i) => (
                <GasCard
                  key={sensor.id}
                  sensor={sensor}
                  ppm={latest?.[sensor.jsonKey] ?? 0}
                  isSelected={selectedSensorIdx === i}
                  onClick={() => setSelectedSensorIdx(i)}
                />
              ))}
            </div>

            {/* Chart + Analytics side-by-side on wide screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <TelemetryChart
                  history={history}
                  selectedSensorIdx={selectedSensorIdx}
                  onSelectSensor={setSelectedSensorIdx}
                />
              </div>
              <div className="lg:col-span-1">
                <AnalyticsPanel indices={indices} status={status} />
              </div>
            </div>
          </>
        )}

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between pt-4 border-t border-white/5">
          <span className="text-[9px] font-mono text-white/15 tracking-widest">
            FIRE RISK INDEX APPARATUS — DGMS INDIA COMPLIANT
          </span>
          <span className="text-[9px] font-mono text-white/15 tracking-widest">
            WEB BLUETOOTH API
          </span>
        </footer>

      </div>
    </div>
  );
}

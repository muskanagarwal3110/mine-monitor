"use client";

import type { BleConnection } from "@/types";
import { cn } from "@/lib/utils";

interface BluetoothButtonProps {
  connection: BleConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  isSupported: boolean;
}

const STATE_LABELS: Record<string, string> = {
  idle: "CONNECT BLUETOOTH",
  scanning: "SCANNING...",
  connecting: "CONNECTING...",
  connected: "CONNECTED",
  disconnected: "RECONNECT",
  error: "RETRY",
};

export default function BluetoothButton({
  connection,
  onConnect,
  onDisconnect,
  isSupported,
}: BluetoothButtonProps) {
  const { state, deviceName, error } = connection;

  const isConnected = state === "connected";
  const isBusy = state === "scanning" || state === "connecting";
  const label = STATE_LABELS[state] ?? "CONNECT";

  const handleClick = () => {
    if (isConnected) onDisconnect();
    else if (!isBusy) onConnect();
  };

  // Not supported UI
  if (!isSupported) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          disabled
          className="px-5 py-2.5 rounded-lg border text-xs font-display tracking-widest
                     border-red-700 text-red-500 bg-red-950/30 cursor-not-allowed opacity-60"
        >
          BT NOT SUPPORTED
        </button>

        <span className="text-[10px] text-red-400 font-mono">
          Use Chrome / Edge on desktop
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isBusy}
        className={cn(
          "px-5 py-2.5 rounded-lg border text-xs font-display tracking-widest",
          "transition-all relative overflow-hidden",

          isConnected &&
            "border-green-700 text-green-500 bg-green-950/30",

          !isConnected &&
            !isBusy &&
            "border-blue-700 text-blue-500 bg-blue-950/30 hover:bg-blue-950/50",

          !isConnected &&
            isBusy &&
            "border-yellow-700 text-yellow-500 bg-yellow-950/30"
        )}
      >
        {/* scanning animation */}
        <span
          className={cn(
            "absolute inset-0 opacity-20",
            isBusy ? "block" : "hidden"
          )}
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--accent), transparent)",
            animation: "scan 1.2s linear infinite",
          }}
        />

        {/* content */}
        <span className="relative flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-gray-400"
            )}
          />

          {label}
        </span>
      </button>

      {/* device name */}
      <span
        className={cn(
          "text-[10px] text-gray-400 font-mono",
          isConnected && deviceName ? "block" : "hidden"
        )}
      >
        {deviceName}
      </span>

      {/* error */}
      <span
        className={cn(
          "text-[10px] text-red-400 font-mono",
          state === "error" && error ? "block" : "hidden"
        )}
      >
        {error}
      </span>
    </div>
  );
}
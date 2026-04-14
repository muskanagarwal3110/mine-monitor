"use client";

import { useState, useCallback, useRef } from "react";
import type { BleConnection, BleState, SensorPayload } from "@/types";
import { BLE_CONFIG } from "@/lib/constants";

interface UseBluetooth {
  connection:  BleConnection;
  connect:     () => Promise<void>;
  disconnect:  () => Promise<void>;
  sendCommand: (cmd: string) => Promise<void>;
  isSupported: boolean;
}

// ─── useBluetooth ─────────────────────────────────────────────────────────────
// Manages the full Web Bluetooth API lifecycle:
//   1. Scan & pair with the ESP32 BLE device
//   2. Subscribe to the NOTIFY characteristic for incoming JSON payloads
//   3. Parse each notification and invoke onData callback
//   4. Optionally write commands back (e.g. siren toggle)
//
// Your ESP32 must:
//   - Advertise SERVICE_UUID
//   - Have a NOTIFY characteristic at CHAR_UUID_NOTIFY
//     that sends JSON like: {"t":27.3,"h":58,"mq2":12,"mq4":0,"mq7":8,"mq135":4}
//   - Optionally have a WRITE characteristic at CHAR_UUID_WRITE
// ─────────────────────────────────────────────────────────────────────────────
export function useBluetooth(
  onData: (payload: SensorPayload) => void
): UseBluetooth {
  const [connection, setConnection] = useState<BleConnection>({ state: "idle" });

  // Keep refs so callbacks don't capture stale closures
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const writeCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const bufferRef = useRef<string>(""); // accumulate partial JSON

  const isSupported =
    typeof navigator !== "undefined" && "bluetooth" in navigator;

  // ─── setState helper ───────────────────────────────────────────────────────
  const setState = (state: BleState, extras: Partial<BleConnection> = {}) =>
    setConnection((prev) => ({ ...prev, state, ...extras }));

  // ─── Notification handler ─────────────────────────────────────────────────
  // The ESP32 may send partial packets; we buffer until we get a full JSON line.
  const handleNotification = useCallback(
    (event: Event) => {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
      if (!value) return;

      const chunk = new TextDecoder().decode(value);
      bufferRef.current += chunk;

      // Split on newlines — ESP32 should terminate each JSON payload with \n
      const lines = bufferRef.current.split("\n");
      bufferRef.current = lines.pop() ?? ""; // keep incomplete fragment

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const payload = JSON.parse(trimmed) as SensorPayload;
            onData(payload);
          } catch {
            console.warn("[BLE] Failed to parse payload:", trimmed);
          }
        }
      }
    },
    [onData]
  );

  // ─── Disconnect handler (device-initiated) ────────────────────────────────
  const handleDisconnect = useCallback(() => {
    setState("disconnected", { error: "Device disconnected unexpectedly." });
    writeCharRef.current = null;
    serverRef.current    = null;
  }, []);

  // ─── connect() ───────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!isSupported) {
      setState("error", { error: "Web Bluetooth is not supported in this browser." });
      return;
    }

    setState("scanning");

    try {
      // 1. Request device — browser shows native picker UI
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [BLE_CONFIG.SERVICE_UUID] },
          // Fallback: match by name prefix if UUID isn't advertised
          { namePrefix: "MineMonitor" },
          { namePrefix: "ESP32" },
        ],
        optionalServices: [BLE_CONFIG.SERVICE_UUID],
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", handleDisconnect);

      setState("connecting", { deviceName: device.name ?? "Unknown Device" });

      // 2. Connect to GATT server
      const server = await device.gatt!.connect();
      serverRef.current = server;

      // 3. Get our primary service
      const service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);

      // 4. Subscribe to NOTIFY characteristic (incoming sensor data)
      const notifyChar = await service.getCharacteristic(BLE_CONFIG.CHAR_UUID_NOTIFY);
      await notifyChar.startNotifications();
      notifyChar.addEventListener("characteristicvaluechanged", handleNotification);

      // 5. Optional: get WRITE characteristic for sending commands back
      try {
        writeCharRef.current = await service.getCharacteristic(BLE_CONFIG.CHAR_UUID_WRITE);
      } catch {
        // Write characteristic is optional — device may not implement it
        console.info("[BLE] Write characteristic not found — command sending disabled.");
      }

      setState("connected", { deviceName: device.name ?? "ESP32 Device" });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";

      // User cancelled the picker — not really an error
      if (msg.includes("User cancelled")) {
        setState("idle");
      } else {
        setState("error", { error: msg });
      }
    }
  }, [isSupported, handleNotification, handleDisconnect]);

  // ─── disconnect() ─────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    deviceRef.current?.removeEventListener("gattserverdisconnected", handleDisconnect);
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    deviceRef.current  = null;
    serverRef.current  = null;
    writeCharRef.current = null;
    bufferRef.current  = "";
    setState("disconnected");
  }, [handleDisconnect]);

  // ─── sendCommand() ────────────────────────────────────────────────────────
  // Send a UTF-8 encoded string command to the ESP32 (if write char available)
  const sendCommand = useCallback(async (cmd: string) => {
    if (!writeCharRef.current) {
      console.warn("[BLE] No write characteristic — cannot send command.");
      return;
    }
    try {
      const encoded = new TextEncoder().encode(cmd + "\n");
      await writeCharRef.current.writeValueWithoutResponse(encoded);
    } catch (err) {
      console.error("[BLE] Failed to send command:", err);
    }
  }, []);

  return { connection, connect, disconnect, sendCommand, isSupported };
}

"use client";

import { BLE_CONFIG } from "@/lib/constants";

export default function ConnectionHelp() {
  return (
    <div className="glass p-6 border-dashed border-[var(--border)]">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="mt-0.5 w-10 h-10 rounded-lg bg-cyan-950/40 border border-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="w-5 h-5">
            <path d="M8.5 12a3.5 3.5 0 0 0 7 0m-7 0a3.5 3.5 0 0 1 7 0m-7 0H2m13.5 0H22M12 8.5V2m0 20v-6.5" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xs tracking-[0.2em] text-[var(--accent)] font-bold mb-3">
            BLUETOOTH SETUP GUIDE
          </h3>

          <div className="grid sm:grid-cols-2 gap-4 text-[11px] font-mono text-white/50">
            {/* Steps */}
            <div className="space-y-2">
              <p className="text-white/70 font-semibold mb-1">Connection Steps:</p>
              {[
                "Power on your ESP32 device",
                'Click "CONNECT BLUETOOTH" above',
                "Select your device from the browser picker",
                "Dashboard activates automatically",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center text-[9px]"
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            {/* ESP32 config */}
            <div className="space-y-2">
              <p className="text-white/70 font-semibold mb-1">ESP32 BLE Config:</p>
              <div className="space-y-1.5 bg-black/30 rounded-lg p-3 border border-white/5">
                <div>
                  <span className="text-white/30">Service UUID</span>
                  <p className="text-[var(--accent)]/70 break-all text-[9px] mt-0.5">{BLE_CONFIG.SERVICE_UUID}</p>
                </div>
                <div>
                  <span className="text-white/30">Notify Char UUID</span>
                  <p className="text-yellow-400/60 break-all text-[9px] mt-0.5">{BLE_CONFIG.CHAR_UUID_NOTIFY}</p>
                </div>
                <div>
                  <span className="text-white/30">Write Char UUID</span>
                  <p className="text-purple-400/60 break-all text-[9px] mt-0.5">{BLE_CONFIG.CHAR_UUID_WRITE}</p>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-3 border border-white/5 mt-2">
                <p className="text-white/30 mb-1">JSON Payload Format:</p>
                <code className="text-[var(--safe)]/70 text-[9px]">
                  {`{"t":27.3,"h":58,"mq2":12,"mq4":0,"mq7":8,"mq135":4}`}
                </code>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] font-mono text-white/20">
            ⚠ Web Bluetooth requires Chrome or Edge on desktop. Firefox and Safari are not supported.
          </p>
        </div>
      </div>
    </div>
  );
}

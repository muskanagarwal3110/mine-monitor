"use client";

import { useState, useCallback, useRef } from "react";
import type {
  SensorPayload,
  SensorHistory,
  SafetyIndices,
  StatusResult,
} from "@/types";
import { HISTORY_LEN } from "@/types";
import { computeIndices, computeStatus } from "@/lib/analytics";
import { formatTime } from "@/lib/utils";

interface SensorStore {
  latest:        SensorPayload | null;
  history:       SensorHistory;
  indices:       SafetyIndices | null;
  status:        StatusResult;
  sirenActive:   boolean;
  recordCount:   number;
  pushPayload:   (payload: SensorPayload) => void;
  toggleSiren:   () => void;
  clearHistory:  () => void;
}

const EMPTY_HISTORY = (): SensorHistory => ({
  mq2:        Array(HISTORY_LEN).fill(0),
  mq4:        Array(HISTORY_LEN).fill(0),
  mq7:        Array(HISTORY_LEN).fill(0),
  mq135:      Array(HISTORY_LEN).fill(0),
  timestamps: Array(HISTORY_LEN).fill(""),
});

const DEFAULT_STATUS: StatusResult = {
  level:   "stable",
  message: "WAITING FOR DATA...",
};

export function useSensorStore(): SensorStore {
  const [latest,      setLatest]      = useState<SensorPayload | null>(null);
  const [history,     setHistory]     = useState<SensorHistory>(EMPTY_HISTORY);
  const [indices,     setIndices]     = useState<SafetyIndices | null>(null);
  const [status,      setStatus]      = useState<StatusResult>(DEFAULT_STATUS);
  const [sirenActive, setSirenActive] = useState(false);
  const [recordCount, setRecordCount] = useState(0);

  // Auto-siren ref — we want to check without re-rendering
  const autoSirenRef = useRef(false);

  const pushPayload = useCallback((payload: SensorPayload) => {
    const now = formatTime();

    setLatest(payload);
    setRecordCount((c) => c + 1);

    setHistory((prev) => {
      const push = <T>(arr: T[], val: T): T[] => [...arr.slice(1), val];
      return {
        mq2:        push(prev.mq2,        payload.mq2),
        mq4:        push(prev.mq4,        payload.mq4),
        mq7:        push(prev.mq7,        payload.mq7),
        mq135:      push(prev.mq135,      payload.mq135),
        timestamps: push(prev.timestamps, now),
      };
    });

    const computed = computeIndices(payload);
    setIndices(computed);

    const stat = computeStatus(payload);
    setStatus(stat);

    // Auto-activate siren on danger
    if (stat.level === "danger" && !autoSirenRef.current) {
      autoSirenRef.current = true;
      setSirenActive(true);
    }
    // Auto-clear siren when back to normal
    if (stat.level === "stable" && autoSirenRef.current) {
      autoSirenRef.current = false;
      setSirenActive(false);
    }
  }, []);

  const toggleSiren = useCallback(() => {
    setSirenActive((v) => {
      autoSirenRef.current = !v;
      return !v;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(EMPTY_HISTORY());
    setLatest(null);
    setIndices(null);
    setStatus(DEFAULT_STATUS);
    setRecordCount(0);
    autoSirenRef.current = false;
    setSirenActive(false);
  }, []);

  return {
    latest,
    history,
    indices,
    status,
    sirenActive,
    recordCount,
    pushPayload,
    toggleSiren,
    clearHistory,
  };
}

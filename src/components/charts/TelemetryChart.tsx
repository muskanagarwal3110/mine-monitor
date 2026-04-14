"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";
import type { GasSensor, SensorHistory } from "@/types";
import { GAS_SENSORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

interface TelemetryChartProps {
  history:          SensorHistory;
  selectedSensorIdx: number;
  onSelectSensor:   (idx: number) => void;
}

export default function TelemetryChart({
  history,
  selectedSensorIdx,
  onSelectSensor,
}: TelemetryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  const sensor: GasSensor = GAS_SENSORS[selectedSensorIdx];
  const dataKey = sensor.jsonKey as keyof Pick<
    SensorHistory,
    "mq2" | "mq4" | "mq7" | "mq135"
  >;
  const data = history[dataKey];

  // ─── Build / destroy chart ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Destroy existing
    chartRef.current?.destroy();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, sensor.color + "55");
    gradient.addColorStop(1, sensor.color + "00");

    // Alarm threshold annotation line via plugin
    const alarmPlugin = {
      id: "alarmLine",
      afterDraw(chart: Chart) {
        const { ctx: c, scales, chartArea } = chart as any;
        const yScale = scales.y;
        const yPos   = yScale.getPixelForValue(sensor.alarmPPM);
        if (yPos < chartArea.top || yPos > chartArea.bottom) return;
        c.save();
        c.setLineDash([6, 4]);
        c.strokeStyle = "rgba(255,202,40,0.5)";
        c.lineWidth   = 1.5;
        c.beginPath();
        c.moveTo(chartArea.left,  yPos);
        c.lineTo(chartArea.right, yPos);
        c.stroke();
        // Label
        c.setLineDash([]);
        c.fillStyle  = "rgba(255,202,40,0.7)";
        c.font       = "10px 'Share Tech Mono'";
        c.fillText(`ALARM ${sensor.alarmPPM}`, chartArea.right - 80, yPos - 4);
        c.restore();
      },
    };

    chartRef.current = new Chart(ctx, {
      type: "line",
      plugins: [alarmPlugin],
      data: {
        labels: history.timestamps,
        datasets: [
          {
            label:           sensor.desc,
            data:            data,
            borderColor:     sensor.color,
            borderWidth:     2,
            backgroundColor: gradient,
            fill:            true,
            tension:         0.4,
            pointRadius:     0,
            pointHitRadius:  12,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           { duration: 0 },
        scales: {
          y: {
            beginAtZero: true,
            max:         sensor.maxPPM,
            grid:        { color: "rgba(255,255,255,0.04)" },
            ticks: {
              color:    "rgba(138,180,248,0.6)",
              font:     { family: "'Share Tech Mono'", size: 10 },
              callback: (v) => `${v}`,
            },
            border: { color: "rgba(255,255,255,0.08)" },
          },
          x: {
            grid:    { display: false },
            display: false,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(3,6,10,0.9)",
            borderColor:     sensor.color,
            borderWidth:     1,
            titleColor:      sensor.color,
            bodyColor:       "#ffffff",
            titleFont:       { family: "'Share Tech Mono'", size: 11 },
            bodyFont:        { family: "'DM Sans'", size: 12 },
            callbacks: {
              title: (items) => items[0].label || "",
              label: (item)  => ` ${item.raw} PPM`,
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSensorIdx]);

  // ─── Live data update (no redraw) ────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.datasets[0].data   = data;
    chart.data.labels             = history.timestamps;
    chart.update("none");
  }, [data, history.timestamps]);

  // ─── Sensor tab selector ─────────────────────────────────────────────────
  return (
    <div className="glass p-5 flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {GAS_SENSORS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSelectSensor(i)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-display tracking-widest",
              "border transition-all duration-200",
              i === selectedSensorIdx
                ? "border-current font-bold"
                : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
            )}
            style={
              i === selectedSensorIdx
                ? { color: s.color, borderColor: s.color, background: s.color + "18" }
                : {}
            }
          >
            {s.desc}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-white/20 tracking-widest">
          LIVE TELEMETRY
        </span>
      </div>

      {/* Chart title */}
      <div className="flex items-center gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: sensor.color,
            boxShadow:  `0 0 8px ${sensor.color}`,
          }}
        />
        <span
          className="font-display text-xs font-bold tracking-[0.15em]"
          style={{ color: sensor.color }}
        >
          {sensor.desc} / {sensor.id}
        </span>
        <span className="text-[10px] font-mono text-white/20">
          0 – {sensor.maxPPM} PPM
        </span>
      </div>

      {/* Chart canvas */}
      <div className="relative h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

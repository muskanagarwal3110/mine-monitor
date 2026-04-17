"use client";

interface EnvCardsProps {
  temperature: number | null;
  humidity:    number | null;
}

export default function EnvCards({ temperature, humidity }: EnvCardsProps) {
  const tempStr = temperature !== null ? temperature.toFixed(1) + "°C" : "--.-°C";
  const humStr  = humidity    !== null ? Math.round(humidity) + "%" : "--%";

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Temperature */}
      <div className="glass p-6 text-center">
        <p className="text-2xl font-mono tracking-[0.2em] text-[var(--text-sub)] mb-2">
          TEMPERATURE
        </p>
        <p
          className="font-display text-4xl font-black"
          style={{
            color:      "#ffb74d",
            textShadow: "0 0 24px rgba(255,183,77,0.4)",
          }}
        >
          {tempStr}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-400/30" />
          <span className="text-[12px] font-mono text-orange-300/50 tracking-widest">CELSIUS</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-400/30" />
        </div>
      </div>

      {/* Humidity */}
      <div className="glass p-6 text-center">
        <p className="text-2xl font-mono tracking-[0.2em] text-[var(--text-sub)] mb-2">
          HUMIDITY
        </p>
        <p
          className="font-display text-4xl font-black"
          style={{
            color:      "#4dd0e1",
            textShadow: "0 0 24px rgba(77,208,225,0.4)",
          }}
        >
          {humStr}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-400/30" />
          <span className="text-[12px] font-mono text-cyan-300/50 tracking-widest">RELATIVE</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-400/30" />
        </div>
      </div>
    </div>
  );
}

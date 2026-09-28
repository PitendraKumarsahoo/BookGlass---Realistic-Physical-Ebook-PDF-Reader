import React from 'react';

interface NightLightLampProps {
  enabled: boolean;
  warmth: number; // 0 (crisp amber) to 100 (deep candlelight)
  intensity: number; // 0 to 100
}

export const NightLightLamp: React.FC<NightLightLampProps> = ({
  enabled,
  warmth,
  intensity,
}) => {
  if (!enabled) return null;

  // Calculate rich incandescent / golden reading light RGB spectrum
  // Warmth 0 -> ~255, 238, 195 (warm tungsten desk lamp)
  // Warmth 100 -> ~255, 160, 50 (deep amber candle flame)
  const red = 255;
  const green = Math.round(238 - (warmth / 100) * 78);
  const blue = Math.round(195 - (warmth / 100) * 145);

  const baseAlpha = (intensity / 100) * 0.35;
  const outerAlpha = (intensity / 100) * 0.12;
  const coreAlpha = (intensity / 100) * 0.55;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-700 ease-out overflow-hidden flex items-center justify-center"
      aria-hidden="true"
    >
      {/* 1. Outermost Ambient Atmospheric Glow (fills the reading room with subtle warm darkness) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1600px] h-[1100px] max-w-[170vw] max-h-[140vh] rounded-full blur-[140px] mix-blend-color-dodge opacity-50"
        style={{
          background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(${red}, ${green}, ${blue}, ${baseAlpha * 0.7}) 0%, rgba(${red}, ${green}, ${blue}, ${outerAlpha * 0.5}) 60%, transparent 100%)`,
        }}
      />

      {/* 2. Primary Focused Reading Cone - Directly Centered Vertically on the Open Book Pages */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1150px] h-[800px] max-w-[135vw] max-h-[115vh] rounded-full blur-[85px] mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse 65% 60% at 50% 50%, rgba(${red}, ${green}, ${blue}, ${baseAlpha * 1.6}) 0%, rgba(${red}, ${green}, ${blue}, ${baseAlpha * 0.9}) 35%, rgba(${red}, ${green}, ${blue}, ${outerAlpha}) 70%, transparent 100%)`,
        }}
      />

      {/* 3. Intense Inner Reading Pool on Paper Folios (replicates direct lamp illumination) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] max-w-[95vw] rounded-full blur-[50px] mix-blend-overlay opacity-60"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${red}, ${green}, ${blue}, ${coreAlpha}) 0%, rgba(${red}, ${green}, ${blue}, ${coreAlpha * 0.4}) 45%, transparent 80%)`,
        }}
      />

      {/* 4. Realistic Center Spine Glint (Simulates specular reflection off paper binding curvature) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[600px] max-h-[90vh] rounded-full blur-[15px] mix-blend-soft-light opacity-75"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, rgba(${red}, ${green}, ${blue}, ${coreAlpha * 0.9}) 50%, transparent 100%)`,
        }}
      />
    </div>
  );
};

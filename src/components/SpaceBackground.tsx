import React, { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDelay?: number;
  twinkleDuration?: number;
}

interface ProminentStar {
  id: number;
  x: number; // percentage
  y: number; // percentage
  size: number; // px
  pulseDelay: number;
  pulseDuration: number;
}

export function SpaceBackground() {
  // Deterministic star distributions for visual consistency across renders
  const { layer1Stars, layer2Stars, prominentStars, twinklingStars } = useMemo(() => {
    let s = 2026;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    // Layer 1: Distant micro-stars (sparse, 1px - 1.2px, crisp white/ice-blue)
    const l1: Star[] = [];
    for (let i = 0; i < 36; i++) {
      l1.push({
        id: i,
        x: Math.round(rnd() * 1000) / 10,
        y: Math.round(rnd() * 1000) / 10,
        size: 1.2,
        opacity: Math.round((0.55 + rnd() * 0.35) * 100) / 100,
      });
    }

    // Layer 2: Mid-depth stars (1.6px - 2px, subtle warm silver)
    const l2: Star[] = [];
    for (let i = 0; i < 22; i++) {
      l2.push({
        id: i + 40,
        x: Math.round(rnd() * 1000) / 10,
        y: Math.round(rnd() * 1000) / 10,
        size: 1.8,
        opacity: Math.round((0.7 + rnd() * 0.28) * 100) / 100,
      });
    }

    // Layer 3: Prominent Guide Stars with lens glow & 4-point optical diffraction flares
    // Placed specifically in the open visual corridors identified in mission control view
    const prominent: ProminentStar[] = [
      { id: 101, x: 12.8, y: 6.3, size: 2.8, pulseDelay: -2.1, pulseDuration: 5.8 }, // Upper left near logo
      { id: 102, x: 50.8, y: 25.2, size: 3.4, pulseDelay: -1.8, pulseDuration: 6.2 }, // In open space right above Mars glowing limb!
      { id: 103, x: 74.2, y: 17.0, size: 3.0, pulseDelay: -3.2, pulseDuration: 7.0 }, // Above Relay Link Quality card
      { id: 104, x: 32.2, y: 49.6, size: 2.8, pulseDelay: 0, pulseDuration: 5.5 }, // Above wheel slip / speed
      { id: 105, x: 88.4, y: 8.5, size: 3.0, pulseDelay: -4.5, pulseDuration: 6.5 }, // Upper sky right
      { id: 106, x: 1.2, y: 62.6, size: 2.6, pulseDelay: -1.2, pulseDuration: 6.0 }, // Far left margin
      { id: 107, x: 98.2, y: 49.6, size: 2.8, pulseDelay: -2.8, pulseDuration: 6.4 }, // Far right margin
    ];

    // Layer 4: Foreground twinkling stars (2px, gentle breathing twinkle)
    const twinklers: Star[] = [];
    for (let i = 0; i < 14; i++) {
      twinklers.push({
        id: i + 80,
        x: Math.round(rnd() * 1000) / 10,
        y: Math.round(rnd() * 1000) / 10,
        size: 2.2,
        opacity: Math.round((0.75 + rnd() * 0.25) * 100) / 100,
        twinkleDelay: -Math.round(rnd() * 80) / 10,
        twinkleDuration: Math.round((5 + rnd() * 5) * 10) / 10,
      });
    }

    return {
      layer1Stars: l1,
      layer2Stars: l2,
      prominentStars: prominent,
      twinklingStars: twinklers,
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none bg-[#060608]"
      aria-hidden="true"
    >
      {/* 1. Deep Space Void & Dark Navy Cosmic Base */}
      <div className="absolute inset-0 bg-[#040507]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(20,28,48,0.5)_0%,_transparent_65%)] pointer-events-none" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url('/src/assets/space_bedrock_bg.jpg')` }}
      />

      {/* 2. Soft Base Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040507]/20 via-[#06080d]/50 to-[#08090f]/80 pointer-events-none" />

      {/* 3. Cosmic Dust Nebula Filament (Upper sky corridor matching reference screenshot: x=32% to 74%, y=0% to 26%) */}
      <div 
        className="absolute top-0 left-[30%] w-[44%] h-[210px] pointer-events-none select-none overflow-hidden"
        style={{
          maskImage: 'radial-gradient(ellipse 75% 70% at 50% 30%, black 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 30%, black 35%, transparent 80%)',
        }}
      >
        <div
          className="w-full h-full bg-cover bg-center opacity-100 mix-blend-screen scale-110"
          style={{ backgroundImage: `url('/cosmic_nebula.jpg')` }}
        />
        {/* Warm amber/orange stellar luminescence glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,130,45,0.48)_0%,rgba(210,70,20,0.22)_45%,transparent_75%)] mix-blend-screen" />
      </div>

      {/* 4. Large Cinematic Mars Planet Sphere (Matching exact mathematical circle fit: center=(92.8%, 97.4%), diameter=98.8vw, top=9.4vh) */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '9.4vh',
          right: '-42.2vw',
          width: '98.8vw',
          height: '98.8vw',
          maxWidth: '1440px',
          maxHeight: '1440px',
          transform: 'translateZ(0)',
        }}
      >
        {/* 4a. Atmospheric Corona / Solar Backlighting Haze */}
        <div className="absolute -inset-14 rounded-full mars-corona animate-mars-pulse pointer-events-none" />

        {/* 4b. Atmospheric Outer Rim Glow (Golden-white illuminated crescent) */}
        <div className="absolute -inset-1 rounded-full mars-rim-glow pointer-events-none" />

        {/* 4c. Spherical Mars Body with Rotating HD Surface */}
        <div className="relative w-full h-full rounded-full overflow-hidden">
          {/* Rotating Surface Panorama (Two identical HD textures side-by-side for infinite seamless rotation) */}
          <div className="absolute top-0 left-0 h-full w-[200%] flex animate-mars-rotate will-change-transform">
            <div
              className="w-1/2 h-full bg-cover bg-center"
              style={{ backgroundImage: `url('/mars_texture_hd.jpg')` }}
            />
            <div
              className="w-1/2 h-full bg-cover bg-center"
              style={{ backgroundImage: `url('/mars_texture_hd.jpg')` }}
            />
          </div>

          {/* 4d. 3D Spherical Curvature & Sunlight Shading */}
          <div className="absolute inset-0 rounded-full mars-sphere-lighting pointer-events-none" />

          {/* 4e. Day/Night Terminator Line (Planetary Shadow smoothly fading into #040507) */}
          <div className="absolute inset-0 rounded-full mars-terminator pointer-events-none" />

          {/* 4f. Inner Atmospheric Rim & Sharp Solar Crescent Highlight */}
          <div className="absolute inset-0 rounded-full mars-inner-limb pointer-events-none" />
        </div>
      </div>

      {/* 5. VISIBLE STARFIELD LAYERS (Positioned in front of base background for crisp visibility) */}

      {/* 5a. Starfield Layer 1: Distant Micro-Drift */}
      <div className="absolute inset-0 animate-star-drift-1">
        {layer1Stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white shadow-[0_0_2px_rgba(255,255,255,0.8)]"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* 5b. Starfield Layer 2: Mid-Depth Counter-Drift */}
      <div className="absolute inset-0 animate-star-drift-2">
        {layer2Stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-zinc-100 shadow-[0_0_3px_rgba(255,255,255,0.9)]"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* 5c. Starfield Layer 3: Foreground Twinklers */}
      <div className="absolute inset-0">
        {twinklingStars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-amber-50 shadow-[0_0_4px_rgba(255,255,255,1)] animate-star-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.twinkleDelay}s`,
              animationDuration: `${star.twinkleDuration}s`,
            }}
          />
        ))}
      </div>

      {/* 5d. Prominent Guide Stars with 4-Point Optical Diffraction Flares */}
      <div className="absolute inset-0">
        {prominentStars.map((star) => (
          <div
            key={star.id}
            className="star-prominent animate-star-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.pulseDelay}s`,
              animationDuration: `${star.pulseDuration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

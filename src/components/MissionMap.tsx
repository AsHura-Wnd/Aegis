import React, { useEffect, useRef, useState } from 'react';
import { RoverTelemetry } from '../types/telemetry';
import { soundFX } from '../utils/audio';
import {
  MAP_DIMENSIONS,
  MAP_ZONES,
  MapHazardZone,
  MISSION_WAYPOINTS,
  sampleTerrainAt,
  START_POSITION,
  TARGET_DESTINATION,
} from '../simulation/terrainMap';
import {
  Compass,
  Crosshair,
  Eye,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Radio,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface MissionMapProps {
  telemetry: RoverTelemetry;
  trail: { x: number; y: number; tick: number }[];
  activeScenarioId?: string | null;
  onZoneSelect?: (zone: MapHazardZone) => void;
}

export const MissionMap: React.FC<MissionMapProps> = ({
  telemetry,
  trail,
  activeScenarioId,
  onZoneSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showContours, setShowContours] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [showLidar, setShowLidar] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{
    x: number;
    y: number;
    slope: number;
    roughness: number;
    type: string;
    zoneName?: string;
  } | null>(null);

  // Radar / LiDAR sweep angle
  const radarAngleRef = useRef(0);

  useEffect(() => {
    let animId: number;

    const render = () => {
      radarAngleRef.current = (radarAngleRef.current + 0.04) % (Math.PI * 2);
      drawMap();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [telemetry, trail, zoom, pan, showContours, showWaypoints, showLidar, activeScenarioId]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Pan and Zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Deep Space Mars Terrain Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, MAP_DIMENSIONS.width, MAP_DIMENSIONS.height);
    bgGradient.addColorStop(0, '#0c101a');
    bgGradient.addColorStop(0.4, '#141824');
    bgGradient.addColorStop(0.8, '#10131e');
    bgGradient.addColorStop(1, '#090c14');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, MAP_DIMENSIONS.width, MAP_DIMENSIONS.height);

    // 2. High-Tech Tactical Coordinate Grid
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < MAP_DIMENSIONS.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_DIMENSIONS.height);
      ctx.stroke();
    }
    for (let y = 0; y < MAP_DIMENSIONS.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_DIMENSIONS.width, y);
      ctx.stroke();
    }

    // Grid Coordinates Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.font = '8px monospace';
    for (let x = 80; x < MAP_DIMENSIONS.width; x += 160) {
      ctx.fillText(`${x}m E`, x + 3, 12);
    }
    for (let y = 80; y < MAP_DIMENSIONS.height; y += 120) {
      ctx.fillText(`${y}m N`, 4, y - 3);
    }

    // 3. Topographic Elevation Contour Rings
    if (showContours) {
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.14)';
      ctx.lineWidth = 1.2;

      for (let r = 70; r < 500; r += 60) {
        ctx.beginPath();
        ctx.ellipse(360, 240, r, r * 0.65, 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let r = 50; r < 320; r += 50) {
        ctx.beginPath();
        ctx.ellipse(600, 180, r, r * 0.75, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Map Hazard & Safe Zones with glowing outlines
    MAP_ZONES.forEach((zone) => {
      const isDangerous = zone.severity === 'DANGER';
      const isSafe = zone.severity === 'SAFE';

      ctx.save();
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);

      if (isDangerous) {
        const radGrad = ctx.createRadialGradient(zone.x, zone.y, zone.radius * 0.2, zone.x, zone.y, zone.radius);
        radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
        radGrad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
        ctx.fillStyle = radGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isSafe) {
        const radGrad = ctx.createRadialGradient(zone.x, zone.y, zone.radius * 0.2, zone.x, zone.y, zone.radius);
        radGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
        radGrad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
        ctx.fillStyle = radGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.07)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.setLineDash([2, 3]);
        ctx.stroke();
      }

      // Zone Label
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isDangerous ? '#fca5a5' : isSafe ? '#6ee7b7' : '#fde047';
      ctx.fillText(zone.name.toUpperCase(), zone.x, zone.y - zone.radius - 4);
      ctx.restore();
    });

    // 5. Waypoints & Traverse Flight Path
    if (showWaypoints) {
      ctx.save();
      // Connecting spline path
      ctx.beginPath();
      ctx.moveTo(START_POSITION.x, START_POSITION.y);
      MISSION_WAYPOINTS.forEach((wp) => {
        ctx.lineTo(wp.x, wp.y);
      });
      ctx.lineTo(TARGET_DESTINATION.x, TARGET_DESTINATION.y);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Waypoint Dots
      MISSION_WAYPOINTS.forEach((wp) => {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '8px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(`WP-${wp.id}`, wp.x, wp.y + 12);
      });

      // Target Destination Beacon
      ctx.beginPath();
      ctx.arc(TARGET_DESTINATION.x, TARGET_DESTINATION.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing Target Ring
      const pulseSize = 10 + Math.sin(Date.now() / 250) * 4;
      ctx.beginPath();
      ctx.arc(TARGET_DESTINATION.x, TARGET_DESTINATION.y, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#fde047';
      ctx.fillText(`TARGET: ${TARGET_DESTINATION.name.toUpperCase()}`, TARGET_DESTINATION.x, TARGET_DESTINATION.y - 12);
      ctx.restore();
    }

    // 6. Real Historical Breadcrumb Trail (colored by speed / slip)
    if (trail.length > 1) {
      ctx.save();
      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. Rover 2D Icon, Forward LiDAR Cone & Heading
    ctx.save();
    const rx = telemetry.position.x;
    const ry = telemetry.position.y;
    const headingRad = (telemetry.heading * Math.PI) / 180;

    // 7a. LiDAR Field-of-View Cone (60-degree forward sweep)
    if (showLidar) {
      const lidarDist = 65;
      const fov = (Math.PI / 180) * 60;
      const lidarGrad = ctx.createRadialGradient(rx, ry, 5, rx, ry, lidarDist);
      lidarGrad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
      lidarGrad.addColorStop(0.7, 'rgba(0, 229, 255, 0.08)');
      lidarGrad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.arc(rx, ry, lidarDist, headingRad - fov / 2, headingRad + fov / 2);
      ctx.closePath();
      ctx.fillStyle = lidarGrad;
      ctx.fill();

      // Range arc rings
      [25, 45, 65].forEach((dist) => {
        ctx.beginPath();
        ctx.arc(rx, ry, dist, headingRad - fov / 2, headingRad + fov / 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // 7b. Dynamic Rover Chassis Marker
    ctx.translate(rx, ry);
    ctx.rotate(headingRad);

    // Glowing Ping Halo
    const haloRadius = 14 + Math.sin(Date.now() / 200) * 3;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.strokeStyle = telemetry.isStuck ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Rover Body Rectangle
    ctx.fillStyle = telemetry.isStuck ? '#ef4444' : '#00e5ff';
    ctx.fillRect(-8, -12, 16, 24);

    // 6 Wheels on canvas
    ctx.fillStyle = '#ffffff';
    [-11, 8].forEach((wx) => {
      [-10, 0, 10].forEach((wy) => {
        ctx.fillRect(wx, wy - 3, 3, 6);
      });
    });

    // Heading Arrow on Nose
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-4, -12);
    ctx.lineTo(4, -12);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    ctx.restore();
  };

  // Mouse & Interaction Controls
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert screen coordinates to terrain map coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = clientX * scaleX;
    const canvasY = clientY * scaleY;

    const mapX = (canvasX - pan.x) / zoom;
    const mapY = (canvasY - pan.y) / zoom;

    const sample = sampleTerrainAt(mapX, mapY);
    setSelectedLocation({
      x: Math.round(mapX),
      y: Math.round(mapY),
      slope: sample.slope,
      roughness: sample.roughness,
      type: sample.type,
      zoneName: sample.zone?.name,
    });
    soundFX.playClick();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const recenterRover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundFX.playClick();
    setPan({
      x: canvas.width / 2 - telemetry.position.x * zoom,
      y: canvas.height / 2 - telemetry.position.y * zoom,
    });
  };

  return (
    <div className="rounded-2xl hud-panel-pro p-4 flex flex-col h-full shadow-2xl relative overflow-hidden">
      {/* Top Map Toolbar Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff]" />
          <h3 className="font-space font-bold text-xs tracking-wide text-white">
            Jezero Crater Sector 4 — 2D Tactical Surface Map
          </h3>
          <span className="text-[10px] font-space px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-semibold">
            DEM 1.5m/px
          </span>
        </div>

        {/* Tactical Map Controls */}
        <div className="flex items-center gap-1.5 font-space">
          <button
            onClick={() => {
              soundFX.playClick();
              setShowContours(!showContours);
            }}
            className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-all ${
              showContours
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)] font-bold'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
            title="Toggle Topographic Contours"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Contours</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setShowWaypoints(!showWaypoints);
            }}
            className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-all ${
              showWaypoints
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)] font-bold'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
            title="Toggle Waypoint Flight Route"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Route</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setZoom((z) => Math.min(2.5, z + 0.2));
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setZoom((z) => Math.max(0.6, z - 0.2));
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={recenterRover}
            className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,229,255,0.25)] transition-all font-bold"
            title="Recenter Rover on Map"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tactical Canvas */}
      <div className="relative flex-1 bg-[#060810] cursor-crosshair overflow-hidden rounded-xl border border-white/10 min-h-[360px] scanlines">
        <canvas
          ref={canvasRef}
          width={MAP_DIMENSIONS.width}
          height={MAP_DIMENSIONS.height}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full object-contain"
        />

        {/* Live Tactical GPS Coordinates Overlay */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-[#070b14]/95 border border-cyan-500/30 rounded-xl p-2.5 font-space text-[11px] text-slate-200 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3">
            <span>
              Pos:{' '}
              <strong className="text-cyan-400 font-space">
                {telemetry.position.x}, {telemetry.position.y}
              </strong>
            </span>
            <span>
              Hdg: <strong className="text-white font-space">{telemetry.heading}°</strong>
            </span>
            <span>
              Terr:{' '}
              <strong className="text-amber-400 font-semibold">
                {telemetry.currentTerrain.replace('_', ' ')}
              </strong>
            </span>
            <span>
              Slope:{' '}
              <strong
                className={telemetry.slopeAngle > 18 ? 'text-red-400 font-bold' : 'text-emerald-400'}
              >
                {telemetry.slopeAngle}°
              </strong>
            </span>
          </div>
        </div>

        {/* Interactive Click Point Inspection Card */}
        {selectedLocation && (
          <div className="absolute top-2 right-2 bg-[#070b14]/95 border border-cyan-500/50 rounded-xl p-3 font-space text-xs text-slate-200 shadow-2xl backdrop-blur-xl max-w-xs z-20">
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/10">
              <span className="text-cyan-400 font-space font-bold">Terrain Inspection</span>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            {selectedLocation.zoneName && (
              <div className="text-amber-300 font-semibold mb-1 text-xs">
                {selectedLocation.zoneName}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span className="text-slate-400">DEM Coords:</span>
              <span className="text-white font-bold">
                {selectedLocation.x}, {selectedLocation.y}
              </span>
              <span className="text-slate-400">Surface Type:</span>
              <span className="truncate text-cyan-300 font-semibold">
                {selectedLocation.type.replace('_', ' ')}
              </span>
              <span className="text-slate-400">Slope Gradient:</span>
              <span className={selectedLocation.slope > 20 ? 'text-red-400 font-bold' : 'text-slate-200'}>
                {selectedLocation.slope}°
              </span>
              <span className="text-slate-400">Roughness:</span>
              <span className="text-slate-200">{selectedLocation.roughness}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#05070e] border-t border-white/5 text-[10px] font-mono text-slate-400 overflow-x-auto gap-4 mt-2 rounded-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
          <span>Rover & Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
          <span>Crater Scarp / Sand Sea (Hazard)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          <span>Solar Recharge Safe Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#eab308]" />
          <span>Science Destination</span>
        </div>
      </div>
    </div>
  );
};

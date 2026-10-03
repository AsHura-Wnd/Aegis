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

    // 1. Tactile Deep Space Basalt Terrain Background
    const bgGradient = ctx.createLinearGradient(0, 0, MAP_DIMENSIONS.width, MAP_DIMENSIONS.height);
    bgGradient.addColorStop(0, '#060609');
    bgGradient.addColorStop(0.5, '#0a0a0f');
    bgGradient.addColorStop(1, '#050508');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, MAP_DIMENSIONS.width, MAP_DIMENSIONS.height);

    // 2. High-Precision Tactical Coordinate Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '8px monospace';
    for (let x = 80; x < MAP_DIMENSIONS.width; x += 160) {
      ctx.fillText(`${x}m E`, x + 3, 12);
    }
    for (let y = 80; y < MAP_DIMENSIONS.height; y += 120) {
      ctx.fillText(`${y}m N`, 4, y - 3);
    }

    // 3. Topographic Elevation Contour Rings (Warm Martian Amber & Terracotta matching reference)
    if (showContours) {
      for (let r = 70; r < 520; r += 55) {
        ctx.strokeStyle = r % 110 === 0 ? 'rgba(245, 130, 45, 0.28)' : 'rgba(220, 100, 35, 0.15)';
        ctx.lineWidth = r % 110 === 0 ? 1.4 : 1.0;
        ctx.beginPath();
        ctx.ellipse(360, 240, r, r * 0.65, 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let r = 50; r < 360; r += 45) {
        ctx.strokeStyle = r % 90 === 0 ? 'rgba(245, 130, 45, 0.24)' : 'rgba(220, 100, 35, 0.14)';
        ctx.lineWidth = r % 90 === 0 ? 1.3 : 0.9;
        ctx.beginPath();
        ctx.ellipse(600, 180, r, r * 0.75, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Map Hazard & Safe Zones with restrained outlines
    MAP_ZONES.forEach((zone) => {
      const isDangerous = zone.severity === 'DANGER';
      const isSafe = zone.severity === 'SAFE';

      ctx.save();
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);

      if (isDangerous) {
        const radGrad = ctx.createRadialGradient(zone.x, zone.y, zone.radius * 0.2, zone.x, zone.y, zone.radius);
        radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
        radGrad.addColorStop(1, 'rgba(239, 68, 68, 0.01)');
        ctx.fillStyle = radGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (isSafe) {
        const radGrad = ctx.createRadialGradient(zone.x, zone.y, zone.radius * 0.2, zone.x, zone.y, zone.radius);
        radGrad.addColorStop(0, 'rgba(244, 244, 245, 0.08)');
        radGrad.addColorStop(1, 'rgba(244, 244, 245, 0.01)');
        ctx.fillStyle = radGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 244, 245, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.setLineDash([2, 3]);
        ctx.stroke();
      }

      // Zone Label Badge
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      const labelText = zone.name.toUpperCase();
      const textMetrics = ctx.measureText(labelText);
      const bgW = textMetrics.width + 10;
      const bgH = 14;
      const bgX = zone.x - bgW / 2;
      const bgY = zone.y - zone.radius - 16;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(bgX, bgY, bgW, bgH);
      ctx.strokeStyle = isDangerous ? 'rgba(244, 63, 94, 0.5)' : isSafe ? 'rgba(255, 255, 255, 0.2)' : 'rgba(245, 158, 11, 0.5)';
      ctx.strokeRect(bgX, bgY, bgW, bgH);
      ctx.fillStyle = isDangerous ? '#fca5a5' : isSafe ? '#d4d4d8' : '#fde047';
      ctx.fillText(labelText, zone.x, bgY + 10);
      ctx.restore();
    });

    // 5. Waypoints & Traverse Flight Path (Glowing Amber Route)
    if (showWaypoints) {
      ctx.save();
      // Connecting spline path with warm amber glow matching reference
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(START_POSITION.x, START_POSITION.y);
      MISSION_WAYPOINTS.forEach((wp) => {
        ctx.lineTo(wp.x, wp.y);
      });
      ctx.lineTo(TARGET_DESTINATION.x, TARGET_DESTINATION.y);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Waypoint Dots
      MISSION_WAYPOINTS.forEach((wp) => {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = '8px monospace';
        ctx.fillStyle = '#a1a1aa';
        ctx.textAlign = 'center';
        ctx.fillText(`WP-${wp.id}`, wp.x, wp.y + 14);
      });

      // Target Destination Beacon (Glowing Amber/Orange Target)
      ctx.beginPath();
      ctx.arc(TARGET_DESTINATION.x, TARGET_DESTINATION.y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing Target Ring
      const pulseSize = 10 + Math.sin(Date.now() / 250) * 3;
      ctx.beginPath();
      ctx.arc(TARGET_DESTINATION.x, TARGET_DESTINATION.y, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Target Badge Label
      const targetLabel = `TARGET: ${TARGET_DESTINATION.name.toUpperCase()}`;
      ctx.font = 'bold 8.5px monospace';
      const tMetrics = ctx.measureText(targetLabel);
      const tW = tMetrics.width + 12;
      const tH = 15;
      const tX = TARGET_DESTINATION.x - tW / 2;
      const tY = TARGET_DESTINATION.y - 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.fillRect(tX, tY, tW, tH);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.strokeRect(tX, tY, tW, tH);
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText(targetLabel, TARGET_DESTINATION.x, tY + 11);
      ctx.restore();
    }

    // 6. Real Historical Breadcrumb Trail
    if (trail.length > 1) {
      ctx.save();
      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. Rover 2D Icon, Forward LiDAR Cone & Heading
    ctx.save();
    const rx = telemetry.position.x;
    const ry = telemetry.position.y;
    const headingRad = (telemetry.heading * Math.PI) / 180;

    // 7a. LiDAR Field-of-View Cone
    if (showLidar) {
      const lidarDist = 65;
      const fov = (Math.PI / 180) * 60;
      const lidarGrad = ctx.createRadialGradient(rx, ry, 5, rx, ry, lidarDist);
      lidarGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      lidarGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // 7b. Dynamic Rover Chassis Marker
    ctx.translate(rx, ry);
    ctx.rotate(headingRad);

    // Subtle Ping Halo
    const haloRadius = 14 + Math.sin(Date.now() / 200) * 3;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.strokeStyle = telemetry.isStuck ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rover Body Rectangle (Crisp Minimal Silver)
    ctx.fillStyle = telemetry.isStuck ? '#ef4444' : '#ffffff';
    ctx.fillRect(-7, -11, 14, 22);

    // 6 Wheels on canvas
    ctx.fillStyle = '#71717a';
    [-10, 7].forEach((wx) => {
      [-9, 0, 9].forEach((wy) => {
        ctx.fillRect(wx, wy - 3, 3, 6);
      });
    });

    // Heading Arrow on Nose
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(-3, -11);
    ctx.lineTo(3, -11);
    ctx.closePath();
    ctx.fillStyle = '#18181b';
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
    <div className="rounded-2xl aegis-card p-3 flex flex-col h-full relative overflow-hidden border border-white/[0.08]">
      {/* Top Map Toolbar Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] flex-wrap gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="editorial-num">02.</span>
          <h3 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
            Jezero Crater Sector 4 — 2D Tactical Surface Map
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/10 font-semibold">
            DEM 1.5m/px
          </span>
        </div>

        {/* Tactical Map Controls */}
        <div className="flex items-center gap-1.5 font-mono">
          <button
            onClick={() => {
              soundFX.playClick();
              setShowContours(!showContours);
            }}
            className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-all ${
              showContours
                ? 'bg-zinc-100 text-black border-zinc-100 font-bold'
                : 'bg-zinc-900/80 text-zinc-400 border-white/10 hover:text-zinc-200'
            }`}
            title="Toggle Topographic Contours"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Contours</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setShowWaypoints(!showWaypoints);
            }}
            className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-all ${
              showWaypoints
                ? 'bg-zinc-100 text-black border-zinc-100 font-bold'
                : 'bg-zinc-900/80 text-zinc-400 border-white/10 hover:text-zinc-200'
            }`}
            title="Toggle Waypoint Flight Route"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Route</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setZoom((z) => Math.min(2.5, z + 0.2));
            }}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setZoom((z) => Math.max(0.6, z - 0.2));
            }}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={recenterRover}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/20 transition-all"
            title="Recenter Rover on Map"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tactical Canvas */}
      <div className="relative flex-1 bg-[#060609] cursor-crosshair overflow-hidden rounded-xl border border-white/[0.08] min-h-[220px]">
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
        <div className="absolute bottom-3 left-3 pointer-events-none bg-[#0c0c11]/90 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-zinc-300 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span>
              Pos:{' '}
              <strong className="text-zinc-100 font-bold">
                {telemetry.position.x}, {telemetry.position.y}
              </strong>
            </span>
            <span>
              Hdg: <strong className="text-zinc-100">{telemetry.heading}°</strong>
            </span>
            <span>
              Terr:{' '}
              <strong className="text-zinc-300">
                {telemetry.currentTerrain.replace('_', ' ')}
              </strong>
            </span>
            <span>
              Slope:{' '}
              <strong
                className={telemetry.slopeAngle > 18 ? 'text-red-400 font-bold' : 'text-zinc-200'}
              >
                {telemetry.slopeAngle}°
              </strong>
            </span>
          </div>
        </div>

        {/* Interactive Click Point Inspection Card */}
        {selectedLocation && (
          <div className="absolute top-3 right-3 bg-[#0c0c11]/95 border border-white/15 rounded-xl p-3 font-mono text-xs text-zinc-200 shadow-2xl backdrop-blur-xl max-w-xs z-20">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
              <span className="text-zinc-200 font-bold uppercase tracking-wider text-[11px]">Terrain Inspection</span>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10"
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
              <span className="text-zinc-400">DEM Coords:</span>
              <span className="text-white font-bold">
                {selectedLocation.x}, {selectedLocation.y}
              </span>
              <span className="text-zinc-400">Surface:</span>
              <span className="truncate text-zinc-300">
                {selectedLocation.type.replace('_', ' ')}
              </span>
              <span className="text-zinc-400">Slope:</span>
              <span className={selectedLocation.slope > 20 ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                {selectedLocation.slope}°
              </span>
              <span className="text-zinc-400">Roughness:</span>
              <span className="text-zinc-300">{selectedLocation.roughness}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/70 border-t border-white/[0.06] text-[10px] font-mono text-zinc-400 overflow-x-auto gap-4 mt-2.5 rounded-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-white" />
          <span>Rover & Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span>Hazard Area</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-zinc-400" />
          <span>Safe Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Science Target</span>
        </div>
      </div>
    </div>
  );
};

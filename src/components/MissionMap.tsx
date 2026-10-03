import React, { useEffect, useRef, useState } from 'react';
import { RoverTelemetry } from '../types/telemetry';
import {
  MAP_DIMENSIONS,
  MAP_ZONES,
  MapHazardZone,
  MISSION_WAYPOINTS,
  sampleTerrainAt,
  START_POSITION,
  TARGET_DESTINATION,
} from '../simulation/terrainMap';
import { Crosshair, Eye, Layers, Maximize2, Minimize2, Navigation, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [selectedLocation, setSelectedLocation] = useState<{
    x: number;
    y: number;
    slope: number;
    roughness: number;
    type: string;
    zoneName?: string;
  } | null>(null);

  // Radar sweep angle
  const radarAngleRef = useRef(0);

  // Animation frame loop for radar sweep & smooth canvas rendering
  useEffect(() => {
    let animId: number;

    const render = () => {
      radarAngleRef.current = (radarAngleRef.current + 0.04) % (Math.PI * 2);
      drawMap();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [telemetry, trail, zoom, pan, showContours, showWaypoints, activeScenarioId]);

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

    // 1. Background Mars Terrain
    const bgGradient = ctx.createLinearGradient(0, 0, MAP_DIMENSIONS.width, MAP_DIMENSIONS.height);
    bgGradient.addColorStop(0, '#10141f');
    bgGradient.addColorStop(0.5, '#131826');
    bgGradient.addColorStop(1, '#0e121c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, MAP_DIMENSIONS.width, MAP_DIMENSIONS.height);

    // 2. Coordinate Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < MAP_DIMENSIONS.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_DIMENSIONS.height);
      ctx.stroke();
    }
    for (let y = 0; y < MAP_DIMENSIONS.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_DIMENSIONS.width, y);
      ctx.stroke();
    }

    // 3. Topographic Elevation Contour Lines
    if (showContours) {
      ctx.strokeStyle = 'rgba(220, 100, 50, 0.12)';
      ctx.lineWidth = 1.2;

      // Draw elevation rings
      for (let r = 80; r < 500; r += 70) {
        ctx.beginPath();
        ctx.ellipse(360, 240, r, r * 0.65, 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let r = 50; r < 350; r += 50) {
        ctx.beginPath();
        ctx.ellipse(600, 180, r, r * 0.75, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Map Hazard & Safe Zones
    MAP_ZONES.forEach((zone) => {
      const isDangerous = zone.severity === 'DANGER';
      const isSafe = zone.severity === 'SAFE';

      // Highlight if active scenario matches
      const isForcedActive =
        (zone.type === 'CRATER_SLOPE' && activeScenarioId === 'HAZARDOUS_TERRAIN') ||
        (zone.type === 'LOOSE_SAND_DUNE' && activeScenarioId === 'ROVER_STUCK') ||
        (zone.type === 'COMM_SHADOW_CANYON' && activeScenarioId === 'COMM_LOSS');

      ctx.save();

      // Radial Fill
      const radGrad = ctx.createRadialGradient(zone.x, zone.y, 5, zone.x, zone.y, zone.radius);
      if (isSafe) {
        radGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        radGrad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
      } else if (isDangerous || isForcedActive) {
        radGrad.addColorStop(0, isForcedActive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.18)');
        radGrad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
      } else {
        radGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
        radGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
      }

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();

      // Zone Boundary
      ctx.lineWidth = isForcedActive ? 2.5 : 1.2;
      ctx.setLineDash(isSafe ? [4, 4] : [6, 3]);
      ctx.strokeStyle = isSafe
        ? 'rgba(52, 211, 153, 0.6)'
        : isDangerous || isForcedActive
        ? 'rgba(248, 113, 113, 0.8)'
        : 'rgba(251, 191, 36, 0.6)';
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = isSafe ? '#6ee7b7' : isDangerous ? '#fca5a5' : '#fde68a';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(zone.name, zone.x, zone.y - zone.radius - 6);

      ctx.restore();
    });

    // 5. Planned Waypoints & Trajectory Path
    if (showWaypoints) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      MISSION_WAYPOINTS.forEach((wp, idx) => {
        if (idx === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoint Markers
      MISSION_WAYPOINTS.forEach((wp) => {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(wp.id, wp.x, wp.y + 14);
      });
    }

    // 6. Historical Rover Breadcrumb Trail
    if (trail.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const alpha = Math.min(1, i / trail.length);

        ctx.strokeStyle =
          telemetry.wheelSlipAverage > 0.5 || telemetry.isStuck
            ? `rgba(239, 68, 68, ${alpha})`
            : `rgba(0, 229, 255, ${alpha * 0.75})`;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 7. Start Point & Science Destination
    // Start Platform
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(START_POSITION.x - 7, START_POSITION.y - 7, 14, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LANDER', START_POSITION.x, START_POSITION.y + 16);

    // Target Destination (Pulsing Flag)
    const pulse = 1 + 0.15 * Math.sin(Date.now() * 0.005);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(TARGET_DESTINATION.x, TARGET_DESTINATION.y, 16 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(TARGET_DESTINATION.x, TARGET_DESTINATION.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET: DELTA CLAY', TARGET_DESTINATION.x, TARGET_DESTINATION.y - 12);

    // 8. Rover Visual & LiDAR Sweep
    const rx = telemetry.position.x;
    const ry = telemetry.position.y;
    const rHeadingRad = (telemetry.heading * Math.PI) / 180;

    // LiDAR Field-of-View Sweep Arc
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rHeadingRad);

    const fovRadius = 55;
    const fovAngle = (50 * Math.PI) / 180;
    const fovGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, fovRadius);
    fovGrad.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
    fovGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

    ctx.fillStyle = fovGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, fovRadius, -fovAngle / 2, fovAngle / 2);
    ctx.closePath();
    ctx.fill();

    // Radar beam line
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(radarAngleRef.current) * fovRadius * 0.8, Math.sin(radarAngleRef.current) * fovRadius * 0.8);
    ctx.stroke();

    // Rover Body (Chassis representation)
    const isStuck = telemetry.isStuck;
    ctx.fillStyle = isStuck ? '#ef4444' : '#00e5ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Directional Arrow Triangle
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wheels on chassis
    ctx.fillStyle = '#334155';
    [-6, 0, 6].forEach((wx) => {
      ctx.fillRect(wx - 2, -9, 4, 3);
      ctx.fillRect(wx - 2, 6, 4, 3);
    });

    ctx.restore();

    // Ping Ring around Rover
    ctx.strokeStyle = isStuck ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rx, ry, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Telemetry Rover Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isStuck ? 'ROVER: STUCK' : `AEGIS-1 [${telemetry.speed.toFixed(2)}m/s]`,
      rx,
      ry + 26
    );

    // 9. Selected Coordinate Crosshair
    if (selectedLocation) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      const sx = selectedLocation.x;
      const sy = selectedLocation.y;
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.moveTo(sx - 12, sy);
      ctx.lineTo(sx + 12, sy);
      ctx.moveTo(sx, sy - 12);
      ctx.lineTo(sx, sy + 12);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Map Click Handler for Terrain Inspection
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    const sample = sampleTerrainAt(clickX, clickY);
    setSelectedLocation({
      x: Math.round(clickX),
      y: Math.round(clickY),
      slope: Number(sample.slope.toFixed(1)),
      roughness: Number(sample.roughness.toFixed(2)),
      type: sample.type,
      zoneName: sample.zone?.name,
    });

    if (sample.zone && onZoneSelect) {
      onZoneSelect(sample.zone);
    }
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const recenterRover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    setPan({
      x: cx - telemetry.position.x * zoom,
      y: cy - telemetry.position.y * zoom,
    });
  };

  return (
    <div className="relative rounded-xl border border-white/10 bg-[#0a0e18] overflow-hidden flex flex-col h-full shadow-lg">
      {/* Top Map Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0d121d] border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            JEZERO CRATER SECTOR 4 — 2D TACTICAL SURFACE MAP
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
            DEM 1.5m/px
          </span>
        </div>

        {/* Map Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowContours(!showContours)}
            className={`px-2 py-1 text-[11px] font-mono rounded flex items-center gap-1 transition-all ${
              showContours ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-slate-400'
            }`}
            title="Toggle Topographic Contours"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Contours</span>
          </button>

          <button
            onClick={() => setShowWaypoints(!showWaypoints)}
            className={`px-2 py-1 text-[11px] font-mono rounded flex items-center gap-1 transition-all ${
              showWaypoints ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-slate-400'
            }`}
            title="Toggle Waypoint Path"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Route</span>
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={recenterRover}
            className="p-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all"
            title="Recenter Rover"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 bg-[#090c14] cursor-crosshair overflow-hidden min-h-[360px]">
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

        {/* Floating Telemetry Coordinates Overlay */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-[#0d121d]/90 border border-white/10 rounded-lg p-2 font-mono text-[11px] text-slate-300 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span>POS: <strong className="text-cyan-400">{telemetry.position.x}, {telemetry.position.y}</strong></span>
            <span>HDG: <strong className="text-white">{telemetry.heading}°</strong></span>
            <span>TERR: <strong className="text-amber-400">{telemetry.currentTerrain.replace('_', ' ')}</strong></span>
            <span>SLOPE: <strong className="text-red-400">{telemetry.slopeAngle}°</strong></span>
          </div>
        </div>

        {/* Selected Point Inspection Tooltip */}
        {selectedLocation && (
          <div className="absolute top-2 right-2 bg-[#0d121d]/95 border border-cyan-500/40 rounded-lg p-2.5 font-mono text-xs text-slate-200 shadow-xl backdrop-blur-md max-w-xs z-20">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/10">
              <span className="text-cyan-400 font-bold">TERRAIN INSPECTION</span>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            {selectedLocation.zoneName && (
              <div className="text-amber-300 font-semibold mb-1">{selectedLocation.zoneName}</div>
            )}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
              <span className="text-slate-400">Coords:</span>
              <span>{selectedLocation.x}, {selectedLocation.y}</span>
              <span className="text-slate-400">Type:</span>
              <span className="truncate">{selectedLocation.type}</span>
              <span className="text-slate-400">Slope:</span>
              <span className={selectedLocation.slope > 20 ? 'text-red-400 font-bold' : ''}>
                {selectedLocation.slope}°
              </span>
              <span className="text-slate-400">Roughness:</span>
              <span>{selectedLocation.roughness}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0d16] border-t border-white/5 text-[10px] font-mono text-slate-400 overflow-x-auto gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Rover & Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Crater Scarp / Sand Sea (Hazard)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Solar Recharge Safe Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span>Science Destination</span>
        </div>
      </div>
    </div>
  );
};

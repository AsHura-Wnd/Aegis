import { TerrainType } from '../types/telemetry';

export interface MapHazardZone {
  id: string;
  name: string;
  type: TerrainType;
  x: number;
  y: number;
  radius: number;
  severity: 'WARNING' | 'DANGER' | 'SAFE';
  slope: number;
  roughness: number;
  slipRisk: number; // 0 to 1
  commAttenuationDb: number;
  description: string;
}

export interface MapWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  order: number;
  description: string;
}

export const MAP_DIMENSIONS = {
  width: 800,
  height: 500,
  scaleMetersPerPixel: 1.5, // 1200m x 750m sector
};

export const START_POSITION = {
  x: 70,
  y: 430,
  name: 'Base Site: Octavia E. Butler Landing',
};

export const TARGET_DESTINATION = {
  x: 720,
  y: 80,
  name: 'Target Science: Jezero Delta Clay Strata',
  radius: 35,
};

export const MISSION_WAYPOINTS: MapWaypoint[] = [
  { id: 'WP-0', name: 'Start Depo', x: 70, y: 430, order: 0, description: 'Egress from lander touchdown platform' },
  { id: 'WP-1', name: 'Solis Ridge Turn', x: 200, y: 380, order: 1, description: 'Ascend basalt ridge on firm regolith' },
  { id: 'WP-2', name: 'Mid-Valley Crossing', x: 380, y: 320, order: 2, description: 'Traverse between Belva Crater and South Dune Field' },
  { id: 'WP-3', name: 'Relay Crest', x: 490, y: 220, order: 3, description: 'Elevated vantage with direct line-of-sight to MRO' },
  { id: 'WP-4', name: 'Delta Gateway', x: 610, y: 150, order: 4, description: 'Enter protected sedimentary alluvial fan' },
  { id: 'WP-5', name: 'Science Primary Site', x: 720, y: 80, order: 5, description: 'Final scientific drilling and sample caching' },
];

export const MAP_ZONES: MapHazardZone[] = [
  // Dangerous Terrains
  {
    id: 'ZONE-CRATER',
    name: 'Belva Crater Rim Scarps',
    type: 'CRATER_SLOPE',
    x: 340,
    y: 220,
    radius: 65,
    severity: 'DANGER',
    slope: 26.5,
    roughness: 0.85,
    slipRisk: 0.65,
    commAttenuationDb: 8,
    description: 'Steep scree slope with 26° incline; high rollover and slide hazard.',
  },
  {
    id: 'ZONE-DUNES',
    name: 'Neretva Sand Sea',
    type: 'LOOSE_SAND_DUNE',
    x: 510,
    y: 350,
    radius: 60,
    severity: 'DANGER',
    slope: 12.0,
    roughness: 0.4,
    slipRisk: 0.88,
    commAttenuationDb: 0,
    description: 'Deep uncompacted drift sand dunes; critical wheel sinkage risk.',
  },
  {
    id: 'ZONE-BOULDERS',
    name: 'Thor Boulder Cluster',
    type: 'ROCKY_BEDROCK',
    x: 210,
    y: 170,
    radius: 50,
    severity: 'WARNING',
    slope: 8.0,
    roughness: 0.95,
    slipRisk: 0.3,
    commAttenuationDb: 4,
    description: 'Jagged basaltic rock outcrop; chassis undercarriage collision risk.',
  },
  {
    id: 'ZONE-CANYON',
    name: 'Kodiak Shadow Gorge',
    type: 'COMM_SHADOW_CANYON',
    x: 300,
    y: 80,
    radius: 45,
    severity: 'WARNING',
    slope: 16.0,
    roughness: 0.7,
    slipRisk: 0.45,
    commAttenuationDb: 28,
    description: 'Deep canyon walls attenuate ultra-high frequency orbiter downlink.',
  },

  // Safe & Recharge Zones
  {
    id: 'ZONE-RECHARGE-1',
    name: 'Solis Plateau Solar Haven',
    type: 'RECHARGE_PLATEAU',
    x: 230,
    y: 340,
    radius: 42,
    severity: 'SAFE',
    slope: 1.5,
    roughness: 0.15,
    slipRisk: 0.08,
    commAttenuationDb: 0,
    description: 'Optimal flat exposure; 100% solar irradiance reception.',
  },
  {
    id: 'ZONE-RECHARGE-2',
    name: 'Delta Flats Safe Park',
    type: 'RECHARGE_PLATEAU',
    x: 650,
    y: 130,
    radius: 40,
    severity: 'SAFE',
    slope: 2.0,
    roughness: 0.2,
    slipRisk: 0.1,
    commAttenuationDb: 0,
    description: 'Firm compacted sediment; excellent thermal and solar profile.',
  },
];

export interface TerrainSample {
  type: TerrainType;
  slope: number;
  roughness: number;
  slipMultiplier: number;
  solarFactor: number;
  commAttenuation: number;
  zone?: MapHazardZone;
}

export function sampleTerrainAt(x: number, y: number): TerrainSample {
  // Check overlapping zones
  for (const zone of MAP_ZONES) {
    const dx = x - zone.x;
    const dy = y - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= zone.radius) {
      const proximity = 1 - dist / zone.radius; // 1 at center, 0 at edge
      return {
        type: zone.type,
        slope: zone.slope * (0.5 + 0.5 * proximity),
        roughness: zone.roughness,
        slipMultiplier: 1.0 + (zone.slipRisk * 2.5 * proximity),
        solarFactor: zone.type === 'RECHARGE_PLATEAU' ? 1.25 : 1.0,
        commAttenuation: zone.commAttenuationDb * proximity,
        zone,
      };
    }
  }

  // Baseline regolith terrain
  // Subtle natural undulating noise based on coordinate sinusoids
  const naturalSlope = 3.5 + Math.sin(x * 0.02) * 2.5 + Math.cos(y * 0.025) * 2.0;
  const naturalRoughness = 0.25 + 0.1 * Math.sin(x * 0.05 + y * 0.03);

  return {
    type: 'NORMAL_REGOLITH',
    slope: Math.max(1.0, naturalSlope),
    roughness: Math.max(0.15, naturalRoughness),
    slipMultiplier: 1.0,
    solarFactor: 1.0,
    commAttenuation: 0,
  };
}

export function findNearestRechargeZone(x: number, y: number): MapHazardZone {
  const rechargeZones = MAP_ZONES.filter((z) => z.type === 'RECHARGE_PLATEAU');
  let closest = rechargeZones[0];
  let minDist = Infinity;
  for (const z of rechargeZones) {
    const dist = Math.hypot(x - z.x, y - z.y);
    if (dist < minDist) {
      minDist = dist;
      closest = z;
    }
  }
  return closest;
}

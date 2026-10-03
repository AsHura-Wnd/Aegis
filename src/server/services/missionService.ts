import { MissionInstance, MissionMetadata } from '../models/missionInstance';

export class MissionService {
  private missions: Map<string, MissionInstance> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize default primary mission
    this.createMission('Jezero Primary Exploration', 1337, 'primary-mission');
  }

  public createMission(name?: string, seed: number = 1337, specificId?: string): MissionInstance {
    const id = specificId || `mission-${this.nextId++}`;
    const missionName = name || `Mars Traverse ${id}`;

    // If already exists with this ID, clean up old
    if (this.missions.has(id)) {
      this.missions.get(id)?.cleanup();
    }

    const instance = new MissionInstance(id, missionName, seed);
    this.missions.set(id, instance);
    return instance;
  }

  public getMission(id: string): MissionInstance | undefined {
    return this.missions.get(id);
  }

  public listMissions(): MissionMetadata[] {
    return Array.from(this.missions.values()).map((m) => m.getMetadata());
  }

  public deleteMission(id: string): boolean {
    const mission = this.missions.get(id);
    if (!mission) return false;

    mission.cleanup();
    return this.missions.delete(id);
  }

  public getOrCreateDefaultMission(): MissionInstance {
    let def = this.getMission('primary-mission');
    if (!def) {
      def = this.createMission('Jezero Primary Exploration', 1337, 'primary-mission');
    }
    return def;
  }

  public cleanupAll(): void {
    for (const mission of this.missions.values()) {
      mission.cleanup();
    }
    this.missions.clear();
  }
}

// Global singleton instance for the server
export const missionService = new MissionService();

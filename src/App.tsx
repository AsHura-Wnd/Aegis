import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveHazardsPanel } from './components/ActiveHazardsPanel';
import { AIAssistant } from './components/AIAssistant';
import { BaselineComparisonModal } from './components/BaselineComparisonModal';
import { DecisionLog } from './components/DecisionLog';
import { HazardMatrixModal } from './components/HazardMatrixModal';
import { Header } from './components/Header';
import { MissionMap } from './components/MissionMap';
import { RiskBanner } from './components/RiskBanner';
import { ScenarioController } from './components/ScenarioController';
import { TelemetryAnalyticsView } from './components/TelemetryAnalyticsView';
import { TelemetryCards } from './components/TelemetryCards';
import { AegisAIAssistant } from './engines/aiAssistantEngine';
import { AutonomousDecision, AutonomousDecisionEngine } from './engines/decisionEngine';
import { HazardDetectionEngine } from './engines/hazardEngine';
import { DynamicRiskEngine } from './engines/riskEngine';
import { RoverSimulationModel } from './simulation/roverModel';
import { SCENARIO_CATALOG } from './simulation/scenarioDefinitions';
import { DetectedHazard, HazardType } from './types/hazard';
import { LogEntry } from './types/log';
import { RiskAssessment } from './types/risk';
import { ScenarioId } from './types/scenario';
import { RoverTelemetry, TelemetryHistoryPoint } from './types/telemetry';
import { apiClient } from './services/apiClient';
import { soundFX } from './utils/audio';

export function App() {
  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MAP' | 'TELEMETRY' | 'ASSISTANT' | 'LOGS'>('DASHBOARD');
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  // Backend Integration State
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [activeMissionId, setActiveMissionId] = useState<string>('primary-mission');
  const [availableMissions, setAvailableMissions] = useState<Array<{ id: string; name: string }>>([
    { id: 'primary-mission', name: 'Jezero Primary Exploration' },
  ]);
  const [backendTrail, setBackendTrail] = useState<Array<{ x: number; y: number; tick: number }>>([]);

  // Simulation Core Engines (persistent singletons within lifecycle & local fallback)
  const simModelRef = useRef<RoverSimulationModel>(new RoverSimulationModel(1337));
  const hazardEngineRef = useRef<HazardDetectionEngine>(new HazardDetectionEngine());
  const riskEngineRef = useRef<DynamicRiskEngine>(new DynamicRiskEngine());
  const decisionEngineRef = useRef<AutonomousDecisionEngine>(new AutonomousDecisionEngine());
  const assistantRef = useRef<AegisAIAssistant>(
    new AegisAIAssistant(localStorage.getItem('aegis_gemini_key') || '')
  );

  // Active Simulation Runtime State
  const [isRunning, setIsRunning] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId | null>(null);
  const [seed, setSeed] = useState(1337);

  // Current Evaluated Telemetry State
  const [telemetry, setTelemetry] = useState<RoverTelemetry>(() => simModelRef.current.step(0));
  const [activeHazards, setActiveHazards] = useState<DetectedHazard[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>(() =>
    riskEngineRef.current.calculateRisk(telemetry, [])
  );
  const [recentDecision, setRecentDecision] = useState<AutonomousDecision | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistoryPoint[]>([]);

  // Synchronize mission state from backend
  const syncFromBackend = useCallback(async (missionId: string) => {
    try {
      const [telemRes, hazardsRes, riskRes, decisionsRes] = await Promise.all([
        apiClient.getTelemetry(missionId),
        apiClient.getHazards(missionId),
        apiClient.getRisk(missionId),
        apiClient.getDecisions(missionId),
      ]);

      if (telemRes && telemRes.current) {
        setTelemetry(telemRes.current);
        if (telemRes.history && telemRes.history.length > 0) {
          setTelemetryHistory(telemRes.history.slice(-60));
        }
        if (telemRes.trail) {
          setBackendTrail(telemRes.trail);
        }
      }
      if (hazardsRes && hazardsRes.active) {
        setActiveHazards(hazardsRes.active);
      }
      if (riskRes) {
        setRiskAssessment(riskRes);
      }
      if (decisionsRes) {
        if (decisionsRes.recent) {
          setRecentDecision(decisionsRes.recent);
        }
        if (decisionsRes.logs && decisionsRes.logs.length > 0) {
          setLogs(decisionsRes.logs.slice(0, 200));
        }
      }
      setBackendConnected(true);
    } catch {
      setBackendConnected(false);
    }
  }, []);

  // Periodic Backend Health Check & Mission Discovery
  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      try {
        const health = await apiClient.checkHealth();
        if (!isMounted) return;
        if (health) {
          setBackendConnected(true);
          const missions = await apiClient.listMissions();
          if (isMounted && missions && missions.length > 0) {
            setAvailableMissions(missions.map((m) => ({ id: m.id, name: m.name })));
          }
        } else {
          setBackendConnected(false);
        }
      } catch {
        if (isMounted) setBackendConnected(false);
      }
    };

    checkConnection();
    const timer = setInterval(checkConnection, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Simulation Tick Execution (Backend-synced or Local Fallback)
  const tickSimulation = useCallback(async () => {
    if (backendConnected) {
      try {
        await apiClient.stepMission(activeMissionId, 1);
        await syncFromBackend(activeMissionId);
        return;
      } catch {
        setBackendConnected(false);
      }
    }

    const sim = simModelRef.current;
    const hazardEng = hazardEngineRef.current;
    const riskEng = riskEngineRef.current;
    const decisionEng = decisionEngineRef.current;

    // 1. Advance Rover Physics Step
    const nextTelemetry = sim.step(1.0);

    // 2. Evaluate all 9 Hazard Vectors
    const hazards = hazardEng.evaluate(nextTelemetry);

    // 3. Dynamic Compounding Risk Assessment
    const risk = riskEng.calculateRisk(nextTelemetry, hazards);

    // 4. Autonomous Decision & Mode Executive
    const { newLogs, decision, modeOverride } = decisionEng.evaluateDecisions(
      nextTelemetry,
      hazards,
      risk
    );

    if (modeOverride) {
      sim.setOperationalMode(modeOverride);
      nextTelemetry.operationalMode = modeOverride;
    }

    // 5. Update State
    setTelemetry(nextTelemetry);
    setActiveHazards(hazards);
    setRiskAssessment(risk);

    if (decision) {
      setRecentDecision(decision);
    }

    if (newLogs.length > 0) {
      setLogs((prev) => [...newLogs, ...prev].slice(0, 200));
    }

    // 6. Update History Sparkline Buffer
    setTelemetryHistory((prev) => [
      ...prev,
      {
        tick: nextTelemetry.tick,
        timestamp: nextTelemetry.formattedTime,
        battery: nextTelemetry.batteryLevel,
        temperature: nextTelemetry.motorAverageTemp,
        solar: nextTelemetry.solarEfficiency,
        signal: nextTelemetry.signalStrengthDbm,
        speed: nextTelemetry.speed,
        power: nextTelemetry.powerConsumptionWatts,
        wheelSlip: nextTelemetry.wheelSlipAverage,
        riskScore: risk.currentScore,
      },
    ].slice(-60));
  }, [backendConnected, activeMissionId, syncFromBackend]);

  // Interval Loop for Continuous Telemetry
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.max(150, 1000 / speedMultiplier);
    const timer = setInterval(() => {
      tickSimulation();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speedMultiplier, tickSimulation]);

  // Mission Switching Handler
  const handleSelectMission = async (missionId: string) => {
    setActiveMissionId(missionId);
    if (backendConnected) {
      await syncFromBackend(missionId);
    }
  };

  // Toggle Running Play/Pause
  const handleTogglePlay = async () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    if (backendConnected) {
      try {
        if (nextState) {
          await apiClient.startMission(activeMissionId, speedMultiplier);
        } else {
          await apiClient.pauseMission(activeMissionId);
        }
      } catch {
        // Fallback gracefully
      }
    }
  };

  // Scenario Injection Handler
  const handleInjectScenario = (scenarioId: ScenarioId) => {
    setActiveScenarioId(scenarioId);
    const sim = simModelRef.current;
    const scenarioDef = SCENARIO_CATALOG[scenarioId];

    // Log Scenario Injection Event
    const scLog: LogEntry = {
      id: `SCENARIO-${scenarioId}-${Date.now()}`,
      tick: telemetry.tick,
      time: telemetry.formattedTime,
      timestamp: Date.now(),
      category: 'SCENARIO',
      severity: scenarioDef.expectedRiskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      title: `Operator Injected Scenario: ${scenarioDef.name}`,
      description: scenarioDef.fullDesc,
      recommendedAction: scenarioDef.suggestedMitigation,
      source: 'SCENARIO_INJECTOR',
    };
    setLogs((prev) => [scLog, ...prev]);

    // Apply real physics fault to rover model locally
    switch (scenarioId) {
      case 'LOW_BATTERY':
        sim.setFaults({ lowBattery: true });
        break;
      case 'ROVER_STUCK':
        sim.setFaults({ roverStuck: true });
        break;
      case 'COMM_LOSS':
        sim.setFaults({ commLoss: true });
        break;
      case 'EXTREME_TEMP':
        sim.setFaults({ extremeTemp: 'HOT' });
        break;
      case 'SOLAR_DUST':
        sim.setFaults({ solarDust: true });
        break;
      case 'HAZARDOUS_TERRAIN':
        sim.setFaults({ hazardousTerrain: true });
        break;
    }

    tickSimulation();

    // Also forward to backend if connected
    if (backendConnected) {
      apiClient.injectScenario(activeMissionId, scenarioId)
        .then(() => syncFromBackend(activeMissionId))
        .catch(() => {});
    }
  };

  // Clear Faults / Return to Nominal
  const handleClearFaults = () => {
    setActiveScenarioId(null);
    simModelRef.current.clearFaults();

    const clearLog: LogEntry = {
      id: `CLEAR-${Date.now()}`,
      tick: telemetry.tick,
      time: telemetry.formattedTime,
      timestamp: Date.now(),
      category: 'SCENARIO',
      severity: 'LOW',
      title: 'Operator Cleared All Fault Injections',
      description: 'Rover subsystems commanded back to nominal operating profiles. Standby for stabilization.',
      source: 'OPERATOR',
    };
    setLogs((prev) => [clearLog, ...prev]);
    tickSimulation();

    // Also forward to backend if connected
    if (backendConnected) {
      apiClient.clearFaults(activeMissionId)
        .then(() => syncFromBackend(activeMissionId))
        .catch(() => {});
    }
  };

  // Reset Simulation to Initial State
  const handleReset = (newSeed = 1337) => {
    setSeed(newSeed);
    simModelRef.current.reset(newSeed);
    riskEngineRef.current.reset();
    decisionEngineRef.current.reset();
    setActiveScenarioId(null);
    setTelemetryHistory([]);
    setBackendTrail([]);

    const initialTelemetry = simModelRef.current.step(0);
    setTelemetry(initialTelemetry);
    setActiveHazards([]);
    setRiskAssessment(riskEngineRef.current.calculateRisk(initialTelemetry, []));
    setRecentDecision(null);

    const resetLog: LogEntry = {
      id: `RESET-${Date.now()}`,
      tick: 0,
      time: 'MET 00:00:00',
      timestamp: Date.now(),
      category: 'SYSTEM',
      severity: 'LOW',
      title: 'Mission Simulation Reset',
      description: `AEGIS initialized at Base Depo (Seed: ${newSeed}). All subsystems nominal.`,
      source: 'SYSTEM',
    };
    setLogs([resetLog]);

    if (backendConnected) {
      apiClient.resetMission(activeMissionId, newSeed)
        .then(() => syncFromBackend(activeMissionId))
        .catch(() => {});
    }
  };

  // Replay Demo Sequence
  const handleReplay = () => {
    handleReset(seed);
    setIsRunning(true);
    if (backendConnected) {
      apiClient.replayMission(activeMissionId)
        .then(() => syncFromBackend(activeMissionId))
        .catch(() => {});
    }
  };

  // Execute Autonomous Mitigation Button
  const handleExecuteMitigation = (hazard: DetectedHazard) => {
    const sim = simModelRef.current;

    const mitLog: LogEntry = {
      id: `MIT-${hazard.id}-${Date.now()}`,
      tick: telemetry.tick,
      time: telemetry.formattedTime,
      timestamp: Date.now(),
      category: 'DECISION',
      severity: 'LOW',
      title: `Executing Mitigation: ${hazard.hazardName}`,
      description: hazard.recommendedAction,
      source: 'AUTONOMOUS_EXECUTIVE',
    };
    setLogs((prev) => [mitLog, ...prev]);

    // Perform simulated mitigation state shifts locally
    if (hazard.hazardType === 'ROVER_STUCK' || hazard.hazardType === 'WHEEL_SLIP') {
      sim.setFaults({ roverStuck: false });
      sim.setOperationalMode('AUTONOMOUS_TRANSIT');
      setActiveScenarioId(null);
    } else if (hazard.hazardType === 'LOW_BATTERY') {
      sim.setOperationalMode('RECHARGE_STANDBY');
    } else if (hazard.hazardType === 'WEAK_COMMUNICATION') {
      sim.setOperationalMode('SAFE_HOLD');
    } else if (hazard.hazardType === 'OVERHEATING') {
      sim.setFaults({ extremeTemp: null });
    } else if (hazard.hazardType === 'SOLAR_PANEL_DEGRADATION') {
      sim.setFaults({ solarDust: false });
    } else if (hazard.hazardType === 'DANGEROUS_TERRAIN') {
      sim.setFaults({ hazardousTerrain: false });
      sim.setOperationalMode('HAZARD_AVOIDANCE');
    }

    tickSimulation();

    if (backendConnected) {
      apiClient.executeMitigation(activeMissionId, hazard.hazardType)
        .then(() => syncFromBackend(activeMissionId))
        .catch(() => {});
    }
  };

  // Toggle Rule Status in Matrix
  const handleToggleRule = (type: HazardType) => {
    const current = hazardEngineRef.current.getConfigs()[type];
    const newEnabled = !current.enabled;
    hazardEngineRef.current.updateConfig(type, { enabled: newEnabled });
    tickSimulation();

    if (backendConnected) {
      apiClient.updateHazardConfig(activeMissionId, type, { enabled: newEnabled }).catch(() => {});
    }
  };

  const handleTabChange = (tab: 'DASHBOARD' | 'MAP' | 'TELEMETRY' | 'ASSISTANT' | 'LOGS') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'instant' });
      } catch {
        // Safe fallback in test environments
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#04060b] bg-space-dark text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Flight Control Deck Top Header Bar */}
      <Header
        telemetry={telemetry}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenMatrix={() => setIsMatrixOpen(true)}
        seed={seed}
        backendConnected={backendConnected}
        activeMissionId={activeMissionId}
        availableMissions={availableMissions}
        onSelectMission={handleSelectMission}
      />

      {/* Main Mission Operations Center Content Area */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 py-4 space-y-4">
        {/* Dynamic Compounding Risk Assessment Banner (Global across views for mission flight safety) */}
        <RiskBanner risk={riskAssessment} activeHazardCount={activeHazards.length} />

        {/* Tab 1: DASHBOARD (Main Flight Operations Console) */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-4">
            {/* Live Subsystem Telemetry Cards & Blueprint */}
            <TelemetryCards telemetry={telemetry} history={telemetryHistory} />

            {/* Tactical Reconnaissance Map & Real-Time Hazard/Decision Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Tactical Surface Map (7 Columns) */}
              <div className="lg:col-span-7 h-[440px]">
                <MissionMap
                  telemetry={telemetry}
                  trail={backendTrail.length > 0 ? backendTrail : simModelRef.current.getTrail()}
                  activeScenarioId={activeScenarioId}
                />
              </div>

              {/* Active 9-Vector Hazards Panel & Real-Time Decision Stream (5 Columns) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="flex-1 min-h-[220px]">
                  <ActiveHazardsPanel
                    hazards={activeHazards}
                    onExecuteMitigation={handleExecuteMitigation}
                    onOpenMatrix={() => setIsMatrixOpen(true)}
                  />
                </div>
                <div className="flex-1 min-h-[200px]">
                  <DecisionLog
                    logs={logs}
                    recentDecision={recentDecision}
                    onClearLogs={() => setLogs([])}
                  />
                </div>
              </div>
            </div>

            {/* Scenario Simulator & Anomaly Injection Matrix */}
            <ScenarioController
              isRunning={isRunning}
              onTogglePlay={handleTogglePlay}
              onStep={tickSimulation}
              onReset={() => handleReset(seed)}
              onReplay={handleReplay}
              speedMultiplier={speedMultiplier}
              onSpeedChange={setSpeedMultiplier}
              activeScenarioId={activeScenarioId}
              onInjectScenario={handleInjectScenario}
              onClearFaults={handleClearFaults}
            />
          </div>
        )}

        {/* Tab 2: MAP (Expanded Tactical Reconnaissance Map) */}
        {activeTab === 'MAP' && (
          <div className="space-y-4">
            <div className="h-[640px]">
              <MissionMap
                telemetry={telemetry}
                trail={backendTrail.length > 0 ? backendTrail : simModelRef.current.getTrail()}
                activeScenarioId={activeScenarioId}
              />
            </div>
            <ScenarioController
              isRunning={isRunning}
              onTogglePlay={handleTogglePlay}
              onStep={tickSimulation}
              onReset={() => handleReset(seed)}
              onReplay={handleReplay}
              speedMultiplier={speedMultiplier}
              onSpeedChange={setSpeedMultiplier}
              activeScenarioId={activeScenarioId}
              onInjectScenario={handleInjectScenario}
              onClearFaults={handleClearFaults}
            />
          </div>
        )}

        {/* Tab 3: TELEMETRY (Detailed Multi-Axis Analytics) */}
        {activeTab === 'TELEMETRY' && (
          <TelemetryAnalyticsView telemetry={telemetry} history={telemetryHistory} />
        )}

        {/* Tab 4: ASSISTANT (Dedicated AEGIS-Core Flight AI Console) */}
        {activeTab === 'ASSISTANT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 min-h-[600px]">
              <AIAssistant
                telemetry={telemetry}
                activeHazards={activeHazards}
                risk={riskAssessment}
                assistant={assistantRef.current}
                activeMissionId={activeMissionId}
              />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <ActiveHazardsPanel
                hazards={activeHazards}
                onExecuteMitigation={handleExecuteMitigation}
                onOpenMatrix={() => setIsMatrixOpen(true)}
              />
              <DecisionLog
                logs={logs}
                recentDecision={recentDecision}
                onClearLogs={() => setLogs([])}
              />
            </div>
          </div>
        )}

        {/* Tab 5: LOGS (Full Decision Stream View) */}
        {activeTab === 'LOGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 min-h-[600px]">
              <DecisionLog
                logs={logs}
                recentDecision={recentDecision}
                onClearLogs={() => setLogs([])}
              />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <ActiveHazardsPanel
                hazards={activeHazards}
                onExecuteMitigation={handleExecuteMitigation}
                onOpenMatrix={() => setIsMatrixOpen(true)}
              />
              <ScenarioController
                isRunning={isRunning}
                onTogglePlay={handleTogglePlay}
                onStep={tickSimulation}
                onReset={() => handleReset(seed)}
                onReplay={handleReplay}
                speedMultiplier={speedMultiplier}
                onSpeedChange={setSpeedMultiplier}
                activeScenarioId={activeScenarioId}
                onInjectScenario={handleInjectScenario}
                onClearFaults={handleClearFaults}
              />
            </div>
          </div>
        )}
      </main>

      {/* Flight Control Deck Status Footer */}
      <footer className="border-t border-white/5 bg-[#03050a] py-2.5 px-4 text-[11px] font-space text-slate-500">
        <div className="max-w-[1480px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span className="text-slate-400 font-semibold">AEGIS Flight System Integrity: 100% Nominal</span>
            <span className="text-slate-700">|</span>
            <span>Autonomy Engine v4.2</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Coords: {telemetry.position.x}E, {telemetry.position.y}N</span>
            <span className="text-slate-700">|</span>
            <span>Battery: {telemetry.batteryLevel.toFixed(1)}% ({telemetry.batteryVoltage}V)</span>
            <span className="text-slate-700">|</span>
            <span className="text-cyan-400 font-semibold">Jezero Crater Sector 4</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BaselineComparisonModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      <HazardMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
        configs={hazardEngineRef.current.getConfigs()}
        onToggleRule={handleToggleRule}
      />
    </div>
  );
}

export default App;

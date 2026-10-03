// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from '../App';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  }) as any;

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('AEGIS Mission Control Dashboard Integration Tests', () => {
  it('renders the complete mission control dashboard without throwing errors', () => {
    render(<App />);

    // Brand and Header checks
    expect(screen.getAllByText('AEGIS').length).toBeGreaterThan(0);
    expect(screen.getByText(/MARS 2026/)).toBeDefined();
    expect(screen.getByText(/OVERALL MISSION RISK/i)).toBeDefined();

    // Telemetry Cards checks
    expect(screen.getByText('Battery SOC')).toBeDefined();
    expect(screen.getByText('Thermal Subsystem')).toBeDefined();
    expect(screen.getByText('Solar Efficiency')).toBeDefined();
    expect(screen.getByText('Relay Link Quality')).toBeDefined();
    expect(screen.getByText('6-Wheel Slip Status')).toBeDefined();
    expect(screen.getByText('Speed & Attitude')).toBeDefined();
    expect(screen.getByText('Power Consumption')).toBeDefined();
    expect(screen.getByText('Mission Progress')).toBeDefined();

    // Scenario controls checks
    expect(screen.getByText(/SCENARIO SIMULATOR & FAULT INJECTION/i)).toBeDefined();
    expect(screen.getByText('Depleted Battery Emergency')).toBeDefined();
    expect(screen.getByText('Loose Dune Sand Entrapment')).toBeDefined();
    expect(screen.getByText('Orbiter Loss-of-Signal (LOS)')).toBeDefined();
  });

  it('triggers real state changes when a scenario is injected', () => {
    render(<App />);

    // Click on "Loose Dune Sand Entrapment" (Rover Stuck)
    const stuckButton = screen.getByText('Loose Dune Sand Entrapment');
    act(() => {
      fireEvent.click(stuckButton);
    });

    // Check that Active Fault shows ROVER_STUCK
    expect(screen.getAllByText(/ROVER_STUCK/i).length).toBeGreaterThan(0);

    // Check that Hazard Detection panel registers the hazard
    expect(screen.getAllByText(/Locomotion Entrapment/i).length).toBeGreaterThan(0);

    // Clear Faults
    const clearButton = screen.getByText('Clear All Faults / Recover');
    act(() => {
      fireEvent.click(clearButton);
    });

    // Check return to nominal
    expect(screen.getByText(/All fault injectors disengaged/i)).toBeDefined();
  });

  it('navigates seamlessly across operational views', () => {
    render(<App />);

    // Click Tactical Terrain Map tab
    const mapTab = screen.getByText('Tactical Terrain Map');
    act(() => {
      fireEvent.click(mapTab);
    });
    expect(screen.getAllByText(/JEZERO CRATER SECTOR 4/i).length).toBeGreaterThan(0);

    // Click Telemetry Analytics tab
    const telemTab = screen.getByText('Telemetry Analytics');
    act(() => {
      fireEvent.click(telemTab);
    });
    expect(screen.getByText(/HIGH-FREQUENCY SUBSYSTEM TELEMETRY ANALYTICS/i)).toBeDefined();

    // Click AEGIS-Core AI tab
    const aiTab = screen.getByText('AEGIS-Core AI');
    act(() => {
      fireEvent.click(aiTab);
    });
    expect(screen.getByText(/AEGIS-CORE MISSION INTELLIGENCE/i)).toBeDefined();
    expect(screen.getByText('Is the rover safe?')).toBeDefined();

    // Click Decision Stream tab
    const logsTab = screen.getByText('Decision Stream');
    act(() => {
      fireEvent.click(logsTab);
    });
    expect(screen.getByText(/AUTONOMOUS DECISION & EVENT STREAM/i)).toBeDefined();
  });

  it('opens and closes the Baseline Comparison and 9 Rules Matrix modals', () => {
    render(<App />);

    // Open Benchmark modal
    const benchmarkBtn = screen.getAllByTitle(/View Autonomy Benchmark Comparison/i)[0];
    act(() => {
      fireEvent.click(benchmarkBtn);
    });
    expect(screen.getByText(/AEGIS AUTONOMY VS TRADITIONAL GROUND TELEOPERATION/i)).toBeDefined();

    // Close Benchmark modal
    const closeBtns = screen.getAllByRole('button');
    const closeBenchmark = closeBtns.find(b => b.querySelector('svg.lucide-x'));
    if (closeBenchmark) {
      act(() => {
        fireEvent.click(closeBenchmark);
      });
    }

    // Open Rules Matrix modal
    const rulesBtn = screen.getAllByTitle(/Inspect 9 Hazard Rules Matrix/i)[0];
    act(() => {
      fireEvent.click(rulesBtn);
    });
    expect(screen.getByText(/AEGIS 9-VECTOR HAZARD DETECTION RULES MATRIX/i)).toBeDefined();
  });

  it('exercises all six documented fault scenarios in the UI with correct state updates', () => {
    render(<App />);

    // 1. LOW_BATTERY
    const battBtn = screen.getByText('Depleted Battery Emergency');
    act(() => { fireEvent.click(battBtn); });
    expect(screen.getAllByText(/LOW_BATTERY/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Low Battery Reserve/i).length).toBeGreaterThan(0);

    // Clear
    act(() => { fireEvent.click(screen.getByText('Clear All Faults / Recover')); });

    // 2. ROVER_STUCK
    const stuckBtn = screen.getByText('Loose Dune Sand Entrapment');
    act(() => { fireEvent.click(stuckBtn); });
    expect(screen.getAllByText(/ROVER_STUCK/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Locomotion Entrapment/i).length).toBeGreaterThan(0);

    // Test mitigation button execution
    const mitButtons = screen.getAllByText(/Execute Mitigation/i);
    expect(mitButtons.length).toBeGreaterThan(0);
    act(() => { fireEvent.click(mitButtons[0]); });

    // 3. COMM_LOSS
    const commBtn = screen.getByText('Orbiter Loss-of-Signal (LOS)');
    act(() => { fireEvent.click(commBtn); });
    expect(screen.getAllByText(/COMM_LOSS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Weak Communication Link/i).length).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByText('Clear All Faults / Recover')); });

    // 4. EXTREME_TEMP
    const tempBtn = screen.getByText('Drive Actuator Thermal Runaway');
    act(() => { fireEvent.click(tempBtn); });
    expect(screen.getAllByText(/EXTREME_TEMP/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Subsystem Thermal Overheating/i).length).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByText('Clear All Faults / Recover')); });

    // 5. SOLAR_DUST
    const dustBtn = screen.getByText('Martian Dust Storm Deposition');
    act(() => { fireEvent.click(dustBtn); });
    expect(screen.getAllByText(/SOLAR_DUST/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Solar Panel Dust Deposition/i).length).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByText('Clear All Faults / Recover')); });

    // 6. HAZARDOUS_TERRAIN
    const terrainBtn = screen.getByText('Belva Crater Scarp Incline');
    act(() => { fireEvent.click(terrainBtn); });
    expect(screen.getAllByText(/HAZARDOUS_TERRAIN/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hazardous Terrain/i).length).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByText('Clear All Faults / Recover')); });
  });

  it('tests reset, pause, resume, and mission controls', () => {
    render(<App />);

    // Pause
    const pauseBtn = screen.getByRole('button', { name: /Pause/i });
    expect(pauseBtn).toBeDefined();
    act(() => { fireEvent.click(pauseBtn); });

    // Resume / Play
    const playBtn = screen.getByRole('button', { name: /Start/i });
    expect(playBtn).toBeDefined();
    act(() => { fireEvent.click(playBtn); });

    // Reset
    const resetBtn = screen.getByTitle(/Reset Simulation/i);
    expect(resetBtn).toBeDefined();
    act(() => { fireEvent.click(resetBtn); });

    expect(screen.getByText(/All fault injectors disengaged/i)).toBeDefined();
  });
});

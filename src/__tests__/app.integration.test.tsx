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
    expect(screen.getByText('BATTERY SOC')).toBeDefined();
    expect(screen.getByText('THERMAL SUBSYSTEM')).toBeDefined();
    expect(screen.getByText('SOLAR EFFICIENCY')).toBeDefined();
    expect(screen.getByText('RELAY LINK QUALITY')).toBeDefined();
    expect(screen.getByText('6-WHEEL SLIP STATUS')).toBeDefined();
    expect(screen.getByText('SPEED & ATTITUDE')).toBeDefined();
    expect(screen.getByText('POWER CONSUMPTION')).toBeDefined();
    expect(screen.getByText('MISSION PROGRESS')).toBeDefined();

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
});

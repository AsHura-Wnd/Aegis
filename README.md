# Aegis
### Autonomous Exploration & Ground Intelligence System

Aegis is a software-based planetary rover mission intelligence and safety prototype designed to simulate autonomous decision-making in challenging extraterrestrial environments.

It monitors simulated rover telemetry, identifies potential hazards, evaluates mission risks, and selects appropriate responses to help the rover continue operating safely with reduced dependence on continuous human intervention.

> **Note:** Aegis is a simulation and research prototype. It is not connected to real rover hardware and is not flight-qualified.

## Overview

Planetary rovers operate in environments where communication delays, limited energy, unpredictable terrain, and changing environmental conditions can make continuous human control difficult.

Aegis explores how an autonomous mission-intelligence system can respond to these challenges by combining simulated telemetry, hazard detection, risk assessment, and explainable autonomous decisions in a single interface.

## Key Features

- **Live Telemetry Simulation:** Monitors simulated battery, temperature, solar efficiency, communication quality, mobility, power consumption, and mission progress.
- **Hazard Detection:** Evaluates rover conditions using a multi-vector hazard detection engine.
- **Risk Assessment:** Calculates a mission risk score based on simulated subsystem conditions.
- **Autonomous Decision-Making:** Selects appropriate operational responses based on detected risks and mission state.
- **Risk-Aware Navigation:** Simulates terrain-aware route planning and rover movement.
- **Fault Injection:** Provides six scenarios to test system behavior under simulated failure conditions.
- **Autonomous Recovery:** Simulates responses to conditions such as low battery, rover immobilization, and communication loss.
- **Explainable Decisions:** Presents the reasons behind system decisions and operational mode changes.
- **Mission Dashboard:** Visualizes telemetry, hazards, mission status, tactical terrain, and decisions.
- **Benchmarking:** Compares simulated autonomous behavior with a baseline control approach.
- **AI Assistant:** Provides mission-related explanations using the configured AI integration or a local fallback.

## Fault Scenarios

Aegis includes six simulated fault scenarios:

| Scenario | Simulated condition |
|---|---|
| Low Battery | Battery charge drops to a critical level |
| Rover Stuck | High wheel slip and loss of movement |
| Communication Loss | Degraded relay signal and increased packet loss |
| Extreme Temperature | Excessive thermal conditions |
| Solar Dust | Reduced solar panel efficiency |
| Hazardous Terrain | Dangerous terrain slope and navigation risk |

These scenarios are intended to demonstrate how the simulation detects faults, changes operating modes, and attempts recovery.

## System Workflow

1. **Monitor:** Collect simulated rover telemetry.
2. **Detect:** Identify abnormal subsystem conditions and hazards.
3. **Assess:** Evaluate mission risk based on detected conditions.
4. **Decide:** Select an appropriate autonomous response.
5. **Respond:** Simulate a mode transition, route adjustment, or recovery action.
6. **Explain:** Display the detected issue and reasoning behind the response.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Simulation:** Software-based rover telemetry and mission-state simulation
- **API:** REST endpoints
- **Testing:** Vitest and integration testing
- **AI:** Configurable AI API integration with a fallback assistant

Update this section if the implementation uses additional or different technologies.

## Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
```

Install dependencies:

```bash
npm install
```

Start the backend and frontend using the commands defined in the project scripts.

Check the `package.json` files and project documentation for the exact commands if the project uses a workspace or separate frontend and backend packages.

### Environment Variables

If using the AI API integration, configure the required API key in the appropriate environment file according to the project's `.env.example`.

Never commit API keys, secrets, or local environment files to the repository.

The application should retain its fallback behavior when an AI API key is not configured, if supported by the current implementation.

## Testing

Run the project's test suite:

```bash
npm test
```

Build the project:

```bash
npm run build
```

Refer to the project documentation for any additional integration or scenario validation steps.

## Project Status

Aegis is a hackathon-oriented software prototype focused on demonstrating autonomous rover mission intelligence through simulation.

It is intended for experimentation, visualization, and demonstration. Simulated performance results should not be interpreted as validated real-world rover performance.

## Limitations

- Rover telemetry and terrain interactions are simulated.
- Autonomous decisions are based on implemented software logic and are not validated for real-world deployment.
- No physical rover hardware integration is currently claimed.
- Simulated benchmarks do not establish actual performance in planetary environments.
- The prototype is not flight-qualified or safety-certified.

## Future Work

- Improve simulation fidelity and environmental modeling.
- Expand mission-planning and recovery strategies.
- Improve explainability of autonomous decisions.
- Explore integration with hardware-in-the-loop testing.
- Extend evaluation with additional fault scenarios and repeatable benchmarks.

## Contributing

Contributions, suggestions, and discussions are welcome. Please review the project documentation and existing code conventions before submitting changes.

## License

Specify a license before permitting reuse or redistribution of the project. Until a license is added, all rights remain with the copyright holder.

## Acknowledgements

Developed as a software prototype for planetary rover autonomy and mission intelligence.

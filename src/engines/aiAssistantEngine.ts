import { AssistantContext, ChatMessage } from '../types/assistant';

export class AegisAIAssistant {
  private apiKey: string = '';

  constructor(apiKey?: string) {
    if (apiKey) this.apiKey = apiKey;
  }

  public setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Generates a context-grounded response.
   * If an API key is provided, attempts an external LLM request with automatic fallback to deterministic rules.
   */
  public async respondToQuery(query: string, context: AssistantContext): Promise<ChatMessage> {
    const qLower = query.toLowerCase();

    // If API key is present, try Gemini API call first with graceful error handling
    if (this.apiKey) {
      try {
        const llmResponse = await this.callGeminiApi(query, context);
        if (llmResponse) {
          return {
            id: `MSG-LLM-${Date.now()}`,
            sender: 'assistant',
            text: llmResponse,
            timestamp: context.telemetry.formattedTime,
            referencedTelemetry: {
              battery: `${context.telemetry.batteryLevel}%`,
              riskScore: `${context.risk.currentScore}/100`,
              mode: context.telemetry.operationalMode,
              speed: `${context.telemetry.speed} m/s`,
            },
            referencedHazards: context.activeHazards.map((h) => h.hazardName),
            sourceType: 'GEMINI_LLM',
          };
        }
      } catch (err) {
        console.warn('Gemini LLM call failed or timed out, falling back to deterministic rules engine.', err);
      }
    }

    // Deterministic Rule-Based Intelligence
    return this.generateDeterministicResponse(qLower, query, context);
  }

  private generateDeterministicResponse(
    qLower: string,
    originalQuery: string,
    context: AssistantContext
  ): ChatMessage {
    const { telemetry, activeHazards, risk } = context;

    let replyText = '';
    let recAction: string | undefined = undefined;

    // Pattern 1: "Is the rover safe?" / safety status / health check
    if (
      qLower.includes('safe') ||
      qLower.includes('safety') ||
      qLower.includes('status') ||
      qLower.includes('health') ||
      qLower.includes('how is')
    ) {
      if (risk.riskLevel === 'CRITICAL') {
        replyText = `⚠️ **SAFETY ALERT: CRITICAL RISK DETECTED (${risk.currentScore}/100).**\n\nThe rover is **NOT currently in a safe state**. There are **${activeHazards.length} active hazard vector(s)** threatening vehicle integrity, led by **${risk.primaryConcern}**.\n\n` +
          `• **Current Operational Mode:** \`${telemetry.operationalMode}\`\n` +
          `• **Battery Level:** ${telemetry.batteryLevel}% (${telemetry.batteryVoltage}V)\n` +
          `• **Subsystem Temp:** ${telemetry.internalTemp}°C internal / ${telemetry.motorAverageTemp}°C motors\n` +
          `• **Comm Link:** ${telemetry.signalStrengthDbm} dBm (${telemetry.relayConnected ? 'Carrier Locked' : 'NO CARRIER'})\n\n` +
          `**Immediate Recommendation:** Execute autonomous safety mitigation: *${activeHazards[0]?.recommendedAction || 'Halt traverse and enter safe hold'}*.`;
        recAction = activeHazards[0]?.recommendedAction;
      } else if (risk.riskLevel === 'HIGH') {
        replyText = `⚠️ **CAUTION: ELEVATED RISK (${risk.currentScore}/100).**\n\nThe rover is encountering non-nominal environmental conditions. Primary concern: **${risk.primaryConcern}**.\n\n` +
          `• Active Hazards: ${activeHazards.map((h) => h.hazardName).join(', ')}\n` +
          `• Slope: ${telemetry.slopeAngle}° | Wheel Slip: ${(telemetry.wheelSlipAverage * 100).toFixed(0)}%\n` +
          `• Mitigation: ${activeHazards[0]?.recommendedAction || 'Proceed with reduced transit velocity.'}`;
        recAction = activeHazards[0]?.recommendedAction;
      } else if (risk.riskLevel === 'MODERATE') {
        replyText = `🟡 **MODERATE RISK NOTICE (${risk.currentScore}/100).**\n\nThe rover remains operational in \`${telemetry.operationalMode}\` mode. Minor telemetry variations detected:\n\n` +
          `• ${risk.reasonForChange}\n` +
          `• Speed: ${telemetry.speed} m/s | Power Draw: ${telemetry.powerConsumptionWatts} W\n` +
          `• Monitored vectors are within acceptable secondary safety thresholds.`;
      } else {
        replyText = `🟢 **ALL SYSTEMS NOMINAL — ROVER IS SAFE (${risk.currentScore}/100 LOW RISK).**\n\n` +
          `All 9 hazard detection vectors are cleared. The rover is currently executing **${telemetry.operationalMode}** toward **${telemetry.currentObjective}**.\n\n` +
          `• **Battery:** ${telemetry.batteryLevel}% (Net Power: ${telemetry.netPowerWatts >= 0 ? '+' : ''}${telemetry.netPowerWatts}W)\n` +
          `• **Mobility:** Nominal velocity ${telemetry.speed} m/s, avg wheel slip ${(telemetry.wheelSlipAverage * 100).toFixed(0)}%\n` +
          `• **Thermal:** ${telemetry.internalTemp}°C internal (nominal range: 15°C to 28°C)\n` +
          `• **Communication:** ${telemetry.signalStrengthDbm} dBm (${telemetry.signalQualityPercent}% link quality)`;
      }
    }

    // Pattern 2: "Why is battery dropping?" / power consumption / energy
    else if (
      qLower.includes('battery') ||
      qLower.includes('power') ||
      qLower.includes('drain') ||
      qLower.includes('energy') ||
      qLower.includes('discharge')
    ) {
      const isDrainHazard = activeHazards.some((h) => h.hazardType === 'RAPID_POWER_DRAIN' || h.hazardType === 'LOW_BATTERY');
      replyText = `🔋 **POWER SUBSYSTEM TELEMETRY ANALYSIS:**\n\n` +
        `• **Current Battery Level:** ${telemetry.batteryLevel}% (${telemetry.batteryVoltage} V)\n` +
        `• **Total Consumption Rate:** ${telemetry.powerConsumptionWatts} Watts\n` +
        `• **Solar Photovoltaic Inflow:** ${telemetry.solarGenerationWatts} Watts (Efficiency: ${telemetry.solarEfficiency}%)\n` +
        `• **Net Power Differential:** ${telemetry.netPowerWatts} Watts\n\n`;

      if (telemetry.netPowerWatts < -150 || isDrainHazard) {
        replyText += `**Root Cause for Accelerated Discharge:**\n` +
          `1. High drive actuator load: ${telemetry.isStuck ? 'Motors stalled against unconsolidated sand (+220W surge)' : telemetry.slopeAngle > 15 ? `Climbing ${telemetry.slopeAngle}° incline (+80W mechanical resistance)` : 'Standard locomotion'}\n` +
          `2. Thermal management: ${telemetry.heatersActive ? 'Cryogenic survival heaters ACTIVE (+90W)' : telemetry.radiatorDeployed ? 'Radiator pump active (+35W)' : 'Passive thermal state'}\n` +
          `3. Solar degradation: Dust accumulation at ${telemetry.dustAccumulation}%, reducing incoming solar flux to ${telemetry.solarGenerationWatts}W.\n\n` +
          `**Simulated Recommendation:** Prioritize divert maneuver to **Solis Plateau Solar Recharge Haven** and curtail scientific payloads.`;
        recAction = 'Reroute to nearest solar recharge zone.';
      } else {
        replyText += `**Assessment:** Battery discharge is running at nominal operational rates for the current traverse slope (${telemetry.slopeAngle}°) and payload activity. Net deficit is within planned Sol energy reserves.`;
      }
    }

    // Pattern 3: "What should the rover do next?" / recommendation / next action / mission plan
    else if (
      qLower.includes('do next') ||
      qLower.includes('next') ||
      qLower.includes('recommend') ||
      qLower.includes('action') ||
      qLower.includes('plan')
    ) {
      if (activeHazards.length > 0) {
        const topH = activeHazards[0];
        replyText = `🧭 **AUTONOMOUS ACTION RECOMMENDATION FOR OPERATOR:**\n\n` +
          `Based on **${activeHazards.length} active hazard vector(s)** and risk score of **${risk.currentScore}/100 (${risk.riskLevel})**:\n\n` +
          `1. **Immediate Safety Action:** ${topH.recommendedAction}\n` +
          `2. **Operational Mode Transition:** Maintain \`${telemetry.operationalMode}\` until telemetry stabilizes.\n` +
          `3. **Navigation Path:** ${telemetry.isStuck ? 'Engage peristaltic crab-walk reverse sequence before re-attempting forward traversal.' : telemetry.batteryLevel < 25 ? 'Detour 180m East to Solis Plateau Solar Haven.' : 'Maintain autonomous spline contour navigation around hazard boundary.'}\n\n` +
          `*Simulated Autonomous Recommendation — Ready for autonomous execution or operator override.*`;
        recAction = topH.recommendedAction;
      } else {
        replyText = `🧭 **NOMINAL MISSION TRAJECTORY & ACTION RECOMMENDATION:**\n\n` +
          `• Proceed with planned autonomous transit to **${telemetry.currentObjective}**.\n` +
          `• Distance remaining to target: **${telemetry.distanceToTargetMeters} meters** (${telemetry.progressPercent}% complete).\n` +
          `• Commanded traverse velocity: **${telemetry.commandedSpeed} m/s**.\n` +
          `• No corrective tactical actions required. Continue logging odometry and environmental DEM samples.`;
      }
    }

    // Pattern 4: "Why is the rover stuck?" / stuck / mobility / wheels
    else if (
      qLower.includes('stuck') ||
      qLower.includes('wheel') ||
      qLower.includes('slip') ||
      qLower.includes('traction')
    ) {
      replyText = `🛞 **MOBILITY & WHEEL TELEMETRY DIAGNOSTIC:**\n\n` +
        `• **Entrapment State:** ${telemetry.isStuck ? '⚠️ CHASSIS IMMOBILIZED (ROVER STUCK)' : 'Traversing normally'}\n` +
        `• **Average Wheel Slip Ratio:** ${(telemetry.wheelSlipAverage * 100).toFixed(0)}% (Normal: < 25%, Hazard: > 35%)\n` +
        `• **Commanded vs Actual Velocity:** ${telemetry.commandedSpeed} m/s vs ${telemetry.speed} m/s\n` +
        `• **Stall Duration:** ${telemetry.stuckCounter} ticks\n\n` +
        `**Wheel Subsystem Telemetry Breakdown:**\n` +
        telemetry.wheels.map((w) => `• \`${w.id} (${w.label})\`: Slip: ${(w.slipRatio * 100).toFixed(0)}% | Current: ${w.motorCurrent}A | Temp: ${w.motorTemp}°C | ${w.tractionGood ? 'Good Grip' : 'Slip/Sinkage'}`).join('\n') +
        `\n\n**Recovery Protocol:**\n` +
        `Execute autonomous peristaltic extraction sequence: Lock rear steering, actuate front bogie pivot arms to displace weight, apply reverse differential pulse at 15 RPM for 4.0 seconds.`;
      recAction = 'Execute autonomous peristaltic extraction sequence';
    }

    // Pattern 5: "Explain risk score" / risk / why changed
    else if (
      qLower.includes('risk') ||
      qLower.includes('score') ||
      qLower.includes('hazard') ||
      qLower.includes('why')
    ) {
      replyText = `📊 **DYNAMIC RISK ASSESSMENT BREAKDOWN:**\n\n` +
        `• **Overall Mission Risk Score:** **${risk.currentScore}/100** (\`${risk.riskLevel}\`)\n` +
        `• **Score Delta:** ${risk.delta >= 0 ? `+${risk.delta}` : `${risk.delta}`} points from prior tick\n` +
        `• **Primary Threat Vector:** ${risk.primaryConcern}\n` +
        `• **Explanation of Change:** ${risk.reasonForChange}\n\n`;

      if (risk.drivers.length > 0) {
        replyText += `**Contributing Hazard Drivers:**\n` +
          risk.drivers.map((d) => `• **${d.hazardName}** [${d.severity}]: +${d.contributionPoints} pts — ${d.description}`).join('\n') +
          `\n\n`;
      }

      if (risk.compoundingFactors.length > 0) {
        replyText += `**Compounding Synergistic Multipliers:**\n` +
          risk.compoundingFactors.map((cf) => `• ${cf}`).join('\n');
      }
    }

    // Pattern 6: Fallback general query
    else {
      replyText = `🛰️ **AEGIS MISSION INTELLIGENCE REPORT:**\n\n` +
        `Regarding *"${originalQuery}"*:\n\n` +
        `• **Mission Clock:** ${telemetry.formattedTime} (Tick: ${telemetry.tick})\n` +
        `• **System Risk:** ${risk.currentScore}/100 (${risk.riskLevel})\n` +
        `• **Active Hazards:** ${activeHazards.length === 0 ? 'None (All 9 vectors nominal)' : activeHazards.map((h) => h.hazardName).join(', ')}\n` +
        `• **Telemetry Snapshot:** Battery ${telemetry.batteryLevel}%, Temp ${telemetry.internalTemp}°C, Speed ${telemetry.speed} m/s, Signal ${telemetry.signalStrengthDbm} dBm.\n\n` +
        `Recommended queries: Try asking *"Is the rover safe?"*, *"Why is battery dropping?"*, or *"What should the rover do next?"*`;
    }

    return {
      id: `MSG-RULE-${Date.now()}`,
      sender: 'assistant',
      text: replyText,
      timestamp: telemetry.formattedTime,
      referencedTelemetry: {
        battery: `${telemetry.batteryLevel}%`,
        riskScore: `${risk.currentScore}/100`,
        mode: telemetry.operationalMode,
        speed: `${telemetry.speed} m/s`,
      },
      referencedHazards: activeHazards.map((h) => h.hazardName),
      recommendedAction: recAction,
      sourceType: 'DETERMINISTIC_RULES',
    };
  }

  private async callGeminiApi(query: string, context: AssistantContext): Promise<string | null> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const systemPrompt = `You are AEGIS, an autonomous planetary rover mission-intelligence and safety officer for a simulated Mars rover in Jezero Crater Sector 4.
Current Simulation State:
- Mission Time: ${context.telemetry.formattedTime}
- Operational Mode: ${context.telemetry.operationalMode}
- Battery Level: ${context.telemetry.batteryLevel}% (${context.telemetry.batteryVoltage}V, net power: ${context.telemetry.netPowerWatts}W)
- Internal Temp: ${context.telemetry.internalTemp}°C, Motor Temp: ${context.telemetry.motorAverageTemp}°C
- Speed: ${context.telemetry.speed} m/s, Wheel Slip: ${(context.telemetry.wheelSlipAverage * 100).toFixed(0)}%, Stuck: ${context.telemetry.isStuck}
- Signal Strength: ${context.telemetry.signalStrengthDbm} dBm, Relay: ${context.telemetry.relayConnected ? 'Connected' : 'DISCONNECTED'}
- Active Hazards (${context.activeHazards.length}): ${context.activeHazards.map((h) => `${h.hazardName} [${h.severity}]: ${h.reason}`).join('; ')}
- Risk Score: ${context.risk.currentScore}/100 (${context.risk.riskLevel}), Primary Concern: ${context.risk.primaryConcern}

Respond concisely and professionally as a NASA/JPL/ISRO flight director. Ground every assertion in the current simulation state. Always include simulated recommendations. Explicitly remember this is a simulation.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nOperator Question: ${query}` }] },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || null;
  }
}

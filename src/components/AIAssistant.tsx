import React, { useEffect, useRef, useState } from 'react';
import { AegisAIAssistant } from '../engines/aiAssistantEngine';
import { ChatMessage, QuickPrompt } from '../types/assistant';
import { DetectedHazard } from '../types/hazard';
import { RiskAssessment } from '../types/risk';
import { RoverTelemetry } from '../types/telemetry';
import { soundFX } from '../utils/audio';
import {
  Bot,
  Cpu,
  Key,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  Terminal,
  User,
} from 'lucide-react';

import { apiClient } from '../services/apiClient';

interface AIAssistantProps {
  telemetry: RoverTelemetry;
  activeHazards: DetectedHazard[];
  risk: RiskAssessment;
  assistant: AegisAIAssistant;
  activeMissionId?: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'QP-SAFE', label: 'Is the rover safe?', query: 'Is the rover safe right now?', category: 'SAFETY' },
  { id: 'QP-BATT', label: 'Why is battery dropping?', query: 'Why is the battery dropping?', category: 'DIAGNOSTIC' },
  { id: 'QP-NEXT', label: 'What should the rover do next?', query: 'What should the rover do next?', category: 'RECOMMENDATION' },
  { id: 'QP-RISK', label: 'Explain risk score & hazards', query: 'Explain current risk score and active hazards.', category: 'DIAGNOSTIC' },
  { id: 'QP-STUCK', label: 'Stuck state extraction steps', query: 'What is the recommended recovery action for stuck state or high slip?', category: 'RECOMMENDATION' },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({
  telemetry,
  activeHazards,
  risk,
  assistant,
  activeMissionId = 'primary-mission',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'INIT-1',
      sender: 'assistant',
      text: `🛰️ **AEGIS Autonomous Flight Intelligence Online.**\n\nI am continuously monitoring telemetry across all 9 hazard vectors in Jezero Crater Sector 4.\n\nCurrent Status: **${risk.riskLevel} Risk (${risk.currentScore}/100)** | Mode: \`${telemetry.operationalMode}\`.\n\nYou can ask about vehicle safety, battery discharge, fault diagnostics, or select a query below.`,
      timestamp: telemetry.formattedTime,
      sourceType: 'DETERMINISTIC_RULES',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(assistant.getApiKey() || '');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    soundFX.playClick();
    setInputQuery('');

    // Add user message
    const userMsg: ChatMessage = {
      id: `USER-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: telemetry.formattedTime,
      sourceType: 'DETERMINISTIC_RULES',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let response: ChatMessage | null = null;
      try {
        const backendRes = await apiClient.askAssistant(activeMissionId, q);
        if (backendRes && backendRes.response) {
          response = backendRes.response;
        }
      } catch {
        // Fall back to local assistant engine if backend unavailable
      }

      if (!response) {
        response = await assistant.respondToQuery(q, {
          telemetry,
          activeHazards,
          risk,
          missionName: 'Jezero Delta Traverse',
        });
      }

      soundFX.playSuccess();
      setMessages((prev) => [...prev, response!]);
    } catch (err) {
      console.error('Failed to get response', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    soundFX.playSuccess();
    assistant.setApiKey(apiKeyInput);
    localStorage.setItem('aegis_gemini_key', apiKeyInput);
    setShowKeyModal(false);
  };

  return (
    <div className="rounded-2xl aegis-card p-4 md:p-5 flex flex-col h-full border border-white/[0.08]">
      {/* Assistant Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="editorial-num text-xs">03.</span>
              <h3 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
                AEGIS-Core Mission Intelligence
              </h3>
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/10 bg-zinc-900 text-zinc-400 font-semibold"
              >
                {assistant.getApiKey() ? 'Gemini 1.5 Hybrid' : 'Deterministic Rules Engine'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Live State: {telemetry.formattedTime} | {risk.riskLevel} Risk ({risk.currentScore}/100)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            setShowKeyModal(true);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/20 text-xs font-mono flex items-center gap-1.5 transition-all font-medium"
          title="Configure optional Gemini LLM API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LLM Key</span>
        </button>
      </div>

      {/* Quick Prompt Action Chips */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1.5 font-mono text-[11px]">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.id}
            onClick={() => handleSend(qp.query)}
            className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/25 shrink-0 transition-all font-medium"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[460px] min-h-[280px]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isUser
                    ? 'bg-zinc-800 border-white/20 text-white'
                    : 'bg-zinc-900 border-white/10 text-zinc-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-zinc-800 border border-white/10 text-zinc-100 rounded-tr-none'
                    : 'bg-zinc-900/80 border border-white/[0.08] text-zinc-300 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-mono text-zinc-500 pb-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300">
                    {isUser ? 'Flight Operator' : 'AEGIS Autonomy'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap font-sans text-xs">{msg.text}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-zinc-900/60 rounded-xl border border-white/10 text-xs font-mono text-zinc-400 max-w-xs animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-zinc-300" />
            Synthesizing deterministic mission advice...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Query Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 pt-3 border-t border-white/[0.08] flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Terminal className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AEGIS-Core: e.g. 'What is the current wheel slip and slope?'"
            className="w-full bg-zinc-900/80 border border-white/10 focus:border-white/30 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none transition-all placeholder:text-zinc-600"
          />
        </div>
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>

      {/* Optional Gemini API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c11] border border-white/10 rounded-2xl max-w-md w-full p-5 aegis-card shadow-2xl">
            <h3 className="font-syne font-bold text-sm text-white mb-1 uppercase">
              Configure Gemini API Key (Optional)
            </h3>
            <p className="text-xs text-zinc-400 mb-3 font-sans">
              AEGIS runs 100% offline with zero external dependencies using its deterministic rules engine. You may optionally enter a Google Gemini API key for freeform hybrid conversational explanations.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white mb-4 focus:outline-none focus:border-white/30"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-black rounded-lg text-xs font-mono font-bold"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

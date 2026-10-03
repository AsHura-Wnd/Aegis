import React, { useEffect, useRef, useState } from 'react';
import { AegisAIAssistant } from '../engines/aiAssistantEngine';
import { ChatMessage, QuickPrompt } from '../types/assistant';
import { DetectedHazard } from '../types/hazard';
import { RiskAssessment } from '../types/risk';
import { RoverTelemetry } from '../types/telemetry';
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

interface AIAssistantProps {
  telemetry: RoverTelemetry;
  activeHazards: DetectedHazard[];
  risk: RiskAssessment;
  assistant: AegisAIAssistant;
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
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'INIT-1',
      sender: 'assistant',
      text: `🛰️ **AEGIS AUTONOMOUS FLIGHT INTELLIGENCE ONLINE.**\n\nI am continuously monitoring telemetry across all 9 hazard vectors in Jezero Crater Sector 4.\n\nCurrent Status: **${risk.riskLevel} RISK (${risk.currentScore}/100)** | Mode: \`${telemetry.operationalMode}\`.\n\nYou can ask about vehicle safety, battery discharge, fault diagnostics, or select a query below.`,
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
      const response = await assistant.respondToQuery(q, {
        telemetry,
        activeHazards,
        risk,
        missionName: 'Jezero Delta Traverse',
      });
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error('Failed to get response', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    assistant.setApiKey(apiKeyInput);
    localStorage.setItem('aegis_gemini_key', apiKeyInput);
    setShowKeyModal(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d121d]/90 backdrop-blur-md p-4 shadow-lg flex flex-col h-full">
      {/* Assistant Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                AEGIS-CORE MISSION INTELLIGENCE
              </h3>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                assistant.getApiKey()
                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
              }`}>
                {assistant.getApiKey() ? 'GEMINI 1.5 HYBRID' : 'DETERMINISTIC RULES ENGINE'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Live State: {telemetry.formattedTime} | {risk.riskLevel} Risk ({risk.currentScore}/100)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowKeyModal(true)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono flex items-center gap-1 transition-all"
          title="Configure optional Gemini LLM API Key"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">LLM Key</span>
        </button>
      </div>

      {/* Quick Prompt Action Chips */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.id}
            onClick={() => handleSend(qp.query)}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-[#090d16] hover:bg-cyan-950/50 hover:border-cyan-500/40 text-slate-300 border border-white/10 transition-all shrink-0 flex items-center gap-1 text-left"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[340px] pr-1 mb-3">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-mono ${
                  isUser ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600/30 border border-cyan-500/40 text-cyan-100 rounded-tr-none'
                    : 'bg-[#090e1a] border border-white/10 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {msg.text}
                </div>

                {/* Referenced telemetry pill */}
                {msg.referencedTelemetry && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                    {Object.entries(msg.referencedTelemetry).map(([k, v]) => (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5">
                        {k}: <strong className="text-cyan-300">{v}</strong>
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[9px] font-mono text-slate-500 text-right mt-1">
                  {msg.timestamp} • {msg.sourceType}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 p-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Synthesizing telemetry context...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 mt-auto"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask AEGIS about telemetry, safety risk, or autonomous actions..."
          className="flex-1 bg-[#090d16] border border-white/10 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all font-sans"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black font-semibold transition-all shadow-md"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Disclaimer */}
      <div className="mt-2 text-[10px] font-mono text-slate-500 text-center">
        ⚠️ Simulated Autonomous Mission Intelligence Protocol — No hardware commands issued.
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d121d] border border-white/10 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-mono font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" /> OPTIONAL GEMINI API KEY
            </h3>
            <p className="text-xs text-slate-400 mb-3 font-sans">
              AEGIS operates with 100% full fidelity using its built-in <strong>deterministic rule engine</strong> without any API key. If you wish to enable the hybrid Gemini 1.5 Flash assistant, paste your Google AI key below.
            </p>

            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#090d16] border border-white/10 rounded-lg p-2 text-xs text-white mb-4 font-mono outline-none focus:border-cyan-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 text-xs font-mono font-semibold bg-cyan-500 text-black rounded-lg hover:bg-cyan-400"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { AutonomousDecision } from '../engines/decisionEngine';
import { LogCategory, LogEntry } from '../types/log';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  Filter,
  Flame,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DecisionLogProps {
  logs: LogEntry[];
  recentDecision: AutonomousDecision | null;
  onClearLogs: () => void;
}

export const DecisionLog: React.FC<DecisionLogProps> = ({
  logs,
  recentDecision,
  onClearLogs,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    if (selectedCategory !== 'ALL' && l.category !== selectedCategory) return false;
    if (filterSeverity !== 'ALL' && l.severity !== filterSeverity) return false;
    return true;
  });

  const getCategoryBadge = (cat: LogCategory) => {
    switch (cat) {
      case 'HAZARD':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'DECISION':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SCENARIO':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'MODE_CHANGE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis-mission-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d121d]/90 backdrop-blur-md p-4 shadow-lg flex flex-col h-full">
      {/* Log Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            AUTONOMOUS DECISION & EVENT STREAM
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            {filteredLogs.length} / {logs.length} Records
          </span>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportJson}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1 transition-all"
            title="Download complete JSON mission telemetry and event log"
          >
            <ArrowDownToLine className="w-3 h-3" /> Export JSON
          </button>
        </div>
      </div>

      {/* Prominent Recent Autonomous Decision Card */}
      {recentDecision && (
        <div className="mb-3 p-3 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-[#0a101d] shadow-cyan-500/10 shadow-md">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                MOST RECENT AUTONOMOUS DECISION
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {recentDecision.time} (Confidence: {recentDecision.confidencePercent}%)
            </span>
          </div>

          <div className="text-xs font-semibold text-white font-sans mt-0.5">
            {recentDecision.actionTaken}
          </div>
          <p className="text-[11px] text-slate-300 font-sans mt-1 leading-relaxed">
            {recentDecision.rationale}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono">
            <span className="text-slate-400">MODE TRANSITION:</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
              {recentDecision.operationalMode}
            </span>
            <span className="text-cyan-400">➔</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              {recentDecision.recommendedMode}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-1">
        {(['ALL', 'HAZARD', 'DECISION', 'SCENARIO', 'SYSTEM'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-cyan-500 text-black font-bold shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Logs Scrollable Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px] pr-1">
        {filteredLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">
            No event records matching active filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg border border-white/5 bg-[#0a0e18] hover:border-white/15 transition-all text-xs font-sans"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${getCategoryBadge(log.category)}`}>
                    {log.category}
                  </span>
                  <span className="font-semibold text-slate-200 line-clamp-1">
                    {log.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {log.time}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {log.description}
              </p>

              {log.recommendedAction && (
                <div className="mt-1 text-[10px] font-mono text-amber-300">
                  ACTION: {log.recommendedAction}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

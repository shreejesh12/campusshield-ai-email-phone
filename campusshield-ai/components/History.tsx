
import React, { useMemo, useState } from 'react';
import { HistoryItem } from '../types';

interface HistoryProps {
  history: HistoryItem[];
  isDarkMode: boolean;
  // Added isElderly prop to resolve Type Error
  isElderly?: boolean;
}

const History: React.FC<HistoryProps> = ({ history, isDarkMode, isElderly = false }) => {
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [showScamsOnly, setShowScamsOnly] = useState(false);

  const visible = useMemo(() => {
    const items = history.slice();
    const filtered = showScamsOnly ? items.filter(i => i.result.isScam) : items;
    // newest first
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [history, showScamsOnly]);

  return (
    <div className={`p-6 space-y-6 ${isElderly ? 'text-lg' : ''}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className={`font-bold ${isElderly ? 'text-3xl' : 'text-2xl'}`}>Messages</h2>
          <button
            onClick={() => setShowScamsOnly(v => !v)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {showScamsOnly ? 'Show All' : 'Scams Only'}
          </button>
        </div>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} ${isElderly ? 'text-base' : 'text-sm'}`}>
          Tap any message to open details. Scam messages are labeled.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDarkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} font-medium`}>No active logs recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              className={`p-4 border rounded-2xl flex gap-4 transition-all hover:scale-[1.01] cursor-pointer group ${
              isDarkMode ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black ${isElderly ? 'text-sm' : 'text-xs'} ${
                item.result.isScam ? 'bg-red-500/10 text-red-500' : (isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-slate-100 text-slate-600')
              }`}>
                {item.result.riskScore}%
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          item.result.isScam
                            ? 'bg-red-500/15 text-red-400'
                            : (isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700')
                        }`}
                      >
                        {item.result.isScam ? 'SCAM' : 'SAFE'}
                      </span>
                      <h4 className={`font-bold truncate ${isElderly ? 'text-base' : 'text-sm'} ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        {item.content}
                      </h4>
                    </div>
                  </div>
                  <span className={`text-[10px] whitespace-nowrap ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                <p className={`text-xs line-clamp-1 mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.result.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
          />
          <div className={`relative w-full max-w-xl rounded-[2rem] border p-6 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    selected.result.isScam ? 'bg-red-500/15 text-red-400' : (isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700')
                  }`}>
                    {selected.result.isScam ? 'SCAM' : 'SAFE'}
                  </span>
                  <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(selected.timestamp).toLocaleString()}
                  </span>
                </div>
                <h3 className="mt-2 font-black text-sm">{selected.result.scamType || 'Message Analysis'}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-900 text-white'
                }`}
              >
                Close
              </button>
            </div>

            <div className={`mt-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Message</div>
              <div className="mt-2 text-sm leading-relaxed break-words">{selected.content}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Risk</div>
                <div className={`mt-2 text-2xl font-black ${selected.result.isScam ? 'text-red-400' : 'text-emerald-400'}`}>
                  {Math.round(selected.result.riskScore)}/100
                </div>
              </div>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Summary</div>
                <div className={`mt-2 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                  {selected.result.explanation || 'No explanation available.'}
                </div>
              </div>
            </div>

            {selected.result.recommendations?.length ? (
              <div className="mt-4">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">What to do</div>
                <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                  {selected.result.recommendations.slice(0, 6).map((r, idx) => (
                    <li key={idx} className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default History;

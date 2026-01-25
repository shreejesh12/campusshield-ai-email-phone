
import React, { useState } from 'react';
import { analyzeContent } from '../services/geminiService';
import { ScanResult, HistoryItem } from '../types';
import { Icons } from '../constants';

interface ScannerProps {
  onScanComplete: (item: HistoryItem) => void;
  isDarkMode: boolean;
  // Added isElderly prop to resolve Type Error
  isElderly?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, isDarkMode, isElderly = false }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  const handleScan = async (textToScan?: string) => {
    const content = textToScan || input;
    if (!content.trim()) return;
    setLoading(true);
    try {
      const scanRes = await analyzeContent(content);
      setResult(scanRes);
      
      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        content,
        result: scanRes
      };
      onScanComplete(historyItem);
    } catch (err) {
      alert("Analysis failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const simulateOCR = () => {
    setLoading(true);
    setTimeout(() => {
        const mockOCR = "URGENT: Your University library account is locked. Log in at: http://edu-verify.ru to unlock.";
        setInput(mockOCR);
        handleScan(mockOCR);
    }, 2000);
  };

  const handleReport = () => {
    setIsReporting(true);
    setTimeout(() => {
        setIsReporting(false);
        alert("Scam reported to the global CampusShield community. Thank you for protecting others!");
    }, 1500);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 70) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className={`p-6 space-y-6 ${isElderly ? 'text-lg' : ''}`}>
      {!result ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="space-y-2">
            <h2 className={`${isElderly ? 'text-3xl' : 'text-2xl'} font-black`}>Safety Inspector</h2>
            <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} ${isElderly ? 'text-base' : 'text-sm'} font-medium`}>Paste messages from WhatsApp, SMS, or Telegram.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
                <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste content here..."
                className={`w-full h-48 border rounded-3xl p-6 transition-all resize-none ${isElderly ? 'text-base' : 'text-sm'} leading-relaxed ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-slate-100 focus:ring-zinc-700' 
                      : 'bg-white border-slate-200 text-slate-900 focus:ring-slate-300'
                }`}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={simulateOCR}
                    disabled={loading}
                    className={`p-4 rounded-2xl font-bold ${isElderly ? 'text-sm' : 'text-xs'} flex items-center justify-center gap-2 border transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    Scan Screenshot
                </button>
                <button
                    onClick={() => handleScan()}
                    disabled={loading || !input.trim()}
                    className={`p-4 rounded-2xl font-black ${isElderly ? 'text-sm' : 'text-xs'} flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] ${
                        loading 
                        ? 'opacity-50 cursor-not-allowed' 
                        : (isDarkMode ? 'bg-zinc-100 text-slate-950 shadow-white/5' : 'bg-slate-900 text-white shadow-slate-900/10')
                    }`}
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <Icons.Shield />
                            Analyze Now
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4">
          <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {result.isScam && <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600"></div>}
            
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className={`${isElderly ? 'text-6xl' : 'text-5xl'} font-black tracking-tighter ${getRiskColor(result.riskScore)}`}>
                  {result.riskScore}%
                </span>
                <p className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Threat Level</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
                result.isScam 
                  ? 'bg-red-600/10 text-red-500 border-red-500/30' 
                  : (isDarkMode ? 'bg-green-600/10 text-green-500 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200')
              }`}>
                {result.isScam ? 'BLOCK DETECTED' : 'SECURE'}
              </div>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className={`text-[10px] font-black uppercase mb-2 tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>AI Analysis</h4>
                    <p className={`${isElderly ? 'text-lg' : 'text-base'} font-medium leading-relaxed ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {result.explanation}
                    </p>
                </div>

                <div className="space-y-3">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Recommended Actions</h4>
                    <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                        <div key={i} className={`flex gap-3 ${isElderly ? 'text-base' : 'text-sm'} font-bold p-3 rounded-xl border transition-colors ${
                        isDarkMode ? 'text-slate-300 bg-slate-800/50 border-white/5' : 'text-slate-700 bg-slate-50 border-slate-200'
                        }`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isDarkMode ? 'bg-zinc-100' : 'bg-slate-900'}`}></div>
                        {rec}
                        </div>
                    ))}
                    </div>
                </div>

                {result.isScam && (
                    <button 
                        onClick={handleReport}
                        disabled={isReporting}
                        className={`w-full p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-500 ${isElderly ? 'text-sm' : 'text-xs'} font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2`}
                    >
                        {isReporting ? 'Submitting...' : 'Report to Community Database'}
                    </button>
                )}
            </div>
          </div>

          <button 
            onClick={() => setResult(null)} 
            className={`w-full py-5 transition-colors ${isElderly ? 'text-sm' : 'text-xs'} font-black uppercase tracking-widest ${
              isDarkMode ? 'text-slate-500 hover:text-slate-100' : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            New Scan
          </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;


import React from 'react';
import { AppTab } from '../types';
import { Icons } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isGuardianActive?: boolean;
  isElderly?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isDarkMode, toggleTheme, isGuardianActive = false, isElderly = false }) => {
  const headerBg = isDarkMode ? 'bg-[#020617]/80' : 'bg-white/80';
  const borderColor = isDarkMode ? 'border-emerald-500/10' : 'border-slate-200';

  return (
    <div className={`flex flex-col min-h-screen max-w-2xl mx-auto shadow-2xl overflow-hidden relative border-x transition-all duration-500 ${
      isDarkMode ? 'bg-[#020617] text-slate-100 border-white/5' : 'bg-slate-50 text-slate-900 border-slate-200'
    } ${isElderly ? 'text-lg' : ''}`}>
      
      {/* Dynamic Background */}
      <div className={`fixed inset-0 grid-bg pointer-events-none -z-10 transition-opacity duration-1000 ${isGuardianActive ? 'opacity-100' : 'opacity-20'}`}></div>

      {/* Header */}
      <header
        className={`px-5 pb-5 flex items-center justify-between border-b sticky top-0 glass z-50 transition-all duration-500 ${headerBg} ${borderColor}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab(AppTab.DASHBOARD)}>
          <div className={`w-12 h-12 p-1.5 rounded-2xl transition-all duration-500 relative ${
            isGuardianActive 
              ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110' 
              : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
          }`}>
            <Icons.Logo active={isGuardianActive} className="w-full h-full" />
            {isGuardianActive && <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 animate-pulse"></div>}
          </div>
          <div>
            <h1 className={`font-extrabold tracking-tight transition-all leading-none ${isElderly ? 'text-2xl' : 'text-xl'} ${
              isGuardianActive ? 'shimmer-text' : ''
            }`}>CampusShield</h1>
            <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isGuardianActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                <span className={`text-[8px] font-bold tracking-[0.2em] uppercase ${
                    isGuardianActive ? 'text-emerald-500' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')
                }`}>
                    {isGuardianActive ? 'Quantum Guard Active' : 'System Standby'}
                </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              isDarkMode ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 pt-6 px-4 scroll-smooth">
        {children}
      </main>

      {/* Navigation Bar - Floating Dock Style */}
      <div
        className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <nav className={`max-w-md mx-auto h-20 rounded-[2.5rem] border glass flex justify-around items-center px-4 pointer-events-auto transition-all duration-500 ${
            isDarkMode 
            ? 'bg-[#0f172a]/80 border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.6)]' 
            : 'bg-white/80 border-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
        }`}>
            <NavButton 
            active={activeTab === AppTab.DASHBOARD} 
            onClick={() => setActiveTab(AppTab.DASHBOARD)}
            icon={<Icons.Shield />}
            label="Guard"
            isDarkMode={isDarkMode}
            activeColor="emerald"
            />
            <NavButton 
            active={activeTab === AppTab.SCAN} 
            onClick={() => setActiveTab(AppTab.SCAN)}
            icon={<Icons.Search />}
            label="Scan"
            isDarkMode={isDarkMode}
            activeColor="emerald"
            />
            <NavButton 
            active={activeTab === AppTab.SAFETY_CENTER} 
            onClick={() => setActiveTab(AppTab.SAFETY_CENTER)}
            icon={<Icons.Alert />}
            label="Safety"
            isDarkMode={isDarkMode}
            activeColor="emerald"
            />
            <NavButton 
            active={activeTab === AppTab.PROFILE} 
            onClick={() => setActiveTab(AppTab.PROFILE)}
            icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            }
            label="Vault"
            isDarkMode={isDarkMode}
            activeColor="emerald"
            />
        </nav>
      </div>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isDarkMode: boolean;
  activeColor: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, isDarkMode, activeColor }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative px-4 h-full ${
      active 
        ? (isDarkMode ? 'text-emerald-400 scale-110' : 'text-emerald-600 scale-110') 
        : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
    }`}
  >
    <div className={`transition-all duration-300 ${active ? 'animate-bounce' : ''}`}>{icon}</div>
    <span className="text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
    {active && (
        <div className="absolute -bottom-1 w-6 h-1 bg-emerald-500 rounded-full blur-[2px] opacity-60"></div>
    )}
  </button>
);

export default Layout;

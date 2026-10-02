import React from 'react';
import { ActiveTab } from '../types';

interface AdminNavBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  leadsCount?: number;
}

export const AdminNavBar: React.FC<AdminNavBarProps> = ({
  activeTab,
  onSelectTab,
  leadsCount = 0,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: string; count?: number }[] = [
    { id: 'links', label: 'Links', icon: 'link' },
    { id: 'analytics', label: 'Métricas', icon: 'monitoring' },
    { id: 'contacts', label: 'Contatos', icon: 'chat', count: leadsCount },
    { id: 'settings', label: 'Ajustes', icon: 'tune' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-[#f8f9ff]/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-16 max-w-lg mx-auto px-4 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              type="button"
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-1 transition-all relative ${
                isActive
                  ? 'text-[#006c49] font-bold scale-105'
                  : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
                {tab.count !== undefined && tab.count > 0 && tab.id === 'contacts' && (
                  <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 bg-[#10b981] text-white text-[9px] font-bold rounded-full min-w-[16px] text-center leading-tight shadow-xs">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-none tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#006c49] absolute bottom-1"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

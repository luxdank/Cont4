import React from 'react';

interface AdminHeaderProps {
  title: string;
  onViewBio: () => void;
  onLogout?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, onViewBio, onLogout }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-safe bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-16 px-4 max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[20px]">hub</span>
          </div>
          <h1 className="font-display font-semibold text-lg text-[#0b1c30] truncate max-w-[200px] sm:max-w-none">
            {title}
          </h1>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#006c49] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Firestore</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onViewBio}
            type="button"
            className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#e5eeff] hover:bg-[#dce9ff] flex items-center gap-1.5 text-[#3c4a42] hover:text-[#0b1c30] font-medium text-xs sm:text-sm transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-[#006c49]">visibility</span>
            <span>Ver Bio</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              type="button"
              title="Sair do Painel"
              className="min-h-[38px] px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-medium text-xs sm:text-sm transition-all active:scale-95 flex items-center gap-1.5 border border-red-200/50"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}

          <div
            title="Conta Administrador Autenticada"
            className="w-8 h-8 rounded-full bg-[#006c49] text-white flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};

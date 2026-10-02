import React from 'react';
import { LeadRecord, WhatsAppSector } from '../types';
import { getBioVisits } from '../utils/storage';

interface AdminAnalyticsProps {
  leads: LeadRecord[];
  sectors: WhatsAppSector[];
  onViewBio: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  leads,
  sectors,
  onViewBio,
}) => {
  const totalLeads = leads.length;
  const visits = getBioVisits();
  const conversionRate =
    visits > 0 ? ((totalLeads / visits) * 100).toFixed(1) : totalLeads > 0 ? '100.0' : '0.0';

  // Sector distribution
  const sectorCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const s = l.sector || 'Geral';
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });

  // Origin distribution
  const originCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const o = l.origin || 'Instagram';
    originCounts[o] = (originCounts[o] || 0) + 1;
  });

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-32 pt-2 px-4 gap-4">
      {/* Title */}
      <div className="flex items-center justify-between mt-1">
        <div>
          <h2 className="font-display font-bold text-xl text-[#0b1c30]">
            Métricas de Conversão
          </h2>
          <p className="text-xs text-[#3c4a42]">
            Desempenho da sua Bio inteligente e canais de entrada em tempo real.
          </p>
        </div>
      </div>

      {totalLeads === 0 && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
          <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0 mt-0.5">
            restart_alt
          </span>
          <div>
            <span className="font-semibold block text-emerald-950">
              Dados zerados com sucesso!
            </span>
            <span>
              A contagem começou agora. Assim que os clientes acessarem a Bio e iniciarem contato no WhatsApp, os gráficos e conversões serão atualizados automaticamente.
            </span>
          </div>
        </div>
      )}

      {/* 3 Metric Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#3c4a42]">
            Visitas Bio
          </span>
          <span className="font-display font-bold text-2xl text-[#0b1c30] mt-1">
            {visits}
          </span>
          <span className="text-[10px] text-[#006c49] font-semibold mt-1">
            Acessos reais
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#3c4a42]">
            Leads WhatsApp
          </span>
          <span className="font-display font-bold text-2xl text-[#006c49] mt-1">
            {totalLeads}
          </span>
          <span className="text-[10px] text-[#006c49] font-semibold mt-1">
            100% qualificados
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#3c4a42]">
            Taxa Conv.
          </span>
          <span className="font-display font-bold text-2xl text-[#0051d5] mt-1">
            {conversionRate}%
          </span>
          <span className="text-[10px] text-[#0051d5] font-semibold mt-1">
            Conversão real
          </span>
        </div>
      </div>

      {/* Distribution by Sector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
        <h3 className="font-display font-semibold text-sm text-[#0b1c30]">
          Demandas por Setor
        </h3>

        <div className="flex flex-col gap-3">
          {Object.entries(sectorCounts).map(([sector, count]) => {
            const pct = Math.round((count / Math.max(totalLeads, 1)) * 100);
            return (
              <div key={sector} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#0b1c30]">{sector}</span>
                  <span className="text-[#3c4a42] font-mono">
                    {count} leads ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#eff4ff] overflow-hidden">
                  <div
                    className="h-full bg-[#10b981] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution by Traffic Origin */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
        <h3 className="font-display font-semibold text-sm text-[#0b1c30]">
          Origem dos Leads
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(originCounts).map(([origin, count]) => (
            <div
              key={origin}
              className="p-3 rounded-xl bg-[#eff4ff] flex flex-col gap-1 border border-slate-100"
            >
              <div className="flex items-center gap-1.5 text-xs text-[#3c4a42]">
                <span className="material-symbols-outlined text-[16px] text-[#006c49]">
                  share
                </span>
                <span className="font-semibold truncate">{origin}</span>
              </div>
              <span className="font-display font-bold text-lg text-[#0b1c30]">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

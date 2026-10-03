import React from 'react';
import { LeadRecord, WhatsAppSector, PixClickRecord } from '../types';
import { getBioVisits } from '../utils/storage';

interface AdminAnalyticsProps {
  leads: LeadRecord[];
  sectors: WhatsAppSector[];
  pixClicks?: PixClickRecord[];
  onClearPixClicks?: () => void;
  onViewBio: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  leads,
  sectors,
  pixClicks = [],
  onClearPixClicks,
  onViewBio,
}) => {
  const totalLeads = leads.length;
  const totalPixClicks = pixClicks.length;
  const visits = getBioVisits();
  const totalConversions = totalLeads + totalPixClicks;

  const conversionRate =
    visits > 0
      ? ((totalConversions / visits) * 100).toFixed(1)
      : totalConversions > 0
      ? '100.0'
      : '0.0';

  // Sector distribution for WhatsApp leads
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
  pixClicks.forEach((p) => {
    const o = `${p.origin || 'Instagram'} (PIX)`;
    originCounts[o] = (originCounts[o] || 0) + 1;
  });

  const lastPixClick = pixClicks.length > 0 ? pixClicks[0] : null;

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-32 pt-2 px-4 gap-4">
      {/* Title */}
      <div className="flex items-center justify-between mt-1">
        <div>
          <h2 className="font-display font-bold text-xl text-[#0b1c30]">
            Métricas de Conversão
          </h2>
          <p className="text-xs text-[#3c4a42]">
            Acompanhe visitas, leads e cliques no <strong>Pague com PIX</strong> em tempo real.
          </p>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#3c4a42]">
            Visitas Bio
          </span>
          <span className="font-display font-bold text-2xl text-[#0b1c30] mt-1">
            {visits}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold mt-1">
            Acessos reais
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#3c4a42]">
            Leads WhatsApp
          </span>
          <span className="font-display font-bold text-2xl text-[#006c49] mt-1">
            {totalLeads}
          </span>
          <span className="text-[10px] text-[#006c49] font-semibold mt-1">
            Qualificados
          </span>
        </div>

        {/* PIX Clicks Metric Card */}
        <div className="bg-gradient-to-br from-white to-purple-50/50 p-3 rounded-2xl border border-purple-200/60 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-900">
              Cliques no PIX
            </span>
            <span className="material-symbols-outlined text-[16px] text-purple-600">
              qr_code_2
            </span>
          </div>
          <span className="font-display font-bold text-2xl text-purple-700 mt-1">
            {totalPixClicks}
          </span>
          <span className="text-[10px] text-purple-800 font-semibold mt-1">
            Contabilizados
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#3c4a42]">
            Taxa Total
          </span>
          <span className="font-display font-bold text-2xl text-[#0051d5] mt-1">
            {conversionRate}%
          </span>
          <span className="text-[10px] text-[#0051d5] font-semibold mt-1">
            Conversão geral
          </span>
        </div>
      </div>

      {/* Destaque Exclusivo: Contabilização "Pague com PIX" */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-200/80 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm sm:text-base text-[#0b1c30]">
                Contabilização "Pague com o PIX"
              </h3>
              <p className="text-[11px] text-slate-500">
                Registrado automaticamente a cada clique no botão de pagamento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
            <span>{totalPixClicks} cliques</span>
          </div>
        </div>

        {totalPixClicks === 0 ? (
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-purple-600 mt-0.5 shrink-0">
              info
            </span>
            <span>
              Nenhum clique registrado ainda. Assim que um cliente clicar no botão <strong>"Pague com PIX"</strong> na Bio, o clique será contabilizado aqui instantaneamente e gravado no Firestore e no histórico.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-purple-950 font-medium">
                <span className="material-symbols-outlined text-[16px] text-purple-600">
                  schedule
                </span>
                <span>Último clique registrado:</span>
              </div>
              <span className="font-mono text-purple-900 font-semibold">
                {lastPixClick ? lastPixClick.timestamp : '-'}
              </span>
            </div>

            {/* Lista dos últimos cliques */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] uppercase font-bold text-slate-400">
                Histórico de Cliques no PIX ({pixClicks.length})
              </span>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {pixClicks.slice(0, 10).map((click, idx) => (
                  <div
                    key={click.id || idx}
                    className="p-2.5 rounded-lg bg-[#eff4ff] border border-slate-200/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0 text-[12px]">
                        <span className="material-symbols-outlined text-[14px]">
                          touch_app
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[#0b1c30] truncate">
                          {click.linkTitle || 'Pague com PIX'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {click.origin || 'Instagram Bio'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600 font-semibold shrink-0">
                      {click.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {onClearPixClicks && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClearPixClicks}
                  className="text-[11px] text-slate-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">delete</span>
                  <span>Zerar contagem do PIX</span>
                </button>
              </div>
            )}
          </div>
        )}
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
          Origem dos Acessos & Cliques
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

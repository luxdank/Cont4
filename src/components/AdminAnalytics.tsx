import React from 'react';
import { LeadRecord, WhatsAppSector, PixClickRecord, LinkClickRecord, BioLinkItem } from '../types';
import { getBioVisits } from '../utils/storage';

interface AdminAnalyticsProps {
  leads: LeadRecord[];
  sectors: WhatsAppSector[];
  links?: BioLinkItem[];
  pixClicks?: PixClickRecord[];
  linkClicks?: LinkClickRecord[];
  onClearPixClicks?: () => void;
  onClearLinkClicks?: () => void;
  onViewBio: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  leads,
  sectors,
  links = [],
  pixClicks = [],
  linkClicks = [],
  onClearPixClicks,
  onClearLinkClicks,
  onViewBio,
}) => {
  const totalLeads = leads.length;
  const totalPixClicks = pixClicks.length;
  const totalLinkClicks = linkClicks.length;
  const visits = getBioVisits();

  // All conversions / engagements
  const totalEngagements = Math.max(totalLinkClicks, totalLeads + totalPixClicks);
  const conversionRate =
    visits > 0
      ? ((totalEngagements / visits) * 100).toFixed(1)
      : totalEngagements > 0
      ? '100.0'
      : '0.0';

  // Calculate clicks per link
  const linkClickCounts: Record<string, { title: string; count: number; icon?: string; colorType?: string }> = {};

  // Initialize with current links so every link is listed
  links.forEach((l) => {
    linkClickCounts[l.id] = {
      title: l.title,
      count: 0,
      icon: l.icon || 'link',
      colorType: l.colorType || 'primary',
    };
  });

  // Tally clicks from linkClicks collection
  linkClicks.forEach((c) => {
    if (linkClickCounts[c.linkId]) {
      linkClickCounts[c.linkId].count += 1;
    } else {
      linkClickCounts[c.linkId] = {
        title: c.linkTitle,
        count: 1,
        icon: 'touch_app',
        colorType: 'neutral',
      };
    }
  });

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
  linkClicks.forEach((c) => {
    const o = c.origin || 'Instagram';
    originCounts[o] = (originCounts[o] || 0) + 1;
  });

  const lastPixClick = pixClicks.length > 0 ? pixClicks[0] : null;
  const lastLinkClick = linkClicks.length > 0 ? linkClicks[0] : null;

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-32 pt-2 px-4 gap-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5 mt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-[#0b1c30]">
              Métricas de Conversão
            </h2>
            <p className="text-xs text-[#3c4a42]">
              Cliques em todos os links e leads sincronizados em tempo real no <strong>Firebase Firestore</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[#006c49] text-[11px] font-semibold border border-emerald-200/80 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Todos os links conectados e monitorados no Firebase</span>
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
            Acessos totais
          </span>
        </div>

        {/* All Links Clicks */}
        <div className="bg-gradient-to-br from-white to-blue-50/50 p-3 rounded-2xl border border-blue-200/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-900">
              Total Cliques
            </span>
            <span className="material-symbols-outlined text-[16px] text-blue-600">
              ads_click
            </span>
          </div>
          <span className="font-display font-bold text-2xl text-blue-700 mt-1">
            {totalLinkClicks}
          </span>
          <span className="text-[10px] text-blue-800 font-semibold mt-1">
            Todos os links
          </span>
        </div>

        {/* PIX Clicks */}
        <div className="bg-gradient-to-br from-white to-purple-50/50 p-3 rounded-2xl border border-purple-200/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-900">
              Pague c/ PIX
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

        {/* WhatsApp Leads */}
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
      </div>

      {/* SEÇÃO PRINCIPAL: Cliques por Botão / Link (Todos os Links) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">bar_chart</span>
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm sm:text-base text-[#0b1c30]">
                Desempenho de Todos os Links
              </h3>
              <p className="text-[11px] text-slate-500">
                Cliques registrados em cada botão da Bio no Firestore
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span>{totalLinkClicks} cliques</span>
          </div>
        </div>

        {Object.keys(linkClickCounts).length === 0 ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            Nenhum link ativo configurado no momento.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {Object.entries(linkClickCounts).map(([linkId, data]) => {
              const maxClicks = Math.max(totalLinkClicks, 1);
              const pct = totalLinkClicks > 0 ? Math.round((data.count / maxClicks) * 100) : 0;
              const isPix = data.title.toLowerCase().includes('pix');

              return (
                <div
                  key={linkId}
                  className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                    isPix
                      ? 'bg-purple-50/40 border-purple-200/80'
                      : 'bg-[#fcfdff] border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isPix ? 'bg-purple-600 text-white' : 'bg-[#e5eeff] text-[#0051d5]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isPix ? 'qr_code_2' : data.icon || 'link'}
                        </span>
                      </div>
                      <span className="font-medium text-xs sm:text-sm text-[#0b1c30] truncate">
                        {data.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-xs font-bold text-[#0b1c30]">
                        {data.count} {data.count === 1 ? 'clique' : 'cliques'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPix ? 'bg-purple-600' : 'bg-[#0051d5]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {onClearLinkClicks && totalLinkClicks > 0 && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClearLinkClicks}
                  className="text-[11px] text-slate-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">delete</span>
                  <span>Zerar histórico de cliques em links</span>
                </button>
              </div>
            )}
          </div>
        )}
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
                Registrado em tempo real no Firestore e na planilha
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
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 pr-1">
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

      {/* Histórico Recente de Cliques em Links */}
      {linkClicks.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                history
              </span>
              <span>Últimos Cliques em Links (Tempo Real)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {linkClicks.length} registros
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {linkClicks.slice(0, 10).map((click) => (
              <div
                key={click.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-[#0051d5] shrink-0">
                    touch_app
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[#0b1c30] truncate">
                      {click.linkTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {click.origin || 'Bio'} {click.isDirectLink ? '• Link direto' : '• WhatsApp Form'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">
                  {click.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution by Sector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
        <h3 className="font-display font-semibold text-sm text-[#0b1c30]">
          Demandas por Setor (Leads)
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

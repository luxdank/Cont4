import React, { useState, useMemo } from 'react';
import { CompanyConfig, LeadRecord, WhatsAppSector, PixClickRecord, LinkClickRecord, BioLinkItem } from '../types';
import { getBioVisits } from '../utils/storage';
import { formatLeadDateLabel } from '../utils/phone';

interface AdminAnalyticsProps {
  config?: CompanyConfig;
  leads: LeadRecord[];
  sectors: WhatsAppSector[];
  links?: BioLinkItem[];
  pixClicks?: PixClickRecord[];
  linkClicks?: LinkClickRecord[];
  onClearPixClicks?: () => void;
  onClearLinkClicks?: () => void;
  onViewBio: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function parseRecordDate(item: { fullDate?: string; timestamp?: string; id?: string }): Date | null {
  if (item.fullDate) {
    const d = new Date(item.fullDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.timestamp) {
    const match = item.timestamp.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = match[3]
        ? match[3].length === 2
          ? 2000 + parseInt(match[3], 10)
          : parseInt(match[3], 10)
        : new Date().getFullYear();
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(item.timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.id) {
    const match = item.id.match(/\d{11,}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      if (!isNaN(ts)) {
        return new Date(ts);
      }
    }
  }
  return null;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  config,
  leads,
  sectors,
  links = [],
  pixClicks = [],
  linkClicks = [],
  onClearPixClicks,
  onClearLinkClicks,
  onViewBio,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Available months list derived from linkClicks, pixClicks and leads
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();

    // Current month guaranteed as an option
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = `${MONTH_NAMES[now.getMonth()]} de ${now.getFullYear()}`;
    map.set(currentKey, { key: currentKey, label: currentLabel, count: 0 });

    const processItem = (item: { fullDate?: string; timestamp?: string; id?: string }) => {
      const d = parseRecordDate(item);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { key, label, count: 1 });
        }
      }
    };

    linkClicks.forEach(processItem);
    pixClicks.forEach(processItem);
    leads.forEach(processItem);

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [linkClicks, pixClicks, leads]);

  // Matcher for period
  const matchesPeriod = (d: Date | null): boolean => {
    if (selectedPeriod === 'all') return true;
    if (!d) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (selectedPeriod === 'today') {
      return d >= todayStart && d <= todayEnd;
    }

    if (selectedPeriod === 'yesterday') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      return d >= yesterdayStart && d <= yesterdayEnd;
    }

    if (selectedPeriod === '7days') {
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return d >= sevenDaysAgo && d <= todayEnd;
    }

    if (selectedPeriod === '30days') {
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return d >= thirtyDaysAgo && d <= todayEnd;
    }

    if (selectedPeriod === 'custom') {
      if (customStartDate) {
        const start = new Date(`${customStartDate}T00:00:00`);
        if (!isNaN(start.getTime()) && d < start) return false;
      }
      if (customEndDate) {
        const end = new Date(`${customEndDate}T23:59:59`);
        if (!isNaN(end.getTime()) && d > end) return false;
      }
      return true;
    }

    return true;
  };

  // Filter items by Month and Period
  const isItemInSelectedDate = (item: { fullDate?: string; timestamp?: string; id?: string }) => {
    const d = parseRecordDate(item);

    // Period check
    if (!matchesPeriod(d)) return false;

    // Month check
    if (selectedMonth !== 'all') {
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonth) return false;
      } else {
        return false;
      }
    }

    return true;
  };

  // Filtered collections
  const filteredLinkClicks = useMemo(() => linkClicks.filter(isItemInSelectedDate), [linkClicks, selectedMonth, selectedPeriod, customStartDate, customEndDate]);
  const filteredPixClicks = useMemo(() => pixClicks.filter(isItemInSelectedDate), [pixClicks, selectedMonth, selectedPeriod, customStartDate, customEndDate]);
  const filteredLeads = useMemo(() => leads.filter(isItemInSelectedDate), [leads, selectedMonth, selectedPeriod, customStartDate, customEndDate]);

  const totalLeads = filteredLeads.length;
  const totalPixClicks = filteredPixClicks.length;
  const totalLinkClicks = filteredLinkClicks.length;
  const visits = Math.max(config?.totalVisits || 0, getBioVisits());

  // All conversions / engagements
  const totalEngagements = Math.max(totalLinkClicks, totalLeads + totalPixClicks);
  const conversionRate =
    visits > 0
      ? ((totalEngagements / visits) * 100).toFixed(1)
      : totalEngagements > 0
      ? '100.0'
      : '0.0';

  // Calculate clicks per link for the filtered timeframe
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

  // Tally clicks from filteredLinkClicks collection
  filteredLinkClicks.forEach((c) => {
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

  // Sector distribution for WhatsApp leads in this timeframe
  const sectorCounts: Record<string, number> = {};
  filteredLeads.forEach((l) => {
    const s = l.sector || 'Geral';
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });

  // Origin distribution in this timeframe
  const originCounts: Record<string, number> = {};
  filteredLeads.forEach((l) => {
    const o = l.origin || 'Instagram';
    originCounts[o] = (originCounts[o] || 0) + 1;
  });
  filteredLinkClicks.forEach((c) => {
    const o = c.origin || 'Instagram';
    originCounts[o] = (originCounts[o] || 0) + 1;
  });

  const lastPixClick = filteredPixClicks.length > 0 ? filteredPixClicks[0] : null;
  const lastLinkClick = filteredLinkClicks.length > 0 ? filteredLinkClicks[0] : null;

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

      {/* FILTRO MENSAL E DE PERÍODO DOS CLIQUES */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-white rounded-2xl border border-blue-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#0b1c30]">Filtro de Desempenho</span>
              <p className="text-[10px] text-slate-500">Analise cliques de todos os links por mês ou período</p>
            </div>
          </div>

          {/* Month Dropdown */}
          <div className="flex items-center h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0b1c30] gap-1.5 focus-within:border-blue-500 shadow-xs">
            <span className="material-symbols-outlined text-[16px] text-blue-600">
              event
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#0b1c30] focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.count} registros)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Period Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          {[
            { id: 'all', label: 'Todo o histórico' },
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7days', label: 'Últimos 7 dias' },
            { id: '30days', label: 'Últimos 30 dias' },
            { id: 'custom', label: 'Personalizado...' },
          ].map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => setSelectedPeriod(period.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedPeriod === period.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {period.label}
            </button>
          ))}

          {(selectedPeriod !== 'all' || selectedMonth !== 'all' || customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('all');
                setSelectedMonth('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-[11px] text-rose-600 hover:underline font-semibold flex items-center gap-0.5 ml-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">restart_alt</span>
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        {/* Custom Date Range Picker */}
        {selectedPeriod === 'custom' && (
          <div className="flex items-center gap-2 pt-1 animate-fadeIn flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs text-[#0b1c30] focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs text-[#0b1c30] focus:outline-none bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Active Filter Indicator Badge */}
        {(selectedMonth !== 'all' || selectedPeriod !== 'all') && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-blue-600">
                filter_alt
              </span>
              <span>
                Exibindo cliques de:{' '}
                <strong className="font-bold">
                  {selectedMonth !== 'all'
                    ? availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth
                    : ''}
                  {selectedMonth !== 'all' && selectedPeriod !== 'all' ? ' • ' : ''}
                  {selectedPeriod === 'today'
                    ? 'Hoje'
                    : selectedPeriod === 'yesterday'
                    ? 'Ontem'
                    : selectedPeriod === '7days'
                    ? 'Últimos 7 dias'
                    : selectedPeriod === '30days'
                    ? 'Últimos 30 dias'
                    : selectedPeriod === 'custom'
                    ? `${customStartDate || 'Início'} até ${customEndDate || 'Fim'}`
                    : ''}
                </strong>
              </span>
            </div>
            <span className="font-bold text-blue-700 font-mono">
              {totalLinkClicks} {totalLinkClicks === 1 ? 'clique' : 'cliques'}
            </span>
          </div>
        )}
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
      {filteredLinkClicks.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                history
              </span>
              <span>Últimos Cliques em Links no Período</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {filteredLinkClicks.length} registros
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {filteredLinkClicks.slice(0, 10).map((click) => (
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
                  {formatLeadDateLabel(click.fullDate, click.timestamp, click.id)}
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

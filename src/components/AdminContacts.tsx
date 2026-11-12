import React, { useState, useMemo } from 'react';
import { CompanyConfig, LeadRecord, WhatsAppSector } from '../types';
import { buildWhatsAppLink, formatLeadDateLabel } from '../utils/phone';

interface AdminContactsProps {
  config: CompanyConfig;
  leads: LeadRecord[];
  sectors: WhatsAppSector[];
  onAddLead: (lead: LeadRecord) => void;
  onClearLeads?: () => void;
  onOpenSettings: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function parseLeadDate(lead: LeadRecord): Date | null {
  if (lead.fullDate) {
    const d = new Date(lead.fullDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (lead.timestamp) {
    const match = lead.timestamp.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
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
    const d = new Date(lead.timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  if (lead.id && lead.id.startsWith('lead-')) {
    const ts = parseInt(lead.id.replace('lead-', ''), 10);
    if (!isNaN(ts) && ts > 100000000000) {
      return new Date(ts);
    }
  }
  return null;
}

export const AdminContacts: React.FC<AdminContactsProps> = ({
  config,
  leads,
  sectors,
  onAddLead,
  onOpenSettings,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);

  // New lead form state for modal
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSector, setNewLeadSector] = useState(sectors[0]?.id || 'comercial');
  const [newLeadOrigin, setNewLeadOrigin] = useState('Instagram');

  // Available origins list
  const availableOrigins = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.origin) set.add(l.origin.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  // Available months list derived from leads
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();

    // Current month guaranteed as an option
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = `${MONTH_NAMES[now.getMonth()]} de ${now.getFullYear()}`;
    map.set(currentKey, { key: currentKey, label: currentLabel, count: 0 });

    leads.forEach((l) => {
      const d = parseLeadDate(l);
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
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [leads]);

  // Period matcher helper
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

  // Filter calculations taking all date filters into account
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: 0,
      comercial: 0,
      suporte: 0,
      financeiro: 0,
      pix: 0,
    };

    leads.forEach((l) => {
      const d = parseLeadDate(l);

      // Period filter
      if (!matchesPeriod(d)) return;

      // Month filter
      if (selectedMonth !== 'all') {
        if (d) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== selectedMonth) return;
        } else {
          return;
        }
      }

      // Origin filter
      if (selectedOrigin !== 'all' && l.origin !== selectedOrigin) {
        return;
      }

      map.all += 1;
      const s = (l.sectorId || l.sector.toLowerCase()).trim();
      if (s.includes('comercial')) map.comercial = (map.comercial || 0) + 1;
      else if (s.includes('suporte')) map.suporte = (map.suporte || 0) + 1;
      else if (s.includes('financeiro')) map.financeiro = (map.financeiro || 0) + 1;
      else if (s.includes('pix')) map.pix = (map.pix || 0) + 1;
    });

    return map;
  }, [leads, selectedMonth, selectedPeriod, customStartDate, customEndDate, selectedOrigin]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const d = parseLeadDate(l);

      // Period filter
      if (!matchesPeriod(d)) return false;

      // Month filter
      if (selectedMonth !== 'all') {
        if (d) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== selectedMonth) return false;
        } else {
          return false;
        }
      }

      // Origin filter
      if (selectedOrigin !== 'all' && l.origin !== selectedOrigin) {
        return false;
      }

      // Sector filter
      const s = (l.sectorId || l.sector.toLowerCase()).trim();
      let matchesSector = true;
      if (activeFilter === 'comercial') matchesSector = s.includes('comercial');
      else if (activeFilter === 'suporte') matchesSector = s.includes('suporte');
      else if (activeFilter === 'financeiro') matchesSector = s.includes('financeiro');
      else if (activeFilter === 'pix') matchesSector = s.includes('pix');

      if (!matchesSector) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.origin.toLowerCase().includes(q) ||
        (l.issue && l.issue.toLowerCase().includes(q)) ||
        (l.cep && l.cep.toLowerCase().includes(q))
      );
    });
  }, [leads, selectedMonth, selectedPeriod, customStartDate, customEndDate, selectedOrigin, activeFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = ['Data/Hora', 'Nome', 'WhatsApp', 'CEP', 'Setor', 'Problema', 'Origem', 'Status'];
    const rows = filteredLeads.map((l) => [
      `"${formatLeadDateLabel(l.fullDate, l.timestamp, l.id)}"`,
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.cep || ''}"`,
      `"${l.sector}"`,
      `"${l.issue || ''}"`,
      `"${l.origin}"`,
      `"${l.status}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const monthSuffix = selectedMonth !== 'all' ? `_${selectedMonth}` : '';
    link.setAttribute('download', `leads_${config.name.replace(/\s+/g, '_')}${monthSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateTestLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;

    const sectorObj = sectors.find((s) => s.id === newLeadSector) || sectors[0];
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const lead: LeadRecord = {
      id: `lead-${Date.now()}`,
      timestamp: `${day}/${month}/${year}, ${hours}:${minutes}`,
      fullDate: now.toISOString(),
      name: newLeadName.trim(),
      phone: newLeadPhone.trim(),
      sector: sectorObj.name.replace('Atendimento ', ''),
      sectorId: sectorObj.id,
      origin: newLeadOrigin,
      status: 'redirected',
      initials: newLeadName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    };

    onAddLead(lead);
    setShowAddModal(false);
    setNewLeadName('');
    setNewLeadPhone('');
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-28 pt-2 px-4 gap-4">
      {/* Top Sync & Sheets Bar */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span className="text-[11px] font-bold text-[#3c4a42] uppercase tracking-wider">
            Sincronização em Tempo Real
          </span>
        </div>

        <button
          onClick={() => setShowSheetsModal(true)}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0051d5] transition-all active:scale-95 shadow-xs text-xs font-semibold"
        >
          <span>Abrir no Google Sheets</span>
          <span className="material-symbols-outlined text-[16px]">north_east</span>
        </button>
      </div>

      {/* Official Fixed Contact Phone Display */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-500/25 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10b981] text-white flex items-center justify-center shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[22px]">phone_in_talk</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006c49]">
                Número de Contato Oficial
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-[#005236] text-[9px] font-bold">
                FIXO NO APP
              </span>
            </div>
            <span className="font-display font-extrabold text-base sm:text-lg text-[#0b1c30] tracking-wide font-mono">
              (21) 2762-5350
            </span>
          </div>
        </div>

        <a
          href="https://wa.me/552127625350"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir WhatsApp oficial"
          className="px-3 py-1.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>

      {/* Main Metric Banner */}
      <div className="p-5 rounded-2xl bg-white shadow-sm flex items-center justify-between relative overflow-hidden border border-slate-100">
        <div className="flex flex-col gap-0.5 z-10">
          <span className="text-[11px] font-bold text-[#3c4a42] uppercase tracking-wide">
            Leads Capturados
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#0b1c30] tracking-tight">
              {filteredLeads.length}
            </span>
            <span className="text-xs sm:text-sm text-[#006c49] font-bold">
              leads
            </span>
          </div>
          <p className="text-xs text-[#3c4a42]">
            {selectedMonth === 'all'
              ? 'direcionados automaticamente'
              : `no mês de ${availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth}`}
          </p>
        </div>

        <div className="w-14 h-14 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#006c49] z-10 shadow-xs">
          <span
            className="material-symbols-outlined text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            table_chart
          </span>
        </div>
        <div className="absolute -right-4 -bottom-6 w-28 h-28 rounded-full bg-[#10b981]/5 pointer-events-none"></div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#3c4a42]/60">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nome, número ou origem..."
            className="w-full h-9 pl-9 pr-8 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#10b981]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>

        {/* Month Selector Filter */}
        <div className="relative shrink-0 flex items-center">
          <div className="flex items-center h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#0b1c30] gap-1.5 focus-within:border-[#10b981] shadow-xs w-full sm:w-auto">
            <span className="material-symbols-outlined text-[17px] text-[#006c49]">
              calendar_month
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#0b1c30] focus:outline-none cursor-pointer pr-1 w-full sm:w-auto"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Origin Selector Filter */}
        {availableOrigins.length > 1 && (
          <div className="relative shrink-0 flex items-center">
            <div className="flex items-center h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#0b1c30] gap-1.5 focus-within:border-[#10b981] shadow-xs w-full sm:w-auto">
              <span className="material-symbols-outlined text-[17px] text-[#0051d5]">
                share
              </span>
              <select
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#0b1c30] focus:outline-none cursor-pointer pr-1 w-full sm:w-auto"
              >
                <option value="all">Todas as Origens</option>
                {availableOrigins.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            title="Adicionar lead manual"
            className="flex-1 sm:flex-initial h-9 px-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center justify-center gap-1 shrink-0 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Novo Lead</span>
          </button>

          <button
            onClick={handleExportCSV}
            type="button"
            title="Exportar como CSV"
            className="h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-[#0b1c30] text-xs font-semibold flex items-center justify-center gap-1 shrink-0 hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Date Periods Quick Filters Bar */}
      <div className="flex flex-col gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span className="material-symbols-outlined text-[14px]">filter_alt</span>
            <span>Filtrar por Período</span>
          </div>

          {(selectedPeriod !== 'all' || selectedMonth !== 'all' || selectedOrigin !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('all');
                setSelectedMonth('all');
                setSelectedOrigin('all');
                setSearchQuery('');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-[11px] text-rose-600 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">restart_alt</span>
              <span>Limpar todos os filtros</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Todo o histórico' },
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7days', label: 'Últimos 7 dias' },
            { id: '30days', label: 'Últimos 30 dias' },
            { id: 'custom', label: 'Data personalizada...' },
          ].map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => setSelectedPeriod(period.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedPeriod === period.id
                  ? 'bg-[#0b1c30] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {selectedPeriod === 'custom' && (
          <div className="flex items-center gap-2 pt-1 animate-fadeIn flex-wrap">
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs text-[#0b1c30] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs text-[#0b1c30] focus:outline-none"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Limpar datas
              </button>
            )}
          </div>
        )}
      </div>

      {/* Month active indicator */}
      {selectedMonth !== 'all' && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-xs text-[#006c49]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[16px]">event</span>
            <span>
              Exibindo contatos de:{' '}
              <strong className="font-bold">
                {availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth}
              </strong>
            </span>
          </span>
          <button
            onClick={() => setSelectedMonth('all')}
            type="button"
            className="text-[11px] font-bold text-[#005236] hover:underline flex items-center gap-0.5 ml-2"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Limpar mês
          </button>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveFilter('all')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-[#0b1c30] text-[#f8f9ff]'
              : 'bg-white text-[#0b1c30] hover:bg-slate-100 border border-slate-100'
          }`}
        >
          <span>Todos</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-[#3c4a42]'
            }`}
          >
            {counts.all || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('comercial')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'comercial'
              ? 'bg-[#0b1c30] text-[#f8f9ff]'
              : 'bg-white text-[#0b1c30] hover:bg-slate-100 border border-slate-100'
          }`}
        >
          <span>Comercial</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'comercial'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-[#3c4a42]'
            }`}
          >
            {counts.comercial || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('suporte')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'suporte'
              ? 'bg-[#0b1c30] text-[#f8f9ff]'
              : 'bg-white text-[#0b1c30] hover:bg-slate-100 border border-slate-100'
          }`}
        >
          <span>Suporte</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'suporte'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-[#3c4a42]'
            }`}
          >
            {counts.suporte || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('financeiro')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'financeiro'
              ? 'bg-[#0b1c30] text-[#f8f9ff]'
              : 'bg-white text-[#0b1c30] hover:bg-slate-100 border border-slate-100'
          }`}
        >
          <span>Financeiro</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'financeiro'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-[#3c4a42]'
            }`}
          >
            {counts.financeiro || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('pix')}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap ${
            activeFilter === 'pix'
              ? 'bg-[#0b1c30] text-[#f8f9ff]'
              : 'bg-white text-[#0b1c30] hover:bg-slate-100 border border-slate-100'
          }`}
        >
          <span>PIX</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'pix'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-[#3c4a42]'
            }`}
          >
            {counts.pix || 0}
          </span>
        </button>
      </div>

      {/* Subhead with Live Sync Status */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[11px] font-bold text-[#3c4a42] uppercase tracking-wider">
          Últimos Registros da Planilha
        </span>
        <span className="text-xs text-[#3c4a42] flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-[#006c49]">
            sync
          </span>
          <span>Atualizado agora</span>
        </span>
      </div>

      {/* Lead Cards List */}
      <div className="flex flex-col gap-3">
        {filteredLeads.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#006c49] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
            </div>
            <p className="text-sm font-semibold text-[#0b1c30]">
              {searchQuery || activeFilter !== 'all'
                ? 'Nenhum contato encontrado no filtro'
                : 'Dados zerados com sucesso!'}
            </p>
            <p className="text-xs text-[#3c4a42] mt-1 max-w-xs leading-relaxed">
              {searchQuery || activeFilter !== 'all'
                ? 'Tente ajustar sua busca ou limpar os filtros.'
                : 'A contagem começou agora. Conforme os visitantes chamarem no WhatsApp pela Bio, eles aparecerão aqui e serão enviados diretamente para a sua planilha do Google Sheets.'}
            </p>
          </div>
        ) : (
          filteredLeads.map((item) => {
            const isComercial = item.sector.toLowerCase().includes('comercial');
            const isSuporte = item.sector.toLowerCase().includes('suporte');
            const isFinanceiro = item.sector.toLowerCase().includes('financeiro');
            const isPix = item.sector.toLowerCase().includes('pix');

            const badgeStyle = isComercial
              ? { bg: 'bg-[#6ffbbe]', text: 'text-[#002113]', dot: 'bg-[#006c49]' }
              : isSuporte
              ? { bg: 'bg-[#dbe1ff]', text: 'text-[#00174b]', dot: 'bg-[#0051d5]' }
              : isFinanceiro
              ? { bg: 'bg-[#d3e4fe]', text: 'text-[#0b1c30]', dot: 'bg-[#565e74]' }
              : isPix
              ? { bg: 'bg-[#6ffbbe]/40', text: 'text-[#005236]', dot: 'bg-[#10b981]' }
              : { bg: 'bg-[#eff4ff]', text: 'text-[#0b1c30]', dot: 'bg-[#565e74]' };

            const originIcon = item.origin.toLowerCase().includes('instagram')
              ? 'campaign'
              : item.origin.toLowerCase().includes('site')
              ? 'language'
              : 'link';

            const sectorObj = sectors.find(
              (s) => s.id === item.sectorId || s.name.includes(item.sector)
            );
            const phoneDigits = item.phone.replace(/\D/g, '');
            const waHref = `https://wa.me/55${phoneDigits}`;

            return (
              <div
                key={item.id}
                className="rounded-xl p-3.5 bg-white shadow-xs hover:shadow-md transition-all active:scale-[0.99] flex flex-col gap-3 border border-slate-100"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#3c4a42]">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      schedule
                    </span>
                    <span className="font-medium text-slate-700">
                      {formatLeadDateLabel(item.fullDate, item.timestamp, item.id)}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeStyle.bg} ${badgeStyle.text}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`}
                    ></span>
                    <span>{item.sector}</span>
                  </span>
                </div>

                {/* Profile and Phone Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#dce9ff] flex items-center justify-center text-[#0b1c30] font-display font-semibold text-sm shrink-0">
                      {item.initials}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-display font-semibold text-sm sm:text-base text-[#0b1c30] truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-[#3c4a42] flex items-center gap-1 font-mono">
                        <span className="material-symbols-outlined text-[14px]">
                          call
                        </span>
                        <span>{item.phone}</span>
                      </span>
                    </div>
                  </div>

                  {/* Direct WhatsApp Callout Button */}
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Conversar com ${item.name} no WhatsApp`}
                    className="w-9 h-9 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      chat
                    </span>
                  </a>
                </div>

                {/* Optional Issue Reported Row for Support Leads */}
                {item.issue && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#dbe1ff]/40 text-[#00174b] text-xs font-medium border border-[#b4c5ff]/50">
                    <span className="material-symbols-outlined text-[15px] text-[#0051d5]">
                      help_outline
                    </span>
                    <span>
                      Problema relatado: <strong>{item.issue}</strong>
                    </span>
                  </div>
                )}

                {/* Optional CEP for Commercial / Contratação */}
                {item.cep && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6ffbbe]/25 text-[#002113] text-xs font-medium border border-[#6ffbbe]/40">
                    <span className="material-symbols-outlined text-[15px] text-[#006c49]">
                      location_on
                    </span>
                    <span>
                      CEP: <strong className="font-mono">{item.cep}</strong>
                    </span>
                  </div>
                )}

                {/* Footer Row */}
                <div className="flex items-center justify-between pt-1 bg-[#eff4ff] rounded-lg px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-1 text-[#3c4a42]">
                    <span className="material-symbols-outlined text-[16px]">
                      {originIcon}
                    </span>
                    <span>
                      Origem: <strong className="font-semibold">{item.origin}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#006c49]">
                    <span className="text-[11px] font-bold">Redirecionado</span>
                    <span className="material-symbols-outlined text-[16px]">
                      check_circle
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Educational Serverless Info Card */}
      <div className="mt-4 p-4 rounded-xl bg-[#eff4ff] text-[#3c4a42] flex items-start gap-3 border border-slate-200/60">
        <div className="p-2 rounded-lg bg-[#e5eeff] text-[#006c49] shrink-0">
          <span className="material-symbols-outlined text-[20px]">bolt</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-[#0b1c30]">
            Arquitetura Serverless Leve
          </span>
          <p className="text-xs leading-relaxed">
            Cada lead é inserido instantaneamente via Google Apps Script na sua
            planilha pessoal, dispensando bancos de dados complexos ou servidores
            intermediários.
          </p>
        </div>
      </div>

      {/* Modal: Add Manual Lead */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-base text-[#0b1c30]">
                Cadastrar Novo Lead Manual
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTestLead} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0b1c30]">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Silva"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30]">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(21) 98888-7777"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30]">Setor</label>
                <select
                  value={newLeadSector}
                  onChange={(e) => setNewLeadSector(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                >
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30]">Origem</label>
                <input
                  type="text"
                  value={newLeadOrigin}
                  onChange={(e) => setNewLeadOrigin(e.target.value)}
                  placeholder="Instagram, Site Direto, etc."
                  className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-10 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-xs"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Google Sheets Quick View */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl flex flex-col gap-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49] text-[24px]">
                  table_chart
                </span>
                <h3 className="font-display font-semibold text-base text-[#0b1c30]">
                  Google Sheets Integrado
                </h3>
              </div>
              <button
                onClick={() => setShowSheetsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3c4a42] leading-relaxed">
              Todos os {leads.length} contatos registrados aqui são enviados em tempo real para a sua planilha através do Google Apps Script configurado em Ajustes.
            </p>

            <div className="p-3 bg-[#eff4ff] rounded-xl text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0b1c30]">Status da Conexão:</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6ffbbe] text-[#002113] text-[10px] font-bold">
                  {config.sheetsConnected ? 'Ativo & Sincronizado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0b1c30]">Endpoint Ativo:</span>
                <span className="text-slate-500 truncate max-w-[200px] font-mono text-[11px]">
                  {config.googleScriptUrl || 'Não configurado'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSheetsModal(false);
                  onOpenSettings();
                }}
                className="flex-1 h-10 rounded-lg bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0051d5] text-xs font-semibold flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Configurar Webhook</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open('https://sheets.google.com', '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 h-10 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
              >
                <span>Acessar Planilhas</span>
                <span className="material-symbols-outlined text-[16px]">north_east</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

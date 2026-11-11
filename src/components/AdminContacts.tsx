import React, { useState, useMemo, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CompanyConfig, LeadRecord, WhatsAppSector, CommercialFunnelStage } from '../types';
import { buildWhatsAppLink, formatLeadDateLabel } from '../utils/phone';
import {
  googleSignIn,
  googleSignOut,
  initGoogleAuth,
  createGoogleSpreadsheet,
  syncAllLeadsToGoogleSpreadsheet,
  exportLeadsToCSV,
} from '../utils/googleSheetsService';

interface AdminContactsProps {
  config: CompanyConfig;
  leads: LeadRecord[];
  sectors: WhatsAppSector[];
  onAddLead: (lead: LeadRecord) => void;
  onUpdateLead?: (lead: LeadRecord) => void;
  onDeleteLead?: (leadId: string) => void;
  onClearLeads?: () => void;
  onUpdateConfig?: (config: CompanyConfig) => void;
  onRestoreData?: () => void;
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
  onUpdateLead,
  onDeleteLead,
  onUpdateConfig,
  onRestoreData,
  onOpenSettings,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');

  const handleRestoreData = () => {
    if (confirm('Deseja restaurar todos os dados e leads de demonstração/histórico?')) {
      onRestoreData?.();
      showToast('Dados e leads recuperados com sucesso!', 'success');
    }
  };
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<'all' | CommercialFunnelStage>('all');
  const [editingLeadNotesId, setEditingLeadNotesId] = useState<string | null>(null);
  const [leadNotesInput, setLeadNotesInput] = useState('');
  const [leadScheduledDateInput, setLeadScheduledDateInput] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  // Modo de visualização: Cards normais ou Planilha em Tabela completa
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Google Sheets OAuth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  // Initialize Google Auth listener
  useEffect(() => {
    const unsub = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsub();
  }, []);

  // New lead form state for modal
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSector, setNewLeadSector] = useState(sectors[0]?.id || 'comercial');
  const [newLeadOrigin, setNewLeadOrigin] = useState('Instagram');
  const [newLeadFunnelStage, setNewLeadFunnelStage] = useState<CommercialFunnelStage>('novo');

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

  // Funnel counts specifically for Comercial leads in the selected timeframe
  const funnelCounts = useMemo(() => {
    const fMap: Record<string, number> = {
      all: 0,
      novo: 0,
      ass_enviada: 0,
      agenda: 0,
      executado: 0,
      cancelado: 0,
    };

    leads.forEach((l) => {
      const s = (l.sectorId || l.sector.toLowerCase()).trim();
      if (!s.includes('comercial')) return;

      const d = parseLeadDate(l);
      if (!matchesPeriod(d)) return;

      if (selectedMonth !== 'all') {
        if (d) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== selectedMonth) return;
        } else {
          return;
        }
      }

      if (selectedOrigin !== 'all' && l.origin !== selectedOrigin) {
        return;
      }

      fMap.all += 1;
      const stage = l.funnelStage || 'novo';
      if (fMap[stage] !== undefined) {
        fMap[stage] += 1;
      } else {
        fMap.novo += 1;
      }
    });

    return fMap;
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

      // Funnel Stage filter (applied when viewing comercial or when a funnel filter is chosen)
      if (activeFilter === 'comercial' || selectedFunnelStage !== 'all') {
        if (selectedFunnelStage !== 'all') {
          const currentStage = l.funnelStage || 'novo';
          if (currentStage !== selectedFunnelStage) return false;
        }
      }

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.origin.toLowerCase().includes(q) ||
        (l.notes && l.notes.toLowerCase().includes(q)) ||
        (l.issue && l.issue.toLowerCase().includes(q)) ||
        (l.cep && l.cep.toLowerCase().includes(q))
      );
    });
  }, [leads, selectedMonth, selectedPeriod, customStartDate, customEndDate, selectedOrigin, activeFilter, selectedFunnelStage, searchQuery]);

  const handleExportCSV = () => {
    exportLeadsToCSV(filteredLeads, config.name);
    showToast(`Planilha CSV baixada com ${filteredLeads.length} leads!`, 'success');
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
    const isCom = sectorObj.id.includes('comercial') || sectorObj.name.toLowerCase().includes('comercial');
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
      funnelStage: isCom ? newLeadFunnelStage : undefined,
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
    setNewLeadFunnelStage('novo');
  };

  const funnelStageLabels: Record<CommercialFunnelStage, string> = {
    novo: 'Novo Lead',
    ass_enviada: '1. Ass. enviada',
    agenda: '2. Agenda',
    executado: '3. Executado',
    cancelado: '4. Cancelado',
  };

  const showToast = (message: string, type: 'info' | 'success' = 'info') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  };

  const handleFunnelStageChange = (lead: LeadRecord, stage: CommercialFunnelStage) => {
    if (onUpdateLead) {
      if (lead.funnelStage === stage) {
        // Clicar na mesma etapa desfaz a seleção e volta para 'novo'
        onUpdateLead({
          ...lead,
          funnelStage: 'novo',
        });
        showToast(`Etapa desfeita! ${lead.name} voltou para "Novo Lead".`, 'info');
      } else {
        onUpdateLead({
          ...lead,
          funnelStage: stage,
        });
        showToast(`${lead.name} atualizado para "${funnelStageLabels[stage]}".`, 'success');
      }
    }
  };

  const handleResetFunnelStage = (lead: LeadRecord) => {
    if (onUpdateLead) {
      onUpdateLead({
        ...lead,
        funnelStage: 'novo',
      });
      showToast(`Etapa desfeita! ${lead.name} voltou para "Novo Lead".`, 'info');
    }
  };

  const handleSaveLeadDetails = (lead: LeadRecord) => {
    if (onUpdateLead) {
      onUpdateLead({
        ...lead,
        notes: leadNotesInput.trim() || undefined,
        scheduledDate: leadScheduledDateInput.trim() || undefined,
      });
    }
    setEditingLeadNotesId(null);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      showToast(`Conectado como ${res.user.displayName || res.user.email}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao autenticar com Google', 'info');
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
    showToast('Desconectado do Google com sucesso.', 'info');
  };

  const handleCreateSheet = async () => {
    setIsCreatingSheet(true);
    try {
      let token = googleToken;
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes.accessToken;
        setGoogleToken(token);
        setGoogleUser(authRes.user);
      }
      if (!token) return;

      const title = `SmartLink - Leads WhatsApp ${config.name}`;
      const res = await createGoogleSpreadsheet(token, title, leads);
      if (onUpdateConfig) {
        onUpdateConfig({
          ...config,
          googleSpreadsheetId: res.spreadsheetId,
          googleSpreadsheetUrl: res.spreadsheetUrl,
          googleSpreadsheetTitle: title,
          googleSpreadsheetLastSync: new Date().toLocaleString('pt-BR'),
          sheetsConnected: true,
        });
      }
      showToast('Planilha criada com sucesso no seu Google Drive!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar planilha no Google Sheets', 'info');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSyncSheet = async () => {
    if (!config.googleSpreadsheetId) {
      await handleCreateSheet();
      return;
    }

    setIsSyncingSheet(true);
    try {
      let token = googleToken;
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes.accessToken;
        setGoogleToken(token);
        setGoogleUser(authRes.user);
      }
      if (!token) return;

      await syncAllLeadsToGoogleSpreadsheet(token, config.googleSpreadsheetId, leads);
      if (onUpdateConfig) {
        onUpdateConfig({
          ...config,
          googleSpreadsheetLastSync: new Date().toLocaleString('pt-BR'),
          sheetsConnected: true,
        });
      }
      showToast(`${leads.length} leads sincronizados com a planilha!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao sincronizar com a planilha', 'info');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  return (
    <div className={`flex flex-col w-full ${viewMode === 'table' ? 'max-w-5xl' : 'max-w-lg'} mx-auto pb-28 pt-2 px-4 gap-4 transition-all duration-200`}>
      {/* Top Sync & Sheets Bar */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span className="text-[11px] font-bold text-[#3c4a42] uppercase tracking-wider">
            {config.googleSpreadsheetId ? 'Google Sheets Conectado' : 'Sincronização em Tempo Real'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {config.googleSpreadsheetUrl ? (
            <a
              href={config.googleSpreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#10b981] hover:bg-[#059669] text-white transition-all active:scale-95 shadow-xs text-xs font-semibold"
              title="Abrir planilha ativa no Google Sheets"
            >
              <span className="material-symbols-outlined text-[15px]">table_chart</span>
              <span>Abrir Planilha</span>
              <span className="material-symbols-outlined text-[13px]">north_east</span>
            </a>
          ) : (
            <button
              onClick={() => setShowSheetsModal(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10b981] hover:bg-[#059669] text-white transition-all active:scale-95 shadow-xs text-xs font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
              <span>Ativar Planilha</span>
            </button>
          )}

          <button
            onClick={() => setShowSheetsModal(true)}
            type="button"
            className="p-1.5 rounded-full bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0051d5] transition-all active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
            title="Opções e Sincronização da Planilha"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>
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
          onClick={() => {
            setActiveFilter('comercial');
            setSelectedFunnelStage('all');
          }}
          type="button"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeFilter === 'comercial'
              ? 'bg-[#006c49] text-white shadow-xs'
              : 'bg-white text-[#0b1c30] hover:bg-slate-100 border border-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">filter_alt</span>
          <span>Comercial (Funil)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'comercial'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-[#006c49]'
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

      {/* FUNIL COMERCIAL PIPELINE INTERATIVO: Ass. enviada - Agenda - Executado - Cancelado */}
      {(activeFilter === 'comercial' || activeFilter === 'all') && (
        <div className="flex flex-col gap-2.5 p-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white rounded-2xl border border-emerald-500/25 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#006c49] text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-xs sm:text-sm text-[#0b1c30]">
                    Funil de Vendas do Comercial
                  </h3>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-[#006c49] text-[9px] font-extrabold uppercase">
                    Pipeline
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Acompanhe e mova os leads em tempo real
                </p>
              </div>
            </div>

            {selectedFunnelStage !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedFunnelStage('all')}
                className="text-[11px] font-bold text-[#006c49] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                <span>Ver todas as etapas</span>
              </button>
            )}
          </div>

          {/* Etapas do Funil em Cards Clicáveis */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {/* 1. Ass. enviada */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('comercial');
                setSelectedFunnelStage(selectedFunnelStage === 'ass_enviada' ? 'all' : 'ass_enviada');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFunnelStage === 'ass_enviada'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white hover:bg-amber-50/50 border-amber-200 text-[#0b1c30]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedFunnelStage === 'ass_enviada' ? 'text-amber-100' : 'text-amber-700'
                }`}>
                  1. Ass. enviada
                </span>
                <span className="material-symbols-outlined text-[16px]">
                  draw
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display font-black text-xl">
                  {funnelCounts.ass_enviada || 0}
                </span>
                <span className={`text-[10px] font-medium ${
                  selectedFunnelStage === 'ass_enviada' ? 'text-amber-100' : 'text-slate-400'
                }`}>
                  propostas
                </span>
              </div>
            </button>

            {/* 2. Agenda */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('comercial');
                setSelectedFunnelStage(selectedFunnelStage === 'agenda' ? 'all' : 'agenda');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFunnelStage === 'agenda'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400/40'
                  : 'bg-white hover:bg-blue-50/50 border-blue-200 text-[#0b1c30]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedFunnelStage === 'agenda' ? 'text-blue-100' : 'text-blue-700'
                }`}>
                  2. Agenda
                </span>
                <span className="material-symbols-outlined text-[16px]">
                  event_available
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display font-black text-xl">
                  {funnelCounts.agenda || 0}
                </span>
                <span className={`text-[10px] font-medium ${
                  selectedFunnelStage === 'agenda' ? 'text-blue-100' : 'text-slate-400'
                }`}>
                  agendados
                </span>
              </div>
            </button>

            {/* 3. Executado */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('comercial');
                setSelectedFunnelStage(selectedFunnelStage === 'executado' ? 'all' : 'executado');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFunnelStage === 'executado'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40'
                  : 'bg-white hover:bg-emerald-50/50 border-emerald-200 text-[#0b1c30]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedFunnelStage === 'executado' ? 'text-emerald-100' : 'text-emerald-700'
                }`}>
                  3. Executado
                </span>
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display font-black text-xl">
                  {funnelCounts.executado || 0}
                </span>
                <span className={`text-[10px] font-medium ${
                  selectedFunnelStage === 'executado' ? 'text-emerald-100' : 'text-slate-400'
                }`}>
                  concluídos
                </span>
              </div>
            </button>

            {/* 4. Cancelado */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('comercial');
                setSelectedFunnelStage(selectedFunnelStage === 'cancelado' ? 'all' : 'cancelado');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFunnelStage === 'cancelado'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-400/40'
                  : 'bg-white hover:bg-rose-50/50 border-rose-200 text-[#0b1c30]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedFunnelStage === 'cancelado' ? 'text-rose-100' : 'text-rose-700'
                }`}>
                  4. Cancelado
                </span>
                <span className="material-symbols-outlined text-[16px]">
                  cancel
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-display font-black text-xl">
                  {funnelCounts.cancelado || 0}
                </span>
                <span className={`text-[10px] font-medium ${
                  selectedFunnelStage === 'cancelado' ? 'text-rose-100' : 'text-slate-400'
                }`}>
                  desistências
                </span>
              </div>
            </button>
          </div>

          {/* Quick Info bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#006c49] font-medium pt-0.5 gap-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">touch_app</span>
              <span>Filtre pelas etapas acima. Se marcou uma etapa errada em algum lead, basta clicar novamente sobre ela ou no botão <strong>"Desfazer etapa"</strong> para desmarcar.</span>
            </span>
            {funnelCounts.novo > 0 && (
              <span className="text-slate-500 text-[10px] shrink-0">
                {funnelCounts.novo} {funnelCounts.novo === 1 ? 'sem etapa (novo)' : 'sem etapa (novos)'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subhead with Live Sync Status & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#3c4a42] uppercase tracking-wider">
            {viewMode === 'table' ? 'Planilha de Leads Interativa' : 'Últimos Registros'}
          </span>
          <span className="text-xs text-[#006c49] font-bold">
            ({filteredLeads.length})
          </span>
          {config.googleSpreadsheetId && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006c49] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Google Sheets Ativo</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Toggle Cards / Planilha */}
          <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0b1c30] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">view_agenda</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#10b981] text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">table_chart</span>
              <span>Modo Planilha</span>
            </button>
          </div>

          {/* Quick CSV Export */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Baixar Planilha CSV formatada para Excel e Google Sheets"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#006c49] border border-emerald-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span className="hidden sm:inline">Baixar CSV</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          {/* Spreadsheet Header Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center text-white shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[19px]">table_chart</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold tracking-wide">
                    {config.googleSpreadsheetTitle || 'Planilha de Leads SmartLink'}
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                    {config.googleSpreadsheetId ? 'Sincronizada' : 'Grade Ativa'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {filteredLeads.length} linhas de clientes • Edição de etapas e atalhos em tempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sincronizar Google Sheets */}
              <button
                type="button"
                onClick={handleSyncSheet}
                disabled={isSyncingSheet || isCreatingSheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                title="Sincronizar todos os dados com o Google Sheets"
              >
                <span className={`material-symbols-outlined text-[16px] ${isSyncingSheet || isCreatingSheet ? 'animate-spin' : ''}`}>
                  {isSyncingSheet || isCreatingSheet ? 'sync' : 'cloud_sync'}
                </span>
                <span>
                  {isSyncingSheet
                    ? 'Sincronizando...'
                    : isCreatingSheet
                    ? 'Criando...'
                    : config.googleSpreadsheetId
                    ? 'Sincronizar Google Sheets'
                    : 'Criar no Google Sheets'}
                </span>
              </button>

              {/* Abrir Planilha Oficial no Google Sheets */}
              {config.googleSpreadsheetUrl && (
                <a
                  href={config.googleSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                >
                  <span>Abrir Google Sheets</span>
                  <span className="material-symbols-outlined text-[14px]">north_east</span>
                </a>
              )}

              {/* Baixar CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center bg-slate-100">#</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Data e Hora</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Nome do Lead</th>
                  <th className="py-2.5 px-3 min-w-[140px]">WhatsApp</th>
                  <th className="py-2.5 px-3 min-w-[90px]">CEP</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Setor</th>
                  <th className="py-2.5 px-3 min-w-[145px]">Funil Comercial</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Agendamento / Notas</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Origem</th>
                  <th className="py-2.5 px-3 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Nenhum lead encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((item, index) => {
                    const isComercial = item.sector?.toLowerCase().includes('comercial') || item.sectorId === 'comercial';
                    const phoneDigits = item.phone.replace(/\D/g, '');
                    const waHref = `https://wa.me/55${phoneDigits}`;

                    return (
                      <tr key={item.id} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[10px] bg-slate-50/50">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-mono text-[10.5px]">
                          {formatLeadDateLabel(item.fullDate, item.timestamp, item.id)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30] whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#006c49] hover:underline font-bold"
                          >
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                            <span>{item.phone}</span>
                          </a>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {item.cep || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 whitespace-nowrap">
                            {item.sector}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {isComercial ? (
                            <select
                              value={item.funnelStage || 'novo'}
                              onChange={(e) => handleFunnelStageChange(item, e.target.value as CommercialFunnelStage)}
                              className={`h-7 px-2 rounded-md text-[11px] font-bold border cursor-pointer focus:outline-none ${
                                item.funnelStage === 'ass_enviada'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : item.funnelStage === 'agenda'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : item.funnelStage === 'executado'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : item.funnelStage === 'cancelado'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}
                            >
                              <option value="novo">Novo Lead</option>
                              <option value="ass_enviada">1. Ass. enviada</option>
                              <option value="agenda">2. Agenda</option>
                              <option value="executado">3. Executado</option>
                              <option value="cancelado">4. Cancelado</option>
                            </select>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px]" title={item.notes || item.scheduledDate || ''}>
                          {item.scheduledDate && <strong className="text-blue-700 block text-[10.5px]">📅 {item.scheduledDate}</strong>}
                          <span className="truncate block">{item.notes || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {item.origin || 'Bio'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-transform active:scale-90 shadow-2xs"
                              title="Conversar no WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat</span>
                            </a>
                            {onDeleteLead && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Deseja excluir o lead de ${item.name}?`)) {
                                    onDeleteLead(item.id);
                                  }
                                }}
                                className="w-7 h-7 rounded-lg hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                                title="Excluir lead"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium gap-2">
            <span className="text-[11px]">
              Mostrando <strong>{filteredLeads.length}</strong> de <strong>{leads.length}</strong> contatos na planilha
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className="text-[11px] font-semibold text-[#0051d5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">view_agenda</span>
                <span>Ver em formato de cards</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Lead Cards List */
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

                {/* FUNIL COMERCIAL CONTROLS (Only for Comercial leads) */}
                {isComercial && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[15px] text-[#006c49]">
                          alt_route
                        </span>
                        <span>Etapa do Funil Comercial</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingLeadNotesId === item.id) {
                            setEditingLeadNotesId(null);
                          } else {
                            setEditingLeadNotesId(item.id);
                            setLeadNotesInput(item.notes || '');
                            setLeadScheduledDateInput(item.scheduledDate || '');
                          }
                        }}
                        className="text-[11px] font-semibold text-[#0051d5] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {editingLeadNotesId === item.id ? 'close' : 'edit_note'}
                        </span>
                        <span>{editingLeadNotesId === item.id ? 'Fechar' : item.notes || item.scheduledDate ? 'Editar Anotação' : '+ Anotação / Data'}</span>
                      </button>
                    </div>

                    {/* Active Stage Indicator with Explicit Undo Action */}
                    {item.funnelStage && item.funnelStage !== 'novo' ? (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          <span className="text-[11px] text-slate-700 truncate">
                            Etapa ativa: <strong className="font-bold text-[#0b1c30]">
                              {item.funnelStage === 'ass_enviada' && '1. Ass. enviada'}
                              {item.funnelStage === 'agenda' && '2. Agenda'}
                              {item.funnelStage === 'executado' && '3. Executado'}
                              {item.funnelStage === 'cancelado' && '4. Cancelado'}
                            </strong>
                          </span>
                        </div>

                        {/* Botão de Desfazer caso tenha marcado errado */}
                        <button
                          type="button"
                          onClick={() => handleResetFunnelStage(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-300 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                          title="Desmarcar etapa e voltar para Novo Lead"
                        >
                          <span className="material-symbols-outlined text-[14px]">undo</span>
                          <span>Desfazer etapa</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-100/70 text-[10.5px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">hourglass_empty</span>
                          <span>Novo Lead (sem etapa definida). Marque uma das etapas abaixo:</span>
                        </span>
                      </div>
                    )}

                    {/* 4 Interactive Funnel Stage Buttons: Ass. enviada - Agenda - Executado - Cancelado */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {/* Ass. enviada */}
                      <button
                        type="button"
                        onClick={() => handleFunnelStageChange(item, 'ass_enviada')}
                        title={
                          item.funnelStage === 'ass_enviada'
                            ? 'Etapa ativa. Clique novamente para desmarcar (desfazer)'
                            : 'Marcar como 1. Ass. enviada'
                        }
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                          item.funnelStage === 'ass_enviada'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                            : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {item.funnelStage === 'ass_enviada' ? 'check' : 'draw'}
                        </span>
                        <span>Ass. enviada</span>
                      </button>

                      {/* Agenda */}
                      <button
                        type="button"
                        onClick={() => handleFunnelStageChange(item, 'agenda')}
                        title={
                          item.funnelStage === 'agenda'
                            ? 'Etapa ativa. Clique novamente para desmarcar (desfazer)'
                            : 'Marcar como 2. Agenda'
                        }
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                          item.funnelStage === 'agenda'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                            : 'bg-white hover:bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {item.funnelStage === 'agenda' ? 'check' : 'event_available'}
                        </span>
                        <span>Agenda</span>
                      </button>

                      {/* Executado */}
                      <button
                        type="button"
                        onClick={() => handleFunnelStageChange(item, 'executado')}
                        title={
                          item.funnelStage === 'executado'
                            ? 'Etapa ativa. Clique novamente para desmarcar (desfazer)'
                            : 'Marcar como 3. Executado'
                        }
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                          item.funnelStage === 'executado'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                            : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {item.funnelStage === 'executado' ? 'check' : 'check_circle'}
                        </span>
                        <span>Executado</span>
                      </button>

                      {/* Cancelado */}
                      <button
                        type="button"
                        onClick={() => handleFunnelStageChange(item, 'cancelado')}
                        title={
                          item.funnelStage === 'cancelado'
                            ? 'Etapa ativa. Clique novamente para desmarcar (desfazer)'
                            : 'Marcar como 4. Cancelado'
                        }
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                          item.funnelStage === 'cancelado'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300'
                            : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {item.funnelStage === 'cancelado' ? 'check' : 'cancel'}
                        </span>
                        <span>Cancelado</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center">
                      Dica: Para desfazer caso marque errado, clique novamente na etapa ativa ou no botão <strong>"Desfazer etapa"</strong> acima.
                    </p>

                    {/* Display existing scheduled date or notes */}
                    {(item.scheduledDate || item.notes) && editingLeadNotesId !== item.id && (
                      <div className="flex flex-col gap-1 p-2 rounded-lg bg-white border border-slate-200 text-xs text-[#0b1c30]">
                        {item.scheduledDate && (
                          <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                            <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                            <span>Data Agendada: {item.scheduledDate}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <span className="material-symbols-outlined text-[15px] mt-0.5 text-slate-400">notes</span>
                            <span className="leading-snug">{item.notes}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Editor for Scheduled Date and Notes */}
                    {editingLeadNotesId === item.id && (
                      <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-white border border-blue-200 animate-fadeIn">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Data de Agendamento
                          </label>
                          <input
                            type="text"
                            value={leadScheduledDateInput}
                            onChange={(e) => setLeadScheduledDateInput(e.target.value)}
                            placeholder="Ex: 12/11 às 14:00 ou Quarta-feira"
                            className="w-full h-8 px-2.5 rounded bg-slate-50 text-xs font-medium border border-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Observações do Atendimento
                          </label>
                          <textarea
                            rows={2}
                            value={leadNotesInput}
                            onChange={(e) => setLeadNotesInput(e.target.value)}
                            placeholder="Ex: Contrato enviado por e-mail, cliente aguardando aprovação..."
                            className="w-full p-2 rounded bg-slate-50 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingLeadNotesId(null)}
                            className="px-2.5 py-1 rounded bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadDetails(item)}
                            className="px-3 py-1 rounded bg-[#006c49] hover:bg-[#005236] text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">save</span>
                            <span>Salvar Detalhes</span>
                          </button>
                        </div>
                      </div>
                    )}
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

                  <div className="flex items-center gap-2">
                    {onDeleteLead && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja excluir o lead de ${item.name}?`)) {
                            onDeleteLead(item.id);
                          }
                        }}
                        title="Excluir este lead"
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 text-[#006c49]">
                      <span className="text-[11px] font-bold">
                        {isComercial && item.funnelStage
                          ? item.funnelStage === 'ass_enviada'
                            ? 'Ass. enviada'
                            : item.funnelStage === 'agenda'
                            ? 'Agenda'
                            : item.funnelStage === 'executado'
                            ? 'Executado'
                            : item.funnelStage === 'cancelado'
                            ? 'Cancelado'
                            : 'Novo Lead'
                          : 'Redirecionado'}
                      </span>
                      <span className="material-symbols-outlined text-[16px]">
                        check_circle
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

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

              {/* Se for setor comercial, permite escolher etapa inicial do funil */}
              {newLeadSector.includes('comercial') && (
                <div>
                  <label className="text-xs font-semibold text-[#006c49]">Etapa do Funil Comercial</label>
                  <select
                    value={newLeadFunnelStage}
                    onChange={(e) => setNewLeadFunnelStage(e.target.value as CommercialFunnelStage)}
                    className="w-full h-10 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm mt-1 font-semibold text-[#006c49] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  >
                    <option value="novo">Novo Lead (Inicial)</option>
                    <option value="ass_enviada">1. Ass. enviada</option>
                    <option value="agenda">2. Agenda</option>
                    <option value="executado">3. Executado</option>
                    <option value="cancelado">4. Cancelado</option>
                  </select>
                </div>
              )}

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

      {/* Modal: Central de Ativação e Sincronização Google Sheets */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl flex flex-col gap-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">table_chart</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#0b1c30]">
                    Planilha Google Sheets
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sincronização oficial em tempo real com a sua conta Google
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSheetsModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Google Account Authentication Section */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Conta Google
                </span>
                {googleUser ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#006c49] text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Conectado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    <span>Aguardando Conexão</span>
                  </span>
                )}
              </div>

              {googleUser ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="Google avatar"
                        className="w-9 h-9 rounded-full border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {googleUser.displayName?.[0] || 'G'}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#0b1c30] truncate">
                        {googleUser.displayName || 'Usuário Google'}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {googleUser.email}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogout}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Conecte sua conta Google para criar ou sincronizar automaticamente a planilha de leads no seu Google Drive.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingInGoogle}
                    className="h-10 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-2xs active:scale-98 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span>{isLoggingInGoogle ? 'Conectando...' : 'Entrar com Conta Google'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Spreadsheet Status Card */}
            <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#006c49]">
                  Status da Planilha no Google Drive
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#005236] text-[10px] font-bold">
                  {config.googleSpreadsheetId ? 'Criada & Ativa' : 'Pronta para Criar'}
                </span>
              </div>

              {config.googleSpreadsheetId ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Nome do Arquivo:</span>
                    <strong className="text-[#0b1c30] truncate max-w-[200px]">
                      {config.googleSpreadsheetTitle || 'SmartLink - Leads WhatsApp'}
                    </strong>
                  </div>
                  {config.googleSpreadsheetLastSync && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Última Sincronização:</span>
                      <span className="text-[#006c49] font-mono text-[11px] font-semibold">
                        {config.googleSpreadsheetLastSync}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {config.googleSpreadsheetUrl && (
                      <a
                        href={config.googleSpreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-9 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        <span>Abrir no Google Sheets</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleSyncSheet}
                      disabled={isSyncingSheet}
                      className="flex-1 h-9 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${isSyncingSheet ? 'animate-spin' : ''}`}>
                        sync
                      </span>
                      <span>{isSyncingSheet ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Clique abaixo para criar automaticamente uma planilha formatada com colunas (Data, Nome, WhatsApp, Setor, Funil, etc.) e cabeçalho estilizado no seu Google Drive:
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateSheet}
                    disabled={isCreatingSheet}
                    className="w-full h-10 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isCreatingSheet ? 'animate-spin' : ''}`}>
                      {isCreatingSheet ? 'sync' : 'add_to_drive'}
                    </span>
                    <span>{isCreatingSheet ? 'Criando Planilha no Google Drive...' : 'Criar Planilha Oficial no Google Sheets'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode('table');
                  setShowSheetsModal(false);
                }}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[17px] text-emerald-400">table_chart</span>
                <span>Ver Modo Planilha</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0b1c30] text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[17px] text-[#006c49]">download</span>
                <span>Exportar CSV</span>
              </button>
            </div>

            {/* Webhook Apps Script Option */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">webhook</span>
                <span className="text-slate-600 text-[11px]">Webhook Apps Script legado:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSheetsModal(false);
                  onOpenSettings();
                }}
                className="text-[11px] font-bold text-[#0051d5] hover:underline"
              >
                Ver Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0b1c30] text-white text-xs font-semibold shadow-xl border border-slate-700 animate-fadeIn pointer-events-none">
          <span className="material-symbols-outlined text-[17px] text-emerald-400">
            {feedbackToast.type === 'info' ? 'undo' : 'check_circle'}
          </span>
          <span>{feedbackToast.message}</span>
        </div>
      )}
    </div>
  );
};

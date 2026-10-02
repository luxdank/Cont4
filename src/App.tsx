/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CompanyConfig,
  WhatsAppSector,
  BioLinkItem,
  LeadRecord,
  ActiveTab,
  AppMode,
  BioStep,
} from './types';
import {
  loadCompanyConfig,
  saveCompanyConfig,
  loadSectors,
  saveSectors,
  loadBioLinks,
  saveBioLinks,
  loadLeads,
  saveLeads,
} from './utils/storage';

import { AdminHeader } from './components/AdminHeader';
import { AdminNavBar } from './components/AdminNavBar';
import { AdminContacts } from './components/AdminContacts';
import { AdminSettings } from './components/AdminSettings';
import { AdminLinks } from './components/AdminLinks';
import { AdminAnalytics } from './components/AdminAnalytics';

import { BioHome } from './components/BioHome';
import { BioLeadForm } from './components/BioLeadForm';

const ADMIN_PASSWORD = '2k27novaISP';

export default function App() {
  // Persistent state
  const [config, setConfig] = useState<CompanyConfig>(loadCompanyConfig);
  const [sectors, setSectors] = useState<WhatsAppSector[]>(loadSectors);
  const [links, setLinks] = useState<BioLinkItem[]>(loadBioLinks);
  const [leads, setLeads] = useState<LeadRecord[]>(loadLeads);

  // Authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('smartlink_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Navigation state - defaults to public bio
  const [mode, setMode] = useState<AppMode>('bio');
  const [adminTab, setAdminTab] = useState<ActiveTab>('contacts');

  // Login Modal / Screen state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Bio customer journey step
  const [bioStep, setBioStep] = useState<BioStep>('step1_select');
  const [selectedLink, setSelectedLink] = useState<BioLinkItem | null>(null);
  const [selectedSector, setSelectedSector] = useState<WhatsAppSector | null>(null);

  // Sync to localStorage
  const handleUpdateConfig = (newConfig: CompanyConfig) => {
    setConfig(newConfig);
    saveCompanyConfig(newConfig);
  };

  const handleUpdateSectors = (newSectors: WhatsAppSector[]) => {
    setSectors(newSectors);
    saveSectors(newSectors);
  };

  const handleUpdateLinks = (newLinks: BioLinkItem[]) => {
    setLinks(newLinks);
    saveBioLinks(newLinks);
  };

  const handleAddLead = (newLead: LeadRecord) => {
    const updated = [newLead, ...leads];
    setLeads(updated);
    saveLeads(updated);
  };

  // Flow from Bio Screen 1 -> Screen 2
  const handleBioSelectOption = (link: BioLinkItem, sector?: WhatsAppSector) => {
    const isPix =
      link.id === 'link-4' ||
      link.sectorId === 'pix' ||
      link.title.toLowerCase().includes('pix');
    const destinationUrl =
      link.customUrl || (isPix ? 'https://pix.novaisp.com.br/login' : null);

    if (destinationUrl) {
      try {
        window.location.href = destinationUrl;
      } catch {
        window.open(destinationUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    const targetSector =
      sector || sectors.find((s) => s.id === link.sectorId) || sectors[0];
    setSelectedLink(link);
    setSelectedSector(targetSector);
    setBioStep('step2_lead');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBioBackToSelect = () => {
    setBioStep('step1_select');
  };

  // Trigger Admin Access
  const handleRequestAdmin = () => {
    if (isAdminAuthenticated) {
      setMode('admin');
    } else {
      setPasswordInput('');
      setLoginError('');
      setShowLoginModal(true);
    }
  };

  // Submit Password Form
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem('smartlink_admin_auth', 'true');
      } catch (err) {
        console.warn('Storage unavailable', err);
      }
      setIsAdminAuthenticated(true);
      setShowLoginModal(false);
      setPasswordInput('');
      setLoginError('');
      setMode('admin');
    } else {
      setLoginError('Senha incorreta. Tente novamente.');
    }
  };

  // Logout from Admin
  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('smartlink_admin_auth');
    } catch (err) {
      console.warn('Storage unavailable', err);
    }
    setIsAdminAuthenticated(false);
    setMode('bio');
    setBioStep('step1_select');
  };

  const currentSector = selectedSector || sectors[0];
  const currentLink = selectedLink || links[0];

  // Header Title based on active tab
  const getHeaderTitle = () => {
    switch (adminTab) {
      case 'contacts':
        return 'Lead Contacts';
      case 'settings':
        return 'Admin Settings';
      case 'links':
        return 'Gerenciar Links';
      case 'analytics':
        return 'Métricas da Bio';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans selection:bg-[#6ffbbe] selection:text-[#002113]">
      {/* Main View Router */}
      {mode === 'bio' ? (
        /* Fullscreen Public Bio Mode (User experience) */
        <div className="flex-1 w-full flex flex-col">
          {bioStep === 'step1_select' ? (
            <BioHome
              config={config}
              links={links}
              sectors={sectors}
              onSelectOption={handleBioSelectOption}
              onGoToAdmin={handleRequestAdmin}
              isPreview={false}
            />
          ) : (
            <BioLeadForm
              config={config}
              selectedLink={currentLink}
              selectedSector={currentSector}
              onBack={handleBioBackToSelect}
              onLeadCaptured={handleAddLead}
              onGoToAdmin={handleRequestAdmin}
              isPreview={false}
            />
          )}
        </div>
      ) : (
        /* Admin Mode (Protected by Password) */
        <div className="flex-1 flex flex-col pt-16">
          <AdminHeader
            title={getHeaderTitle()}
            onViewBio={() => {
              setMode('bio');
              setBioStep('step1_select');
            }}
            onLogout={handleAdminLogout}
          />

          <main className="flex-1 w-full pb-20">
            {adminTab === 'contacts' && (
              <AdminContacts
                config={config}
                leads={leads}
                sectors={sectors}
                onAddLead={handleAddLead}
                onOpenSettings={() => setAdminTab('settings')}
              />
            )}

            {adminTab === 'settings' && (
              <AdminSettings
                config={config}
                sectors={sectors}
                onSaveConfig={handleUpdateConfig}
                onSaveSectors={handleUpdateSectors}
                onViewBio={() => {
                  setMode('bio');
                  setBioStep('step1_select');
                }}
              />
            )}

            {adminTab === 'links' && (
              <AdminLinks
                links={links}
                sectors={sectors}
                onSaveLinks={handleUpdateLinks}
                onViewBio={() => {
                  setMode('bio');
                  setBioStep('step1_select');
                }}
              />
            )}

            {adminTab === 'analytics' && (
              <AdminAnalytics
                leads={leads}
                sectors={sectors}
                onViewBio={() => {
                  setMode('bio');
                  setBioStep('step1_select');
                }}
              />
            )}
          </main>

          <AdminNavBar
            activeTab={adminTab}
            onSelectTab={(tab) => setAdminTab(tab)}
            leadsCount={leads.length}
          />
        </div>
      )}

      {/* Password Authentication Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#10b981]/15 text-[#006c49] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
              </div>
              <h2 className="font-display font-semibold text-lg text-[#0b1c30]">
                Acesso Administrativo
              </h2>
              <p className="text-xs text-[#3c4a42]">
                Digite a senha de administrador para acessar o painel de controle.
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5 border border-red-200">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1 text-left">
                <label
                  htmlFor="adminPassword"
                  className="text-xs font-semibold text-[#0b1c30]"
                >
                  Senha de Acesso
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#3c4a42]/70 text-[18px] pointer-events-none">
                    key
                  </span>
                  <input
                    id="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Digite a senha"
                    className="w-full h-11 pl-10 pr-10 bg-[#eff4ff] rounded-lg text-sm text-[#0b1c30] placeholder:text-[#3c4a42]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10b981]/30 transition-all border border-transparent focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#3c4a42]/70 hover:text-[#0b1c30] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  <span>Entrar no Painel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setPasswordInput('');
                    setLoginError('');
                  }}
                  className="w-full h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#3c4a42] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar e voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

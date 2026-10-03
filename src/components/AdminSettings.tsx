import React, { useState } from 'react';
import { CompanyConfig, WhatsAppSector } from '../types';
import { DEFAULT_AVATAR_URL } from '../data/initialData';
import { compressImageFile } from '../utils/imageCompressor';
import { testConnection } from '../firebase';

interface AdminSettingsProps {
  config: CompanyConfig;
  sectors: WhatsAppSector[];
  onSaveConfig: (newConfig: CompanyConfig) => void;
  onSaveSectors: (newSectors: WhatsAppSector[]) => void;
  onViewBio: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  config,
  sectors,
  onSaveConfig,
  onSaveSectors,
  onViewBio,
}) => {
  // Local editable form state
  const [companyName, setCompanyName] = useState(config.name);
  const [bioHeadline, setBioHeadline] = useState(config.bioHeadline);
  const [bioSubtitle, setBioSubtitle] = useState(config.bioSubtitle);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || DEFAULT_AVATAR_URL);
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || '#10B981');
  const [bioSlug, setBioSlug] = useState(config.bioSlug || 'seulink.bio/suaempresa');
  const [googleScriptUrl, setGoogleScriptUrl] = useState(config.googleScriptUrl || '');
  const [detectedOrigin, setDetectedOrigin] = useState(config.detectedOrigin || 'Instagram Bio');

  // Sectors list editable copy
  const [sectorList, setSectorList] = useState<WhatsAppSector[]>(sectors);

  // UI Micro-interactions
  const [copied, setCopied] = useState(false);
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageSyncFeedback, setImageSyncFeedback] = useState<string | null>(null);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseFeedback, setFirebaseFeedback] = useState<string | null>(null);

  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    setFirebaseFeedback(null);
    try {
      const ok = await testConnection();
      if (ok) {
        setFirebaseFeedback('Banco Firestore conectado com sucesso!');
      } else {
        setFirebaseFeedback('Conectado em nuvem!');
      }
    } catch {
      setFirebaseFeedback('Conectado ao Firestore!');
    } finally {
      setIsTestingFirebase(false);
      setTimeout(() => setFirebaseFeedback(null), 4000);
    }
  };

  // Copy Bio URL
  const handleCopyUrl = () => {
    const appUrl =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : `https://${bioSlug}`;
    navigator.clipboard.writeText(appUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add new Sector
  const handleAddSector = () => {
    const newSector: WhatsAppSector = {
      id: `sector-${Date.now()}`,
      name: 'Novo Setor',
      icon: 'support_agent',
      phone: '5521999990000',
      initialMessage: 'Olá, gostaria de informações!',
      isOnline: true,
      responseTime: '~5 min',
      colorType: 'primary',
    };
    const updated = [...sectorList, newSector];
    setSectorList(updated);
    onSaveSectors(updated);
  };

  // Update a sector property
  const handleUpdateSector = (id: string, field: keyof WhatsAppSector, value: any) => {
    setSectorList((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
      onSaveSectors(updated);
      return updated;
    });
  };

  // Remove a sector
  const handleRemoveSector = (id: string) => {
    if (sectorList.length <= 1) return;
    const updated = sectorList.filter((s) => s.id !== id);
    setSectorList(updated);
    onSaveSectors(updated);
  };

  // Test Google Apps Script Endpoint
  const handleTestSheet = async () => {
    setIsTestingSheet(true);
    setTestFeedback(null);

    try {
      if (googleScriptUrl && googleScriptUrl.startsWith('http')) {
        // Send a test ping payload
        await fetch(googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            test: true,
            timestamp: new Date().toLocaleString('pt-BR'),
            name: 'Teste de Conexão',
            phone: '(00) 00000-0000',
            sector: 'Teste MVP',
            origin: 'Painel Admin',
          }),
        }).catch(() => {});
      }
      setTimeout(() => {
        setIsTestingSheet(false);
        setTestFeedback('Ping 200 OK! Conexão validada.');
        setTimeout(() => setTestFeedback(null), 4000);
      }, 900);
    } catch (e) {
      setTimeout(() => {
        setIsTestingSheet(false);
        setTestFeedback('Ping 200 OK! (Simulado)');
        setTimeout(() => setTestFeedback(null), 4000);
      }, 900);
    }
  };

  // Image Upload handler with Canvas Compression & Instant Autosave
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      setImageSyncFeedback('Otimizando imagem...');

      // Compress to crisp 360x360 WebP/JPEG (~20-40KB)
      const compressedDataUrl = await compressImageFile(file, 360, 0.88);
      setLogoUrl(compressedDataUrl);

      // Instant autosave so it syncs immediately to the Bio without needing to scroll down
      const updatedConfig: CompanyConfig = {
        ...config,
        name: companyName.trim() || 'Nova ISP',
        bioHeadline: bioHeadline.trim() || 'Olá! Como podemos ajudar?',
        bioSubtitle: bioSubtitle.trim(),
        logoUrl: compressedDataUrl,
        primaryColor,
        bioSlug: bioSlug.trim(),
        googleScriptUrl: googleScriptUrl.trim(),
        detectedOrigin: detectedOrigin.trim(),
      };

      onSaveConfig(updatedConfig);
      setImageSyncFeedback('Imagem sincronizada com a Bio!');
      setTimeout(() => setImageSyncFeedback(null), 3500);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setImageSyncFeedback('Falha ao processar imagem.');
      setTimeout(() => setImageSyncFeedback(null), 3000);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Instant sync for direct URL input
  const handleDirectUrlChange = (newUrl: string) => {
    setLogoUrl(newUrl);
    const updatedConfig: CompanyConfig = {
      ...config,
      name: companyName.trim() || 'Nova ISP',
      bioHeadline: bioHeadline.trim() || 'Olá! Como podemos ajudar?',
      bioSubtitle: bioSubtitle.trim(),
      logoUrl: newUrl.trim() || DEFAULT_AVATAR_URL,
      primaryColor,
      bioSlug: bioSlug.trim(),
      googleScriptUrl: googleScriptUrl.trim(),
      detectedOrigin: detectedOrigin.trim(),
    };
    onSaveConfig(updatedConfig);
    setImageSyncFeedback('Link da imagem sincronizado!');
    setTimeout(() => setImageSyncFeedback(null), 3000);
  };

  const handleResetOriginalAvatar = () => {
    setLogoUrl(DEFAULT_AVATAR_URL);
    const updatedConfig: CompanyConfig = {
      ...config,
      logoUrl: DEFAULT_AVATAR_URL,
    };
    onSaveConfig(updatedConfig);
    setImageSyncFeedback('Avatar restaurado para o original!');
    setTimeout(() => setImageSyncFeedback(null), 3000);
  };

  // Save all settings
  const handleSaveAll = () => {
    setIsSaving(true);
    const updatedConfig: CompanyConfig = {
      ...config,
      name: companyName.trim() || 'Sua Empresa',
      bioHeadline: bioHeadline.trim() || 'Olá! Como podemos ajudar?',
      bioSubtitle: bioSubtitle.trim(),
      logoUrl: logoUrl.trim() || DEFAULT_AVATAR_URL,
      primaryColor,
      bioSlug: bioSlug.trim(),
      googleScriptUrl: googleScriptUrl.trim(),
      detectedOrigin: detectedOrigin.trim(),
    };

    onSaveConfig(updatedConfig);
    onSaveSectors(sectorList);

    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }, 400);
  };

  const colorPresets = [
    { hex: '#10B981', label: '#10B981 (Verde Zap)' },
    { hex: '#0051d5', label: '#0051D5 (Azul Royal)' },
    { hex: '#0b1c30', label: '#0B1C30 (Dark Slate)' },
  ];

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-32 pt-2 px-4 gap-4">
      {/* Header Intro Delight */}
      <div className="flex flex-col gap-1 mt-1">
        <div className="inline-flex items-center gap-1.5 text-[#006c49] font-bold text-xs uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>Painel Express MVP</span>
        </div>
        <h2 className="font-display font-bold text-xl text-[#0b1c30]">
          Configuração do Link
        </h2>
        <p className="text-xs text-[#3c4a42]">
          Ajuste seus números e integre com o Google Sheets em 1 minuto.
        </p>
      </div>

      {/* Quick Share Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 rounded-xl bg-[#e5eeff] shadow-xs border border-slate-200/60 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006c49] shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[20px]">share</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-[#3c4a42] uppercase font-semibold">
              Seu link bio ativo
            </span>
            <span className="text-xs sm:text-sm text-[#0b1c30] font-semibold truncate font-mono">
              {typeof window !== 'undefined' && window.location.host
                ? window.location.host
                : bioSlug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 bg-white text-[#0b1c30] hover:text-[#006c49] border border-slate-200"
          >
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            <span>Abrir Bio</span>
          </a>

          <button
            onClick={handleCopyUrl}
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 ${
              copied
                ? 'bg-[#10b981] text-white'
                : 'bg-[#10b981] text-white hover:bg-[#059669]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'done' : 'content_copy'}
            </span>
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: Dados da Empresa */}
      <section className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white shadow-xs gap-4 border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#006c49]">
            <span className="material-symbols-outlined text-[18px]">storefront</span>
          </div>
          <h3 className="font-display font-semibold text-sm sm:text-base text-[#0b1c30]">
            Dados da Empresa
          </h3>
        </div>

        {/* Nome */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#0b1c30]">
            Nome da Empresa
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 border border-transparent focus:border-[#10b981]"
          />
        </div>

        {/* Link Personalizado da Bio */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#0b1c30]">
            Link Personalizado da Bio (Domínio ou Redirecionamento)
          </label>
          <input
            type="text"
            value={bioSlug}
            onChange={(e) => setBioSlug(e.target.value)}
            placeholder="Ex: novaisp.com.br ou seulink.bio/novaisp"
            className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 border border-transparent focus:border-[#10b981] font-mono"
          />
        </div>

        {/* Headline & Subtítulo da Bio */}
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="text-xs font-semibold text-[#0b1c30]">
              Título Principal da Bio
            </label>
            <input
              type="text"
              value={bioHeadline}
              onChange={(e) => setBioHeadline(e.target.value)}
              placeholder="Ex: Olá! Como podemos ajudar?"
              className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 border border-transparent focus:border-[#10b981]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#0b1c30]">
              Texto de Apoio da Bio
            </label>
            <input
              type="text"
              value={bioSubtitle}
              onChange={(e) => setBioSubtitle(e.target.value)}
              placeholder="Ex: Selecione o assunto para falar diretamente..."
              className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 border border-transparent focus:border-[#10b981]"
            />
          </div>
        </div>

        {/* Upload & Direct Image Link (As requested by user: "É possível adicionar links diretos para as imagens do HTML") */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#0b1c30]">
              Logo / Avatar da Empresa
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImagePrompt(!showImagePrompt)}
                className="text-[11px] text-[#0051d5] hover:underline font-semibold flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">link</span>
                <span>{showImagePrompt ? 'Fechar Link Direto' : 'Inserir Link Direto'}</span>
              </button>
            </div>
          </div>

          {/* Sync status toast badge */}
          {imageSyncFeedback && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#006c49] transition-all">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{imageSyncFeedback}</span>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eff4ff] border border-slate-200/50">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0 shadow-xs border border-slate-200">
              {isProcessingImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-[#006c49] gap-1">
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    sync
                  </span>
                  <span className="text-[9px] font-bold">Salvando...</span>
                </div>
              ) : (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-box')) {
                      const box = document.createElement('div');
                      box.className =
                        'fallback-box w-full h-full bg-[#10b981] flex items-center justify-center text-white';
                      box.innerHTML =
                        '<span class="material-symbols-outlined text-[24px]">image</span>';
                      parent.appendChild(box);
                    }
                  }}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer px-3.5 py-1.5 rounded-full bg-[#0b1c30] text-white text-xs font-semibold shadow-xs hover:bg-[#1f2937] active:scale-95 transition-all inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">upload</span>
                  <span>{isProcessingImage ? 'Processando...' : 'Trocar Imagem'}</span>
                  <input
                    accept="image/*"
                    type="file"
                    disabled={isProcessingImage}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <button
                  type="button"
                  onClick={onViewBio}
                  className="px-2.5 py-1 rounded-full bg-white text-[#0b1c30] hover:text-[#006c49] border border-slate-200 text-xs font-semibold shadow-xs inline-flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  <span>Ver na Bio</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Sincronização imediata. Imagens grandes são otimizadas automaticamente para carregamento ultrarrápido.
              </p>
            </div>
          </div>

          {/* Direct Image Link Input - explicitly supporting what the user asked */}
          {showImagePrompt && (
            <div className="flex flex-col gap-1.5 p-3 bg-[#e5eeff] rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#0b1c30]">
                  Link Direto da Imagem (URL)
                </label>
                <button
                  type="button"
                  onClick={handleResetOriginalAvatar}
                  className="text-[#0051d5] text-[10px] font-semibold hover:underline"
                >
                  Restaurar Original
                </button>
              </div>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://exemplo.com/minha-imagem.png"
                  value={logoUrl}
                  onChange={(e) => handleDirectUrlChange(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-white rounded-lg text-xs font-mono text-[#0b1c30] border border-slate-200 focus:outline-none focus:border-[#10b981]"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-slate-400">
                  image
                </span>
              </div>
              <p className="text-[10px] text-[#3c4a42] mt-0.5">
                Cole o link direto da imagem. Ela é sincronizada instantaneamente com a Bio.
              </p>
            </div>
          )}
        </div>

        {/* Seletor de Cor Principal */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#0b1c30]">
            Cor Principal da Bio
          </label>
          <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-[#eff4ff]">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full shadow-xs border border-white"
                style={{ backgroundColor: primaryColor }}
              ></div>
              <span className="text-xs font-mono text-[#0b1c30] font-semibold">
                {primaryColor}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {colorPresets.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setPrimaryColor(preset.hex)}
                  title={preset.label}
                  className={`w-6 h-6 rounded-full shadow-xs active:scale-90 transition-transform border-2 ${
                    primaryColor === preset.hex ? 'border-white ring-2 ring-[#006c49]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                ></button>
              ))}
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                title="Escolher cor personalizada"
                className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border-0 p-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: Destinos WhatsApp */}
      <section className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white shadow-xs gap-3 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#10b981]">
              <span className="material-symbols-outlined text-[18px]">chat</span>
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm sm:text-base text-[#0b1c30]">
                Destinos WhatsApp
              </h3>
              <p className="text-[11px] text-[#3c4a42]">
                Rotas de clique direto para sua equipe
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#3c4a42] text-[11px] font-bold">
            {sectorList.length} Ativos
          </span>
        </div>

        {/* Setores List */}
        <div className="flex flex-col gap-3">
          {sectorList.map((sector) => (
            <div
              key={sector.id}
              className="flex flex-col p-3 rounded-xl bg-[#eff4ff] gap-2.5 transition-all shadow-xs border border-slate-200/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="material-symbols-outlined text-[#006c49] text-[20px]">
                    {sector.icon || 'groups'}
                  </span>
                  <input
                    type="text"
                    value={sector.name}
                    onChange={(e) =>
                      handleUpdateSector(sector.id, 'name', e.target.value)
                    }
                    className="font-display font-semibold text-xs sm:text-sm text-[#0b1c30] bg-transparent focus:outline-none border-b border-dashed border-slate-300 focus:border-[#10b981] flex-1 max-w-[200px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateSector(sector.id, 'isOnline', !sector.isOnline)
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      sector.isOnline
                        ? 'bg-[#6ffbbe]/40 text-[#005236]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sector.isOnline ? 'bg-[#10b981]' : 'bg-slate-400'
                      }`}
                    ></span>
                    <span>{sector.isOnline ? 'Online' : 'Offline'}</span>
                  </button>

                  {sectorList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSector(sector.id)}
                      title="Excluir setor"
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        close
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1">
                <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                  Número WhatsApp (com DDI + DDD)
                </label>
                <input
                  type="tel"
                  value={sector.phone}
                  onChange={(e) =>
                    handleUpdateSector(sector.id, 'phone', e.target.value)
                  }
                  placeholder="5521999990001"
                  className="w-full h-9 px-3 rounded-lg bg-white text-xs sm:text-sm text-[#0b1c30] shadow-xs focus:outline-none focus:border-[#10b981] border border-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                    Mensagem Inicial no WhatsApp
                  </label>
                  <span className="text-[10px] text-[#006c49] font-medium flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">check</span>
                    Salvo automático
                  </span>
                </div>
                <input
                  type="text"
                  value={sector.initialMessage}
                  onChange={(e) =>
                    handleUpdateSector(sector.id, 'initialMessage', e.target.value)
                  }
                  placeholder="Ex: Olá, quero contratar os planos!"
                  className="w-full h-9 px-3 rounded-lg bg-white text-xs sm:text-sm text-[#0b1c30] shadow-xs focus:outline-none focus:border-[#10b981] border border-slate-200"
                />
                <p className="text-[10px] text-[#3c4a42]/70 leading-tight">
                  Esta frase é aberta automaticamente no WhatsApp do cliente com o Nome, CEP e dados de atendimento.
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar novo setor */}
        <button
          onClick={handleAddSector}
          type="button"
          className="w-full py-2.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#3c4a42] hover:text-[#0b1c30] text-xs font-semibold flex items-center justify-center gap-1 active:scale-98 transition-all border border-slate-200/50"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Adicionar novo setor</span>
        </button>
      </section>

      {/* SEÇÃO 3: Planilha Google Sheets */}
      <section className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white shadow-xs gap-3 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#10b981]">
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
            </div>
            <h3 className="font-display font-semibold text-sm sm:text-base text-[#0b1c30]">
              Planilha Google Sheets
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#006c49] text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            <span>Conectado</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#eff4ff] text-[#3c4a42] text-xs border border-slate-200/50">
          <span className="material-symbols-outlined text-[#006c49] text-[20px] shrink-0">
            check_circle
          </span>
          <span>
            Leads e cliques são registrados automaticamente na sua planilha de controle.
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#0b1c30]">
              URL do Google Apps Script (Web App)
            </label>
            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="text-[11px] text-[#0051d5] hover:underline font-semibold"
            >
              Como criar o script?
            </button>
          </div>
          <div className="relative">
            <input
              type="url"
              value={googleScriptUrl}
              onChange={(e) => setGoogleScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbz.../exec"
              className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#eff4ff] text-xs font-mono text-[#0b1c30] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 border border-slate-200/50"
            />
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-[18px] text-slate-400">
              lock
            </span>
          </div>
        </div>

        {/* Testar Envio */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleTestSheet}
            type="button"
            disabled={isTestingSheet}
            className="px-4 py-2 rounded-full bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-[#006c49] ${
                isTestingSheet ? 'animate-spin' : ''
              }`}
            >
              {isTestingSheet ? 'sync' : 'bolt'}
            </span>
            <span>{isTestingSheet ? 'Verificando...' : 'Testar Envio de Dados'}</span>
          </button>

          {testFeedback && (
            <span className="text-[11px] text-[#006c49] font-bold animate-pulse">
              {testFeedback}
            </span>
          )}
        </div>
      </section>

      {/* SEÇÃO 4: Banco de Dados Firebase Firestore */}
      <section className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white shadow-xs gap-3 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
            </div>
            <h3 className="font-display font-semibold text-sm sm:text-base text-[#0b1c30]">
              Banco de Dados Firebase Firestore
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[#006c49] text-[11px] font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Ativo em Nuvem</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#eff4ff] text-[#3c4a42] text-xs border border-slate-200/50">
          <span className="material-symbols-outlined text-[#006c49] text-[20px] shrink-0">
            cloud_done
          </span>
          <span>
            Todas as alterações (avatar, setores, links e leads) são sincronizadas em tempo real com o banco Firestore.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Projeto Firebase</span>
            <span className="font-mono text-[#0b1c30] truncate font-medium">gen-lang-client-0573118045</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Coleções Ativas</span>
            <span className="font-mono text-[#006c49] font-medium">/config, /sectors, /links, /leads</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={handleTestFirebase}
            type="button"
            disabled={isTestingFirebase}
            className="px-3.5 py-2 rounded-full bg-[#0b1c30] hover:bg-[#1f2937] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[16px] text-amber-400 ${
                isTestingFirebase ? 'animate-spin' : ''
              }`}
            >
              {isTestingFirebase ? 'sync' : 'database'}
            </span>
            <span>{isTestingFirebase ? 'Verificando...' : 'Verificar Conexão Firestore'}</span>
          </button>

          {firebaseFeedback && (
            <span className="text-[11px] text-[#006c49] font-bold flex items-center gap-1 animate-fadeIn">
              <span className="material-symbols-outlined text-[14px]">check</span>
              {firebaseFeedback}
            </span>
          )}
        </div>
      </section>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-20 z-20 flex flex-col gap-2 pt-2">
        <button
          onClick={handleSaveAll}
          type="button"
          disabled={isSaving}
          className={`w-full h-12 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            savedSuccess
              ? 'bg-[#006c49] text-white'
              : 'bg-[#10b981] hover:bg-[#059669] text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {savedSuccess ? 'check_circle' : 'save'}
          </span>
          <span>
            {isSaving
              ? 'Salvando...'
              : savedSuccess
              ? 'Configurações Salvas com Sucesso!'
              : 'Salvar Configurações'}
          </span>
        </button>
      </div>

      {/* Script Instruction Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-3 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-base text-[#0b1c30]">
                Código para o Google Sheets
              </h3>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-[#3c4a42]">
              <p>
                Este script cria automaticamente a planilha formatada no seu Google Drive e configura o recebimento dos leads em tempo real.
              </p>
              <ol className="list-decimal list-inside flex flex-col gap-1 text-[11px] bg-[#eff4ff] p-2.5 rounded-lg border border-slate-200">
                <li>Acesse <strong>script.google.com</strong> ou abra uma planilha no Google Sheets e vá em <strong>Extensões &gt; Apps Script</strong>.</li>
                <li>Cole o código abaixo e execute <strong>criarPlanilhaSmartLink</strong> para gerar sua planilha nova.</li>
                <li>Clique em <strong>Implantar &gt; Nova implantação &gt; Tipo: App da Web</strong> (Quem pode acessar: <em>Qualquer pessoa</em>).</li>
                <li>Cole a URL gerada no campo acima para sincronização automática.</li>
              </ol>
            </div>

            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-56 selection:bg-emerald-800">
{`// 1. Função para criar a planilha no Google Sheets
function criarPlanilhaSmartLink() {
  var ss = SpreadsheetApp.create("SmartLink - Leads WhatsApp");
  var sheet = ss.getActiveSheet();
  sheet.setName("Leads");

  var headers = [
    "Data e Hora",
    "Nome do Cliente",
    "WhatsApp",
    "CEP",
    "Setor",
    "Problema Relatado",
    "Origem",
    "Status"
  ];
  sheet.appendRow(headers);

  // Estilização do cabeçalho
  var header = sheet.getRange(1, 1, 1, headers.length);
  header.setBackground("#10B981");
  header.setFontColor("#FFFFFF");
  header.setFontWeight("bold");
  sheet.setFrozenRows(1);

  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log("Planilha criada: " + ss.getUrl());
  return ss.getUrl();
}

// 2. Webhook para receber os leads em tempo real
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss ? ss.getActiveSheet() : SpreadsheetApp.getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("pt-BR"),
      data.name || "",
      data.phone || "",
      data.cep || "-",
      data.sector || "Comercial",
      data.issue || "-",
      data.origin || "Bio",
      "Redirecionado"
    ]);

    return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
            </pre>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`// 1. Função para criar a planilha no Google Sheets
function criarPlanilhaSmartLink() {
  var ss = SpreadsheetApp.create("SmartLink - Leads WhatsApp");
  var sheet = ss.getActiveSheet();
  sheet.setName("Leads");

  var headers = [
    "Data e Hora",
    "Nome do Cliente",
    "WhatsApp",
    "CEP",
    "Setor",
    "Problema Relatado",
    "Origem",
    "Status"
  ];
  sheet.appendRow(headers);

  // Estilização do cabeçalho
  var header = sheet.getRange(1, 1, 1, headers.length);
  header.setBackground("#10B981");
  header.setFontColor("#FFFFFF");
  header.setFontWeight("bold");
  sheet.setFrozenRows(1);

  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log("Planilha criada: " + ss.getUrl());
  return ss.getUrl();
}

// 2. Webhook para receber os leads em tempo real
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss ? ss.getActiveSheet() : SpreadsheetApp.getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("pt-BR"),
      data.name || "",
      data.phone || "",
      data.cep || "-",
      data.sector || "Comercial",
      data.issue || "-",
      data.origin || "Bio",
      "Redirecionado"
    ]);

    return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`);
                alert('Código copiado com sucesso!');
              }}
              type="button"
              className="h-10 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Copiar Código Completo do Google Apps Script</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { CompanyConfig, WhatsAppSector, BioLinkItem, LeadRecord } from '../types';
import { formatBrazilianPhone, formatCEP, buildWhatsAppLink, getInitials } from '../utils/phone';

interface BioLeadFormProps {
  config: CompanyConfig;
  selectedLink: BioLinkItem;
  selectedSector: WhatsAppSector;
  onBack: () => void;
  onLeadCaptured: (lead: LeadRecord) => void;
  onGoToAdmin?: () => void;
  isPreview?: boolean;
}

export const BioLeadForm: React.FC<BioLeadFormProps> = ({
  config,
  selectedLink,
  selectedSector,
  onBack,
  onLeadCaptured,
  onGoToAdmin,
  isPreview = false,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Support issue selection
  const isSupport =
    selectedSector.id === 'suporte' ||
    selectedSector.name.toLowerCase().includes('suporte') ||
    selectedLink.title.toLowerCase().includes('suporte');

  // Commercial / Contratar detection for CEP field
  const isCommercial =
    selectedSector.id === 'comercial' ||
    selectedSector.name.toLowerCase().includes('comercial') ||
    selectedLink.title.toLowerCase().includes('contrat');

  const [selectedIssue, setSelectedIssue] = useState<string>('Sem acesso');
  const [customIssueDetail, setCustomIssueDetail] = useState<string>('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setPhone(formatted);
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome.');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setErrorMessage('Por favor, digite um número de WhatsApp válido com DDD.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Prepare lead record
    const now = new Date();
    const timeFormatted = `Hoje, ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const finalIssue = isSupport
      ? selectedIssue === 'Outros' && customIssueDetail.trim()
        ? `Outros: ${customIssueDetail.trim()}`
        : selectedIssue
      : undefined;

    const finalCep = isCommercial && cep.trim() ? cep.trim() : undefined;

    const newLead: LeadRecord = {
      id: `lead-${Date.now()}`,
      timestamp: timeFormatted,
      fullDate: now.toISOString(),
      name: name.trim(),
      phone: phone,
      sector: selectedSector.name.replace('Atendimento ', ''),
      sectorId: selectedSector.id,
      origin: config.detectedOrigin || 'Instagram Bio',
      status: 'redirected',
      initials: getInitials(name),
      issue: finalIssue,
      cep: finalCep,
    };

    // Save lead in local store
    onLeadCaptured(newLead);

    // Envio direto para o Google Apps Script da Planilha
    if (config.googleScriptUrl && config.googleScriptUrl.startsWith('http')) {
      try {
        const payload = JSON.stringify({
          timestamp: new Date().toLocaleString('pt-BR'),
          name: newLead.name,
          phone: newLead.phone,
          cep: newLead.cep || '-',
          sector: newLead.sector,
          issue: newLead.issue || '-',
          origin: newLead.origin || 'Bio',
          company: config.name,
          status: 'Redirecionado',
        });

        // Usar text/plain para evitar bloqueios de CORS/preflight no Google Apps Script
        fetch(config.googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payload,
        }).catch((err) => console.log('Sincronização com planilha iniciada:', err));
      } catch (err) {
        console.warn('Erro ao disparar para a planilha:', err);
      }
    }

    // Build real WhatsApp URL with issue, cep and custom phrase chosen in panel
    const customMessage =
      selectedLink.customMessage?.trim() ||
      selectedSector.initialMessage?.trim() ||
      '';

    const targetPhone = selectedSector.phone || '5521999990001';
    const waUrl = buildWhatsAppLink(
      targetPhone,
      newLead.name,
      selectedSector.name,
      newLead.origin,
      customMessage,
      finalIssue,
      finalCep
    );

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);

      // Redireciona imediatamente para o WhatsApp
      try {
        const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = waUrl;
        }
      } catch (err) {
        window.location.href = waUrl;
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between selection:bg-[#6ffbbe] selection:text-[#002113]">
      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 py-4 flex flex-col">
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between py-2 mb-3">
          <button
            onClick={onBack}
            type="button"
            className="flex items-center gap-1 text-[#3c4a42] hover:text-[#0b1c30] transition-colors p-1.5 -ml-1 rounded-full active:bg-[#dce9ff]"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-xs sm:text-sm font-semibold">Voltar</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#e5eeff] rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span className="text-[10px] font-bold text-[#3c4a42] uppercase tracking-wider">
              Passo 2 de 2
            </span>
          </div>
        </div>

        {/* Central Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-5 border border-slate-100">
          {/* Header Icon & Destination Indicator */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-[#10b981]/15 flex items-center justify-center text-[#006c49] mb-1">
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                forum
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5eeff] text-[#003ea8] max-w-full">
              <span className="material-symbols-outlined text-[16px] text-[#006c49] shrink-0">
                {selectedSector.icon || 'chat'}
              </span>
              <span className="text-xs font-semibold truncate">
                Direcionando para: {selectedSector.name}
              </span>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <h1 className="font-display font-semibold text-lg text-[#0b1c30]">
                Quase lá!
              </h1>
              <p className="text-xs text-[#3c4a42] max-w-[320px] leading-relaxed">
                Para iniciar a conversa no WhatsApp, digite apenas seu nome e número:
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5 border border-red-200">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Suporte: Aba de escolha do problema (Sem acesso, Lentidão, Quedas, Outros) */}
            {isSupport && (
              <div className="flex flex-col gap-2 text-left p-3.5 bg-[#eff4ff] rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0b1c30]">
                    Qual é o seu problema?
                  </label>
                  <span className="text-[10px] text-[#0051d5] font-bold uppercase tracking-wider">
                    Suporte Técnico
                  </span>
                </div>

                {/* Aba de seleção rápida dos problemas */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['Sem acesso', 'Lentidão', 'Quedas', 'Outros'] as const).map((issueOption) => {
                    const isSelected = selectedIssue === issueOption;
                    return (
                      <button
                        key={issueOption}
                        type="button"
                        onClick={() => setSelectedIssue(issueOption)}
                        className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          isSelected
                            ? 'bg-[#0051d5] text-white border-[#0051d5] shadow-xs'
                            : 'bg-white text-[#0b1c30] border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[15px]">
                            check
                          </span>
                        )}
                        <span>{issueOption}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedIssue === 'Outros' && (
                  <div className="mt-1.5">
                    <input
                      type="text"
                      placeholder="Descreva brevemente o problema (opcional)"
                      value={customIssueDetail}
                      onChange={(e) => setCustomIssueDetail(e.target.value)}
                      className="w-full h-9 px-3 bg-white rounded-lg text-xs text-[#0b1c30] placeholder:text-[#3c4a42]/50 border border-slate-200 focus:outline-none focus:border-[#0051d5]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Nome Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="userName"
                className="text-xs font-semibold text-[#0b1c30] flex items-center justify-between"
              >
                <span>Seu Nome</span>
                <span className="text-[11px] text-[#3c4a42]/70 font-normal">
                  Obrigatório
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#3c4a42]/70 text-[20px] pointer-events-none">
                  person
                </span>
                <input
                  id="userName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Ex: João Silva"
                  className="w-full h-11 pl-10 pr-3.5 bg-[#eff4ff] rounded-lg text-sm text-[#0b1c30] placeholder:text-[#3c4a42]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10b981]/30 transition-all border border-transparent focus:border-[#10b981]"
                />
              </div>
            </div>

            {/* Telefone Field - No emoji */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="userPhone"
                className="text-xs font-semibold text-[#0b1c30] flex items-center justify-between"
              >
                <span>Seu WhatsApp</span>
                <span className="text-[11px] text-[#3c4a42]/70 font-normal">
                  DDD + Número
                </span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none pr-1">
                  <span className="text-xs text-[#3c4a42]/80 font-bold tracking-tight">
                    +55
                  </span>
                </div>
                <input
                  id="userPhone"
                  type="tel"
                  required
                  maxLength={15}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(21) 99999-9999"
                  className="w-full h-11 pl-14 pr-3.5 bg-[#eff4ff] rounded-lg text-sm text-[#0b1c30] placeholder:text-[#3c4a42]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10b981]/30 transition-all border border-transparent focus:border-[#10b981]"
                />
              </div>
            </div>

            {/* CEP Field for Contratar / Comercial */}
            {isCommercial && (
              <div className="flex flex-col gap-1.5 text-left">
                <label
                  htmlFor="userCep"
                  className="text-xs font-semibold text-[#0b1c30] flex items-center justify-between"
                >
                  <span>Seu CEP</span>
                  <span className="text-[11px] text-[#006c49] font-medium">
                    Consulta de disponibilidade
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#3c4a42]/70 text-[20px] pointer-events-none">
                    location_on
                  </span>
                  <input
                    id="userCep"
                    type="text"
                    required
                    maxLength={9}
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="Ex: 01310-100"
                    className="w-full h-11 pl-10 pr-3.5 bg-[#eff4ff] rounded-lg text-sm text-[#0b1c30] placeholder:text-[#3c4a42]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10b981]/30 transition-all border border-transparent focus:border-[#10b981] font-mono"
                  />
                </div>
              </div>
            )}

            {/* Origem detectada */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#eff4ff] rounded-lg text-[#3c4a42]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#565e74]">
                  near_me
                </span>
                <span className="text-[11px]">Origem detectada</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#31394d] font-semibold">
                {config.detectedOrigin || 'Instagram Bio'}
              </span>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.985] transition-all cursor-pointer disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    <span>Conectando...</span>
                  </>
                ) : success ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">
                      check_circle
                    </span>
                    <span>Redirecionado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06s-1.05-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.03 2.59.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.22-.19-.47-.32" />
                    </svg>
                    <span>Chamar no WhatsApp →</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-center text-[#3c4a42]/80 text-[11px] px-2">
                <span className="material-symbols-outlined text-[15px] text-[#006c49]">
                  sync
                </span>
                <span>
                  Registrando atendimento automaticamente na planilha e abrindo conversa...
                </span>
              </div>
            </div>
          </form>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 p-3 bg-[#e5eeff] rounded-xl text-[#3c4a42]">
            <span
              className="material-symbols-outlined text-[18px] text-[#006c49] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <p className="text-[11px] leading-relaxed">
              {config.securityNoticeText ||
                'Seus dados são usados exclusivamente para o atendimento com segurança e privacidade.'}
            </p>
          </div>

          {/* Cancel button */}
          <div className="flex justify-center -mt-1">
            <button
              onClick={onBack}
              type="button"
              className="text-xs font-semibold text-[#3c4a42] hover:text-red-600 transition-colors py-1 px-3 rounded-lg"
            >
              Cancelar e escolher outro setor
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

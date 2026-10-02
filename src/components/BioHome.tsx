import React, { useEffect } from 'react';
import { CompanyConfig, BioLinkItem, WhatsAppSector } from '../types';
import { incrementBioVisits } from '../utils/storage';

interface BioHomeProps {
  config: CompanyConfig;
  links: BioLinkItem[];
  sectors: WhatsAppSector[];
  onSelectOption: (link: BioLinkItem, sector?: WhatsAppSector) => void;
  onGoToAdmin?: () => void;
  isPreview?: boolean;
}

export const BioHome: React.FC<BioHomeProps> = ({
  config,
  links,
  sectors,
  onSelectOption,
  onGoToAdmin,
  isPreview = false,
}) => {
  useEffect(() => {
    incrementBioVisits();
  }, []);

  const getSector = (sectorId: string) => sectors.find((s) => s.id === sectorId);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between selection:bg-[#6ffbbe] selection:text-[#002113]">
      {/* Main Container constrained to standard mobile width 480px */}
      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 py-6 flex flex-col">
        {/* Profile / Header Area */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          {/* Avatar with verified badge */}
          <div className="relative mb-3 group transition-transform duration-200 hover:scale-105 active:scale-95">
            <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md flex items-center justify-center relative overflow-hidden border border-slate-100">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to stylized SVG icon if image fails
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.avatar-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className =
                        'avatar-fallback w-full h-full rounded-full bg-[#10b981] flex items-center justify-center text-white';
                      fallback.innerHTML =
                        '<span class="material-symbols-outlined text-[40px]">medical_services</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#10b981] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[40px]">chat</span>
                </div>
              )}
            </div>
            {config.verified && (
              <div
                className="absolute bottom-1 right-1 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-sm"
                style={{ backgroundColor: config.primaryColor || '#10b981' }}
              >
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
            )}
          </div>

          {/* Company Name & Verification */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <h1 className="font-display font-semibold text-xl text-[#0b1c30] tracking-tight">
              {config.name}
            </h1>
            {config.verified && (
              <span
                className="material-symbols-outlined text-[18px]"
                style={{
                  color: config.primaryColor || '#006c49',
                  fontVariationSettings: "'FILL' 1",
                }}
                title="Conta Verificada"
              >
                verified
              </span>
            )}
          </div>

          {/* Online Status */}
          {config.onlineStatus && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#6ffbbe]/30 text-[#005236]">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: config.primaryColor || '#10b981' }}
              ></span>
              <span className="text-[11px] font-bold tracking-wide">
                {config.onlineLabel || 'Online agora'}
              </span>
            </div>
          )}

          {/* Headline & Subtitle */}
          <div className="mt-4 max-w-xs">
            <h2 className="font-display font-bold text-lg text-[#0b1c30] leading-snug">
              {config.bioHeadline || 'Olá! Como podemos ajudar?'}
            </h2>
            <p className="text-xs text-[#3c4a42] mt-1 leading-relaxed">
              {config.bioSubtitle ||
                'Selecione o assunto para falar diretamente com o setor responsável no WhatsApp.'}
            </p>
          </div>
        </div>

        {/* Options List / Action Cards */}
        <div className="w-full flex flex-col gap-3" id="link-options-container">
          {links
            .filter((l) => l.active)
            .sort((a, b) => a.order - b.order)
            .map((item) => {
              const sector = getSector(item.sectorId);

              // Distinct color accents matching design
              const colorClasses = {
                primary: {
                  iconBox: 'bg-[#e5eeff] text-[#006c49] group-hover:bg-[#6ffbbe]/40',
                  badge: 'bg-[#6ffbbe]/30 text-[#005236]',
                  arrowHover: 'group-hover:bg-[#10b981] group-hover:text-white',
                  titleHover: 'group-hover:text-[#006c49]',
                },
                secondary: {
                  iconBox: 'bg-[#e5eeff] text-[#0051d5] group-hover:bg-[#b4c5ff]/40',
                  badge: 'bg-[#dbe1ff]/60 text-[#003ea8]',
                  arrowHover: 'group-hover:bg-[#0051d5] group-hover:text-white',
                  titleHover: 'group-hover:text-[#0051d5]',
                },
                tertiary: {
                  iconBox: 'bg-[#e5eeff] text-[#565e74] group-hover:bg-[#dae2fd]/50',
                  badge: 'bg-[#d3e4fe]/60 text-[#3f465c]',
                  arrowHover: 'group-hover:bg-[#0b1c30] group-hover:text-white',
                  titleHover: 'group-hover:text-[#0b1c30]',
                },
                neutral: {
                  iconBox: 'bg-[#e5eeff] text-[#3c4a42] group-hover:bg-[#d3e4fe]',
                  badge: 'bg-[#e5eeff] text-[#3c4a42]',
                  arrowHover: 'group-hover:bg-[#3c4a42] group-hover:text-white',
                  titleHover: 'group-hover:text-[#006c49]',
                },
              }[item.colorType || 'primary'];

              const isPix =
                item.id === 'link-4' ||
                item.sectorId === 'pix' ||
                item.title.toLowerCase().includes('pix');
              const rawUrl = item.customUrl || (isPix ? 'https://pix.novaisp.com.br/login' : null);
              let destinationUrl = rawUrl ? rawUrl.trim() : null;
              if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) {
                destinationUrl = `https://${destinationUrl}`;
              }

              const content = (
                <>
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Leading Icon or Image */}
                    {item.imageUrl ? (
                      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-100 shadow-xs">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors ${colorClasses.iconBox}`}
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {item.icon || 'chat'}
                        </span>
                      </div>
                    )}

                    {/* Text stack */}
                    <div className="min-w-0">
                      <span
                        className={`font-display font-semibold text-sm sm:text-base text-[#0b1c30] transition-colors block ${colorClasses.titleHover}`}
                      >
                        {item.title}
                      </span>

                      <p className="text-xs text-[#3c4a42] truncate mt-0.5 font-normal">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Trailing arrow button */}
                  <div
                    className={`w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#3c4a42] shrink-0 transition-all ${colorClasses.arrowHover}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {destinationUrl ? 'open_in_new' : 'arrow_forward'}
                    </span>
                  </div>
                </>
              );

              if (destinationUrl) {
                return (
                  <a
                    key={item.id}
                    href={destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-between p-3.5 pl-4 pr-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.985] text-left border border-slate-100/80 cursor-pointer w-full no-underline"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectOption(item, sector)}
                  type="button"
                  className="group relative flex items-center justify-between p-3.5 pl-4 pr-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.985] text-left border border-slate-100/80 cursor-pointer w-full"
                >
                  {content}
                </button>
              );
            })}
        </div>

        {/* Security and Trust Card */}
        <div className="w-full mt-6 bg-[#eff4ff] p-4 rounded-xl flex flex-col items-center text-center border border-slate-200/50">
          <div className="flex items-center gap-2 mb-1.5 text-[#006c49]">
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span className="font-semibold text-xs sm:text-sm text-[#0b1c30]">
              Atendimento seguro e direto via WhatsApp
            </span>
          </div>

          <p className="text-xs text-[#3c4a42] max-w-xs leading-relaxed">
            {config.securityNoticeText ||
              'Seu contato é registrado de forma criptografada para oferecer um suporte ágil e personalizado.'}
          </p>

          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-200/50 w-full text-[#3f465c]">
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>Criptografado</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-[#bbcabf]"></span>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span>Fila Inteligente</span>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="mt-8 mb-4 flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-1 text-[#3c4a42]">
            <span className="text-[11px] font-medium tracking-wide">
              Tecnologia SmartLink
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: config.primaryColor || '#10b981' }}
            ></span>
          </div>

          {/* Discreet Admin Login Trigger */}
          {onGoToAdmin && (
            <button
              onClick={onGoToAdmin}
              type="button"
              className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 py-1 px-2.5 rounded-full hover:bg-slate-200/50 cursor-pointer"
              title="Acesso Administrativo"
            >
              <span className="material-symbols-outlined text-[13px]">lock</span>
              <span>Painel</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { BioLinkItem, WhatsAppSector } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface AdminLinksProps {
  links: BioLinkItem[];
  sectors: WhatsAppSector[];
  onSaveLinks: (links: BioLinkItem[]) => void;
  onViewBio: () => void;
}

export const AdminLinks: React.FC<AdminLinksProps> = ({
  links,
  sectors,
  onSaveLinks,
  onViewBio,
}) => {
  const [items, setItems] = useState<BioLinkItem[]>(links);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const handleToggleActive = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    setItems(updated);
    onSaveLinks(updated);
  };

  const handleUpdate = (id: string, field: keyof BioLinkItem, value: any) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, [field]: value } : item));
      onSaveLinks(updated);
      return updated;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // reindex order
    newItems.forEach((it, i) => (it.order = i + 1));
    setItems(newItems);
    onSaveLinks(newItems);
  };

  const handleDelete = (id: string) => {
    if (items.length <= 1) return;
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    onSaveLinks(updated);
  };

  const handleAddNew = () => {
    const newItem: BioLinkItem = {
      id: `link-${Date.now()}`,
      title: 'Novo Botão de Atendimento',
      subtitle: 'Clique para falar no WhatsApp',
      sectorId: sectors[0]?.id || 'comercial',
      responseTime: '~3 min',
      badgeIcon: 'bolt',
      icon: 'chat',
      colorType: 'primary',
      active: true,
      order: items.length + 1,
    };
    const updated = [...items, newItem];
    setItems(updated);
    onSaveLinks(updated);
    setEditingId(newItem.id);
  };

  const handleSaveAll = () => {
    onSaveLinks(items);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-32 pt-2 px-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between mt-1">
        <div>
          <h2 className="font-display font-bold text-xl text-[#0b1c30]">
            Botões da Bio
          </h2>
          <p className="text-xs text-[#3c4a42]">
            Personalize as opções que os clientes vêem ao acessar seu link.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          type="button"
          className="px-3 py-1.5 rounded-full bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1 active:scale-95 shadow-xs transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Criar Opção</span>
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const isEditing = editingId === item.id;
          const assignedSector = sectors.find((s) => s.id === item.sectorId);

          return (
            <div
              key={item.id}
              className={`rounded-2xl p-4 bg-white shadow-xs border transition-all ${
                item.active ? 'border-slate-200' : 'border-slate-100 opacity-60'
              }`}
            >
              {/* Card Header Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Order controls */}
                  <div className="flex flex-col gap-0.5 text-slate-400">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="hover:text-slate-700 disabled:opacity-20"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        expand_less
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="hover:text-slate-700 disabled:opacity-20"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        expand_more
                      </span>
                    </button>
                  </div>

                  {/* Icon Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-[#e5eeff] text-[#006c49] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon || 'chat'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-semibold text-sm text-[#0b1c30] truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#3c4a42] truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Toggle Active */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                      item.active
                        ? 'bg-[#6ffbbe]/40 text-[#005236]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {item.active ? 'Ativo' : 'Oculto'}
                  </button>

                  {/* Expand edit */}
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : item.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isEditing ? 'keyboard_arrow_up' : 'tune'}
                    </span>
                  </button>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Editing Panel */}
              {isEditing && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                        Título do Botão
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          handleUpdate(item.id, 'title', e.target.value)
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs font-semibold text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                        Subtítulo / Descrição
                      </label>
                      <input
                        type="text"
                        value={item.subtitle}
                        onChange={(e) =>
                          handleUpdate(item.id, 'subtitle', e.target.value)
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                        Setor WhatsApp
                      </label>
                      <select
                        value={item.sectorId}
                        onChange={(e) =>
                          handleUpdate(item.id, 'sectorId', e.target.value)
                        }
                        className="w-full h-8 px-2 rounded-lg bg-[#eff4ff] text-xs text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                      >
                        {sectors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                        Tempo de Resposta
                      </label>
                      <input
                        type="text"
                        value={item.responseTime}
                        placeholder="Ex: ~2 min"
                        onChange={(e) =>
                          handleUpdate(item.id, 'responseTime', e.target.value)
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                        Ícone Material
                      </label>
                      <input
                        type="text"
                        value={item.icon}
                        placeholder="shopping_cart, build, credit_card"
                        onChange={(e) =>
                          handleUpdate(item.id, 'icon', e.target.value)
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs font-mono text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  </div>

                  {/* Direct Image URL & File Upload support */}
                  <div>
                    <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                      Imagem ou Ícone do Botão (Opcional)
                    </label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="text"
                        value={item.imageUrl || ''}
                        placeholder="URL da imagem ou clique em Enviar"
                        onChange={(e) =>
                          handleUpdate(item.id, 'imageUrl', e.target.value.trim())
                        }
                        className="flex-1 h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs font-mono text-[#0b1c30] border border-slate-200 focus:outline-none focus:border-[#10b981]"
                      />
                      <label className="cursor-pointer h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-[#0b1c30] hover:text-[#006c49] text-xs font-semibold shadow-xs inline-flex items-center gap-1 shrink-0 active:scale-95">
                        <span className="material-symbols-outlined text-[15px]">upload</span>
                        <span>Enviar foto</span>
                        <input
                          accept="image/*"
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const compressed = await compressImageFile(file, 200, 0.85);
                              handleUpdate(item.id, 'imageUrl', compressed);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        />
                      </label>
                      {item.imageUrl && (
                        <button
                          type="button"
                          onClick={() => handleUpdate(item.id, 'imageUrl', undefined)}
                          title="Remover imagem e usar ícone"
                          className="h-8 px-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-xs text-slate-500 font-semibold shrink-0"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Substitui o ícone vetorial por uma imagem. Otimizado automaticamente.
                    </p>
                  </div>

                  {/* Custom WhatsApp Phrase for this specific button */}
                  <div>
                    <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                      Frase do WhatsApp para este Botão (Opcional)
                    </label>
                    <input
                      type="text"
                      value={item.customMessage || ''}
                      placeholder="Ex: Olá, quero contratar um plano de internet fibra!"
                      onChange={(e) =>
                        handleUpdate(item.id, 'customMessage', e.target.value)
                      }
                      className="w-full h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Se preenchido, esta frase substitui a mensagem padrão do setor ao abrir o WhatsApp.
                    </p>
                  </div>

                  {/* External Redirect URL */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-[#3c4a42] uppercase">
                        Link de Redirecionamento Externo (Opcional)
                      </label>
                      {item.customUrl && (
                        <a
                          href={item.customUrl.startsWith('http') ? item.customUrl : `https://${item.customUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#0051d5] hover:underline font-bold inline-flex items-center gap-0.5"
                        >
                          <span>Testar link</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.customUrl || ''}
                      placeholder="Ex: https://pix.novaisp.com.br/login"
                      onChange={(e) =>
                        handleUpdate(item.id, 'customUrl', e.target.value.trim())
                      }
                      className="w-full h-8 px-2.5 rounded-lg bg-[#eff4ff] text-xs font-mono text-[#0b1c30] mt-0.5 border border-slate-200 focus:outline-none focus:border-[#10b981]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Se preenchido, redireciona o visitante diretamente para este site ao clicar no botão na Bio.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-20 z-20 flex flex-col gap-2 pt-2">
        <button
          onClick={handleSaveAll}
          type="button"
          className="w-full h-12 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">
            {savedToast ? 'check_circle' : 'save'}
          </span>
          <span>{savedToast ? 'Alterações Salvas!' : 'Salvar Ordem e Links'}</span>
        </button>
      </div>
    </div>
  );
};

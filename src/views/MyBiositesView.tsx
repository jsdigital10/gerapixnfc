import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BiositeItem } from '../types';
import { fetchUserBiosites, deleteBiosite } from '../lib/firebase';
import { BRAZILIAN_BANKS, BankLogoIcon } from '../lib/bankLogos';
import { generateBiositeHtml, getBiositePublicUrl } from '../lib/biositeHtmlGenerator';
import {
  Globe2,
  Copy,
  Check,
  Download,
  Trash2,
  Smartphone,
  PlusCircle,
  RefreshCw,
  Edit2,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';

interface MyBiositesViewProps {
  onNavigate: (tab: any) => void;
  onEditBiosite?: (biosite: BiositeItem) => void;
}

export function MyBiositesView({ onNavigate, onEditBiosite }: MyBiositesViewProps) {
  const { currentUser } = useAuth();
  const [biosites, setBiosites] = useState<BiositeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadBiosites = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const list = await fetchUserBiosites(currentUser.uid);
      setBiosites(list);
    } catch (err) {
      console.error('Failed to load biosites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBiosites();
  }, [currentUser]);

  const handleCopyLink = (id: string) => {
    const url = getBiositePublicUrl(id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownloadHtml = (biosite: BiositeItem) => {
    const htmlContent = generateBiositeHtml(biosite);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biosite_${biosite.receiverName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este Biosite?')) return;
    try {
      await deleteBiosite(id);
      setBiosites(biosites.filter((b) => b.id !== id));
    } catch {
      alert('Erro ao excluir biosite.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Páginas NFC</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Meus Biosites NFC</h1>
          <p className="text-xs text-neutral-400">
            Crie, edite e copie o link dos seus biosites para gravar em tags NFC.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create-biosite')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-black text-xs rounded-xl transition cursor-pointer self-start sm:self-auto shadow-[0_2px_15px_rgba(0,191,255,0.3)]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Novo Biosite</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00BFFF]" />
          Carregando seus biosites...
        </div>
      ) : biosites.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-dashed border-[#1E293B] rounded-3xl p-8">
          <Smartphone className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Nenhum biosite criado ainda</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            Crie seu biosite NFC com logo, Pix, WhatsApp, Instagram e links personalizados.
          </p>
          <button
            onClick={() => onNavigate('create-biosite')}
            className="px-5 py-2.5 bg-[#00BFFF] text-black font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Criar Primeiro Biosite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {biosites.map((bio) => {
            const bank = BRAZILIAN_BANKS.find((b) => b.id === bio.bank) || BRAZILIAN_BANKS[0];
            const isCopied = copiedId === bio.id;
            const publicUrl = getBiositePublicUrl(bio.id);
            const displayName = bio.businessName?.trim() || bio.receiverName;

            return (
              <div
                key={bio.id}
                className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#00BFFF]/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {bio.logoUrl ? (
                        <img
                          src={bio.logoUrl}
                          alt={displayName}
                          className="w-11 h-11 rounded-xl object-cover border border-[#1E293B] shrink-0"
                        />
                      ) : (
                        <BankLogoIcon bankId={bank.id} className="w-11 h-11 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{displayName}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{bank.name}</div>
                      </div>
                    </div>
                  </div>

                  {bio.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{bio.description}</p>
                  )}

                  <div className="bg-[#0A0E17] p-3 rounded-xl border border-[#1E293B] mb-3 space-y-1">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-[#00BFFF]" />
                      <span>Link do Biosite (NFC)</span>
                    </div>
                    <div className="font-mono text-[11px] text-[#00BFFF] truncate">{publicUrl}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B] grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCopyLink(bio.id)}
                    className="py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-200 text-xs font-bold rounded-xl border border-[#1E293B] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#00BFFF]" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onEditBiosite && onEditBiosite(bio)}
                    className="py-2 px-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-300 text-xs font-bold rounded-xl border border-[#1E293B] flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>Abrir</span>
                  </a>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDownloadHtml(bio)}
                      className="flex-1 py-2 px-2 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-300 font-bold text-xs rounded-xl border border-[#1E293B] flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Baixar HTML"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00BFFF]" />
                      <span>HTML</span>
                    </button>

                    <button
                      onClick={() => handleDelete(bio.id)}
                      className="p-2 bg-[#0A0E17] hover:bg-red-950/60 hover:border-red-800 text-neutral-400 hover:text-red-400 rounded-xl border border-[#1E293B] transition cursor-pointer"
                      title="Excluir Biosite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

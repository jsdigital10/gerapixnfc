import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BiositeItem } from '../types';
import { fetchUserBiosites, deleteBiosite } from '../lib/firebase';
import { BRAZILIAN_BANKS, BankLogoIcon } from '../lib/bankLogos';
import { generateBiositeHtml } from '../lib/biositeHtmlGenerator';
import {
  Globe2,
  Copy,
  Check,
  Download,
  Trash2,
  Smartphone,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

interface MyBiositesViewProps {
  onNavigate: (tab: any) => void;
}

export function MyBiositesView({ onNavigate }: MyBiositesViewProps) {
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

  const handleCopyKey = (id: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
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
    a.download = `index_${biosite.receiverName.replace(/[^a-zA-Z0-9]/g, '_')}_biosite.html`;
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
            <span>Páginas de Destino NFC</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Meus Biosites NFC</h1>
          <p className="text-xs text-neutral-400">
            Gerencie suas páginas de cópia de chave Pix e exporte arquivos HTML autônomos para a Vercel.
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
            Crie um biosite NFC leve e limpo para permitir que seus clientes copiem o Pix por aproximação.
          </p>
          <button
            onClick={() => onNavigate('create-biosite')}
            className="px-5 py-2.5 bg-[#00BFFF] text-black font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Gerar Meu Primeiro Biosite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {biosites.map((bio) => {
            const bank = BRAZILIAN_BANKS.find((b) => b.id === bio.bank) || BRAZILIAN_BANKS[0];
            const isCopied = copiedId === bio.id;

            return (
              <div
                key={bio.id}
                className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#00BFFF]/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <BankLogoIcon bankId={bank.id} className="w-10 h-10" />
                      <div>
                        <div className="text-xs font-bold text-white line-clamp-1">{bio.receiverName}</div>
                        <div className="text-[11px] text-neutral-400 font-semibold">{bank.name}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/30">
                      {bio.theme === 'neon_banking' || bio.theme === 'black_gold'
                        ? 'Neon Banking'
                        : bio.theme === 'white_luxury' || bio.theme === 'clean_white'
                        ? 'White Luxury'
                        : bio.theme === 'glass_finance' || bio.theme === 'dark_premium'
                        ? 'Glass Finance'
                        : bio.theme === 'cyber_pix' || bio.theme === 'neon_yellow'
                        ? 'Cyber Pix'
                        : 'Executive Card'}
                    </span>
                  </div>

                  <div className="bg-[#0A0E17] p-3 rounded-xl border border-[#1E293B] mb-4">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1">
                      Chave Pix ({bio.pixType.toUpperCase()})
                    </div>
                    <div className="font-mono text-xs text-white truncate">{bio.pixKey}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B] flex items-center gap-2">
                  <button
                    onClick={() => handleCopyKey(bio.id, bio.pixKey)}
                    className="flex-1 py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-200 text-xs font-bold rounded-xl border border-[#1E293B] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiada</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#00BFFF]" />
                        <span>Copiar Chave</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownloadHtml(bio)}
                    className="py-2 px-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_2px_12px_rgba(0,191,255,0.25)]"
                    title="Baixar HTML Completo"
                  >
                    <Download className="w-3.5 h-3.5" />
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
            );
          })}
        </div>
      )}
    </div>
  );
}

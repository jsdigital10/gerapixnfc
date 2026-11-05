import React, { useState } from 'react';
import { generateProjectZip } from '../lib/projectZipExporter';
import {
  FIRESTORE_RULES_CONTENT,
  FIRESTORE_INDEXES_CONTENT,
  VERCEL_JSON_CONTENT,
  ADMIN_SETUP_SCRIPT_CONTENT,
} from '../lib/deploymentAssets';
import {
  Download,
  Copy,
  Check,
  Sparkles,
  FolderArchive,
} from 'lucide-react';

export function ProjectDownloadView() {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'rules' | 'indexes' | 'vercel' | 'script'>('rules');

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const blob = await generateProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gerapix-pro-completo-vercel.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Falha ao gerar ZIP: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleCopyCode = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Entrega de Produção</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Arquivos do Projeto & Hospedagem na Vercel
        </h1>
        <p className="text-xs md:text-sm text-neutral-400">
          Baixe o código-fonte integral em arquivo .ZIP pronto para publicar na Vercel e configurar o Firestore.
        </p>
      </div>

      {/* Main Download Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1120] via-[#111827] to-[#0A0E17] border border-[#00BFFF]/30 p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(0,191,255,0.15)]">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#00BFFF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-block px-3 py-1 bg-[#00BFFF]/15 text-[#00BFFF] text-xs font-black uppercase tracking-wider rounded-full border border-[#00BFFF]/30">
              Pacote de Entrega 100% Completo
            </span>
            <h2 className="text-2xl font-black text-white">
              Baixar Código-Fonte Completo (.ZIP)
            </h2>
            <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
              Inclui todos os componentes React, TypeScript, modelos gráficos 10x10 cm, regras de segurança do Firestore, índices, configuração da Vercel e scripts administrativos.
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black text-sm rounded-2xl transition shadow-[0_4px_30px_rgba(0,191,255,0.4)] cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>{downloadingZip ? 'Gerando Pacote ZIP...' : 'BAIXAR PACOTE COMPLETO (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Vercel Hosting 3-Step Guide */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00BFFF]" />
          <span>Passo a Passo para Hospedar na Vercel</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#0A0E17] rounded-xl border border-[#1E293B] space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#00BFFF] text-black font-black flex items-center justify-center text-xs">
              1
            </div>
            <strong className="text-white block">Subir para o GitHub</strong>
            <p className="text-neutral-400 leading-relaxed">
              Extraia o arquivo .ZIP e envie para um novo repositório em seu GitHub pessoal.
            </p>
          </div>

          <div className="p-4 bg-[#0A0E17] rounded-xl border border-[#1E293B] space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#00BFFF] text-black font-black flex items-center justify-center text-xs">
              2
            </div>
            <strong className="text-white block">Importar na Vercel</strong>
            <p className="text-neutral-400 leading-relaxed">
              No painel vercel.com, selecione o repositório. O preset <strong className="text-neutral-200">Vite</strong> será detectado automaticamente.
            </p>
          </div>

          <div className="p-4 bg-[#0A0E17] rounded-xl border border-[#1E293B] space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#00BFFF] text-black font-black flex items-center justify-center text-xs">
              3
            </div>
            <strong className="text-white block">Deploy Instantâneo</strong>
            <p className="text-neutral-400 leading-relaxed">
              Clique em <strong className="text-emerald-400">Deploy</strong>. O build gerará a pasta <code className="text-[#00BFFF]">dist</code> e seu sistema estará no ar.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Files Tabs */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'rules', label: 'firestore.rules' },
              { id: 'indexes', label: 'firestore.indexes.json' },
              { id: 'vercel', label: 'vercel.json' },
              { id: 'script', label: 'set-admin-claims.js' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCodeTab(tab.id as any)}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  activeCodeTab === tab.id
                    ? 'bg-[#00BFFF] text-black'
                    : 'text-neutral-400 hover:text-white bg-[#0A0E17] border border-[#1E293B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const code =
                activeCodeTab === 'rules'
                  ? FIRESTORE_RULES_CONTENT
                  : activeCodeTab === 'indexes'
                  ? FIRESTORE_INDEXES_CONTENT
                  : activeCodeTab === 'vercel'
                  ? VERCEL_JSON_CONTENT
                  : ADMIN_SETUP_SCRIPT_CONTENT;
              handleCopyCode(code, activeCodeTab);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0E17] hover:bg-[#111827] text-neutral-200 text-xs font-bold rounded-lg border border-[#1E293B] cursor-pointer self-start sm:self-auto"
          >
            {copiedKey === activeCodeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#00BFFF]" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-black/90 border border-[#1E293B] rounded-xl p-4 overflow-x-auto max-h-[400px]">
          <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
            {activeCodeTab === 'rules' && FIRESTORE_RULES_CONTENT}
            {activeCodeTab === 'indexes' && FIRESTORE_INDEXES_CONTENT}
            {activeCodeTab === 'vercel' && VERCEL_JSON_CONTENT}
            {activeCodeTab === 'script' && ADMIN_SETUP_SCRIPT_CONTENT}
          </pre>
        </div>
      </div>
    </div>
  );
}

import JSZip from 'jszip';
import { FIRESTORE_RULES_CONTENT, FIRESTORE_INDEXES_CONTENT, VERCEL_JSON_CONTENT, ADMIN_SETUP_SCRIPT_CONTENT } from './deploymentAssets';

/**
 * Packs all project source code, configuration files, Firebase rules, and Vercel configs
 * into a single downloadable .zip archive for the user.
 */
export async function generateProjectZip(): Promise<Blob> {
  const zip = new JSZip();

  // Root configuration files
  zip.file('firestore.rules', FIRESTORE_RULES_CONTENT);
  zip.file('firestore.indexes.json', FIRESTORE_INDEXES_CONTENT);
  zip.file('vercel.json', VERCEL_JSON_CONTENT);
  zip.file('scripts/set-admin-claims.js', ADMIN_SETUP_SCRIPT_CONTENT);

  zip.file('README.md', `# GERAPIX PRO — GUIA COMPLETO DE PRODUÇÃO E HOSPEDAGEM (VERCEL & FIREBASE)

## 1. Visão Geral
O **GERAPIX PRO** é um sistema completo e profissional para geração de plaquinhas Pix em lote (PDF A4 10x10cm com 4 por folha) e Biosites NFC para cópia rápida da chave Pix via smartphone.

## 2. Hospedagem na Vercel (Passo a Passo)
1. Crie um repositório no seu GitHub e suba os arquivos deste projeto.
2. Acesse seu painel na **Vercel** (vercel.com) e clique em **Add New > Project**.
3. Selecione o repositório do GitHub.
4. As configurações são detectadas automaticamente:
   - **Framework Preset**: Vite
   - **Build Command**: \`npm run build\`
   - **Output Directory**: \`dist\`
   - **Install Command**: \`npm install\`
5. Clique em **Deploy**. Seu sistema estará online em segundos!

## 3. Configuração do Firebase
O projeto já está apontado para o projeto Firebase oficial \`gera-pix-pro\`.
Para garantir segurança e funcionamento completo:

### Regras do Firestore:
No console do Firebase (https://console.firebase.google.com):
1. Acesse **Firestore Database > Regras (Rules)**.
2. Copie o conteúdo do arquivo \`firestore.rules\` deste pacote e cole no editor.
3. Clique em **Publicar (Publish)**.

### Administrador Oficial:
O e-mail oficial é **Jeannmkt2@gmail.com**.
O sistema já confere e ativa automaticamente a conta do administrador. Caso queira aplicar Custom Claims via Firebase Admin SDK, execute:
\`\`\`bash
cd scripts
npm install firebase-admin
node set-admin-claims.js Jeannmkt2@gmail.com
\`\`\`

## 4. Funcionalidades Principais
- Gerador de Lotes Pix com 10, 30, 50 e 100 unidades
- Numeração sequencial automática (#001, #002...)
- 5 modelos gráficos oficiais em alta definição
- Calibração de coordenadas e máscara de remoção do QR anterior
- Exportação de PDF A4 em padrão gráfico de 10x10 cm
- Biosite NFC com 14 bancos brasileiros e 5 temas exclusivos
- Download de HTML independente para hospedar na Vercel
- Painel Administrativo completo com aprovação e bloqueio de usuários
`);

  return await zip.generateAsync({ type: 'blob' });
}

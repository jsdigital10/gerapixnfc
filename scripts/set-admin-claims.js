/**
 * Script seguro para conceder Custom Claims (admin: true) no Firebase Authentication
 * 
 * Uso:
 * 1. Baixe sua chave privada do Firebase Console:
 *    Configurações do Projeto > Contas de serviço > Gerar nova chave privada
 * 2. Salve o arquivo JSON como "serviceAccountKey.json" nesta pasta.
 * 3. Execute:
 *    node scripts/set-admin-claims.js Jeannmkt2@gmail.com
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const targetEmail = process.argv[2] || 'Jeannmkt2@gmail.com';
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\x1b[31m[ERRO]\x1b[0m Arquivo serviceAccountKey.json não encontrado nesta pasta.');
  console.log('\nInstruções:');
  console.log('1. Acesse o Console do Firebase: https://console.firebase.google.com');
  console.log('2. Abra o projeto "gera-pix-pro"');
  console.log('3. Vá em Configurações do Projeto > Contas de serviço');
  console.log('4. Clique em "Gerar nova chave privada" e salve como serviceAccountKey.json nesta pasta.');
  console.log('5. Execute novamente este script.\n');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function grantAdminClaim(email) {
  try {
    console.log(`\x1b[33mBuscando usuário com e-mail: ${email}...\x1b[0m`);
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`Usuário encontrado! UID: ${user.uid}`);
    console.log('Aplicando custom claims { admin: true }...');
    
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    // Atualiza também o documento no Firestore
    const db = admin.firestore();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'Administrador Oficial',
      role: 'admin',
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('\x1b[32m[SUCESSO]\x1b[0m Privilégios de Administrador concedidos com sucesso!');
    console.log('Agora o administrador pode logar no GeraPix Pro e acessar o Painel Administrativo.');
    process.exit(0);
  } catch (err) {
    console.error('\x1b[31m[FALHA]\x1b[0m', err.message);
    process.exit(1);
  }
}

grantAdminClaim(targetEmail);

export const FIRESTORE_RULES_CONTENT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && (
        request.auth.token.admin == true ||
        request.auth.token.email.lower() == 'jeannmkt2@gmail.com' ||
        request.auth.token.email.lower() == 'jeanncarllostk00@gmail.com'
      );
    }

    function isApprovedUser() {
      return isAuthenticated() && (
        isAdmin() ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active')
      );
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId) && (
        (request.resource.data.role == 'user' && request.resource.data.status == 'pending') ||
        isAdmin()
      );
      allow update: if isAdmin() || (
        isOwner(userId) &&
        request.resource.data.role == resource.data.role &&
        request.resource.data.status == resource.data.status
      );
      allow delete: if isAdmin();
    }

    match /batches/{batchId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isApprovedUser() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow delete: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
    }

    match /plaques/{plaqueId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isApprovedUser() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow delete: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
    }

    match /biosites/{biositeId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isApprovedUser() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow delete: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
    }

    match /models/{modelId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /activity/{activityId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
  }
}`;

export const FIRESTORE_INDEXES_CONTENT = `{
  "indexes": [
    {
      "collectionGroup": "batches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "biosites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "plaques",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "batchId", "order": "ASCENDING" },
        { "fieldPath": "number", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}`;

export const VERCEL_JSON_CONTENT = `{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/models/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}`;

export const ADMIN_SETUP_SCRIPT_CONTENT = `/**
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
  console.error('[ERRO] Arquivo serviceAccountKey.json não encontrado nesta pasta.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function grantAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    const db = admin.firestore();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'Administrador Oficial',
      role: 'admin',
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('[SUCESSO] Privilégios de Administrador concedidos com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('[FALHA]', err.message);
    process.exit(1);
  }
}

grantAdminClaim(targetEmail);
`;

#!/usr/bin/env node
// ============================================
// Vitalia ローカル開発用 API サーバー
// ============================================
// 起動: node api-server.js
// エンドポイント: http://localhost:5001/api/gemini-coach

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const AIProvider = require('./ai-provider');

const app = express();
const PORT = process.env.PORT || 5001;

// AI プロバイダーを初期化
const aiProvider = new AIProvider();

// Firebase Admin SDK 初期化（lunaContext 取得用）
let db = null;
try {
  const admin = require('firebase-admin');
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://shonigann.firebaseapp.com'
  });
  db = admin.firestore();
  console.log('[API] ✅ Firebase Admin SDK initialized');
} catch (err) {
  console.log('[API] ⚠️  Firebase Admin SDK not available. lunaContext integration disabled.');
  console.log('[API]   Error:', err.message);
}

// ========== ミドルウェア ==========
app.use(cors());
app.use(express.json());

// ========== AI Coach エンドポイント（複数プロバイダー対応） ==========
app.post('/api/gemini-coach', async (req, res) => {
  console.log('[API] ════════════════════════════════════════');
  console.log('[API] POST /api/gemini-coach');
  console.log(`[API] Provider: ${aiProvider.provider.toUpperCase()}`);

  const { history, userText, userId } = req.body;

  // userText を詳細ログ
  console.log('[API] User Text: "' + (userText || 'EMPTY') + '"');
  console.log('[API] UserId: "' + (userId || 'EMPTY') + '"');
  console.log('[API] History length: ' + (history?.length || 0));

  // バリデーション
  if (!userText) {
    console.error('[API] ❌ userText is empty or missing');
    return res.status(400).json({ error: 'userText is required' });
  }

  try {
    // lunaContext を Firebase から取得（ある場合）
    if (db && userId) {
      try {
        console.log('[API] Fetching lunaContext for userId:', userId);
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().lunaContext) {
          const lunaContext = userDoc.data().lunaContext;
          console.log('[API] ✅ lunaContext found:', lunaContext);
          aiProvider.setLunaContext(lunaContext);
        } else {
          console.log('[API] ℹ️  No lunaContext found for userId:', userId);
          aiProvider.setLunaContext(null);
        }
      } catch (fbErr) {
        console.warn('[API] ⚠️  Failed to fetch lunaContext:', fbErr.message);
        aiProvider.setLunaContext(null);
      }
    } else {
      aiProvider.setLunaContext(null);
    }

    console.log('[API] Calling AIProvider.chat()...');

    // AIProvider を使用してチャット
    const reply = await aiProvider.chat(history || [], userText);

    console.log('[API] ✅ Success.');
    console.log('[API] Reply length: ' + reply.length);
    console.log('[API] Reply preview: "' + reply.substring(0, 100) + '"');
    console.log('[API] ════════════════════════════════════════');

    res.json({
      reply,
      success: true,
      provider: aiProvider.provider.toUpperCase()
    });
  } catch (error) {
    console.error('[API] ❌ Error:', error.message);
    console.error('[API] Full Error:', error);
    console.log('[API] ════════════════════════════════════════');

    res.status(500).json({
      error: `Failed to call ${aiProvider.provider.toUpperCase()} API`,
      message: error.message,
      details: error.toString(),
      success: false
    });
  }
});

// ========== ヘルスチェック ==========
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== サーバー起動 ==========
app.listen(PORT, () => {
  const providerStatus = aiProvider.apiKey ? '✅ Set' : '❌ Not set (using demo mode)';
  const providerName = aiProvider.provider.toUpperCase();
  const apiKeyEnvVar = `${providerName}_API_KEY`;

  console.log(`
  ╔════════════════════════════════════════╗
  ║ Vitalia API Server (Local Development) ║
  ╚════════════════════════════════════════╝

  🚀 Server running at: http://localhost:${PORT}

  📍 AI Coach Endpoint:
     POST http://localhost:${PORT}/api/gemini-coach

  🤖 AI Provider Configuration:
     - AI_PROVIDER: ${providerName}
     - ${apiKeyEnvVar}: ${providerStatus}
     - SERVER_PORT: ${PORT}

  ℹ️  Notes:
     - If API key is not set, responses will be generated locally (demo mode)
     - To use actual API: set ${apiKeyEnvVar} in .env file
     - To switch provider: change AI_PROVIDER in .env (gemini, openai, claude)

  📚 Setup Guide:
     $ node setup-env.js

  Press Ctrl+C to stop the server.
  `);
});

// ========== エラーハンドリング ==========
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

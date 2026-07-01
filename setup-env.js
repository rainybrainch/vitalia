#!/usr/bin/env node
/**
 * 環境変数セットアップスクリプト
 *
 * 用途: 初回起動時に .env ファイルを自動生成し、
 *       ユーザーに API キー設定方法を案内する
 *
 * 実行: node setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// ============================================
// ログ出力用のカラー定義
// ============================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, text) {
  console.log(`${color}${text}${colors.reset}`);
}

function banner(title) {
  console.log('\n' + '╔' + '═'.repeat(50) + '╗');
  console.log('║ ' + title.padEnd(49) + '║');
  console.log('╚' + '═'.repeat(50) + '╝\n');
}

// ============================================
// メイン処理
// ============================================
async function main() {
  banner('Vitalia API Server - Environment Setup');

  // ステップ1: .env が既に存在するか確認
  if (fs.existsSync(envPath)) {
    log(colors.green, '✅ .env ファイルが既に存在します。');
    log(colors.dim, `   パス: ${envPath}`);
    console.log('');

    // 既存の .env が有効か確認
    const content = fs.readFileSync(envPath, 'utf-8');
    if (content.includes('GEMINI_API_KEY=') || content.includes('AI_PROVIDER=')) {
      log(colors.green, '✅ 設定が検出されました。セットアップ完了です。');
      console.log('');
      showStatus();
      return;
    }
  }

  // ステップ2: .env が存在しない場合、作成
  log(colors.blue, '📝 .env ファイルを作成しています...');
  const envContent = generateEnvContent();
  fs.writeFileSync(envPath, envContent);
  log(colors.green, `✅ .env ファイルを作成しました: ${envPath}`);
  console.log('');

  // ステップ3: API キー設定方法を案内
  showSetupGuide();

  // ステップ4: ユーザーに入力を促す
  await promptForApiKey();
}

// ============================================
// .env テンプレートを生成
// ============================================
function generateEnvContent() {
  return `# ============================================
# Vitalia API Server 環境変数
# ============================================

# AI プロバイダー選択
# 選択肢: gemini, openai, claude
AI_PROVIDER=gemini

# ========== Gemini API ==========
# Google Gemini API キーを設定
# 取得方法: https://ai.google.dev/
GEMINI_API_KEY=

# ========== OpenAI API (将来用) ==========
# OPENAI_API_KEY=

# ========== Claude API (将来用) ==========
# CLAUDE_API_KEY=

# ========== サーバー設定 ==========
# ローカルサーバーのポート
PORT=5001

# ログレベル
LOG_LEVEL=info

# ============================================
# セットアップ方法:
# ============================================
# 1. Google AI Studio で API キーを取得
#    https://ai.google.dev/
#
# 2. 上記の GEMINI_API_KEY= の後に、キーを貼り付け
#    例: GEMINI_API_KEY=AIza...
#
# 3. ファイルを保存
#
# 4. API サーバーを再起動
#    \$ npm run dev
#
# ============================================
`;
}

// ============================================
// セットアップガイドを表示
// ============================================
function showSetupGuide() {
  banner('Gemini API キー取得方法');

  log(colors.bright, '【ステップ1】Google AI Studio にアクセス');
  log(colors.dim, '  https://ai.google.dev/');
  console.log('');

  log(colors.bright, '【ステップ2】左メニューから「API keys」をクリック');
  console.log('');

  log(colors.bright, '【ステップ3】「Create API key」ボタンをクリック');
  console.log('');

  log(colors.bright, '【ステップ4】生成された API キーをコピー');
  log(colors.yellow, '  ⚠️  キーは絶対に GitHub に commit しないでください');
  console.log('');

  log(colors.bright, '【ステップ5】.env ファイルを編集');
  log(colors.cyan, `  ${envPath}`);
  log(colors.dim, '  GEMINI_API_KEY=<取得したキーを貼り付け>');
  console.log('');
}

// ============================================
// ユーザーに .env 編集を促す
// ============================================
async function promptForApiKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  log(colors.yellow, '⚠️  .env ファイルを編集してください:');
  console.log('');
  log(colors.cyan, `  ${envPath}`);
  console.log('');
  log(colors.dim, '  1. メモ帳 / VS Code で .env を開く');
  log(colors.dim, '  2. GEMINI_API_KEY= の後に API キーを貼り付け');
  log(colors.dim, '  3. ファイルを保存');
  console.log('');

  return new Promise((resolve) => {
    rl.question(
      log(colors.bright, '✨ .env に API キーを設定しましたか？ (y/n): '),
      (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'y') {
          log(colors.green, '✅ 設定ありがとうございます。');
          console.log('');
          log(colors.bright, 'API サーバーを起動してください:');
          log(colors.cyan, '  npm run dev');
          console.log('');
          showStatus();
        } else {
          log(colors.yellow, '⏸️  セットアップを保留します。');
          log(colors.dim, '  後で以下を実行してください: node setup-env.js');
        }
        resolve();
      }
    );
  });
}

// ============================================
// 現在の設定状態を表示
// ============================================
function showStatus() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  banner('現在の設定状態');

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  let provider = '未設定';
  let geminiStatus = '未設定';
  let openaiStatus = '未設定';
  let claudeStatus = '未設定';

  lines.forEach((line) => {
    if (line.includes('AI_PROVIDER=')) {
      const match = line.match(/AI_PROVIDER=(.+)/);
      if (match) provider = match[1].trim() || '未設定';
    }
    if (line.includes('GEMINI_API_KEY=') && !line.startsWith('#')) {
      const match = line.match(/GEMINI_API_KEY=(.+)/);
      geminiStatus = match && match[1].trim() ? '✅ Set' : '❌ Not set';
    }
    if (line.includes('OPENAI_API_KEY=') && !line.startsWith('#')) {
      const match = line.match(/OPENAI_API_KEY=(.+)/);
      openaiStatus = match && match[1].trim() ? '✅ Set' : '未設定';
    }
    if (line.includes('CLAUDE_API_KEY=') && !line.startsWith('#')) {
      const match = line.match(/CLAUDE_API_KEY=(.+)/);
      claudeStatus = match && match[1].trim() ? '✅ Set' : '未設定';
    }
  });

  console.log(`  📝 AI プロバイダー: ${colors.bright}${provider}${colors.reset}`);
  console.log(`  🔑 Gemini API: ${geminiStatus}`);
  console.log(`  🔑 OpenAI API: ${openaiStatus}`);
  console.log(`  🔑 Claude API: ${claudeStatus}`);
  console.log('');
}

// ============================================
// 実行
// ============================================
main().catch((err) => {
  log(colors.red, `❌ エラー: ${err.message}`);
  process.exit(1);
});

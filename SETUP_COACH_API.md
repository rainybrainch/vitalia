# 🤖 Vitalia ルナ (AI Coach API) セットアップガイド

## 📋 概要

Vitalia のルナとの会話機能を有効にするには、ローカル API サーバーが必要です。

このセットアップは以下の AI プロバイダーに対応しています：

| プロバイダー | 環境 | 料金 | セットアップ難度 |
|---|---|---|---|
| **Gemini** ✅ | ローカル / 本番 | 無料枠あり | ⭐ 簡単 |
| **OpenAI** 🔮 | ローカル / 本番 | 従量課金（$0.15/1M tokens） | ⭐ 簡単 |
| **Claude** 🔮 | ローカル / 本番 | 従量課金（$3/1M tokens） | ⭐ 簡単 |

---

## 🚀 クイックスタート（3分）

### **1️⃣ セットアップスクリプトを実行**

```bash
cd プロジェクトディレクトリ
npm install
npm run setup
```

✅ セットアップスクリプトが自動で以下を実行します：
- `.env` ファイルの作成
- API キー取得方法の案内
- 設定状態の確認

---

### **（代替）手動セットアップ**

API キー取得方法が不明な場合：

**1. Google Gemini API キーを取得**

```
1. https://ai.google.dev/ にアクセス
2. 左メニューから「API keys」を選択
3. 「Create API key」ボタンをクリック
4. 生成されたキーをコピー
```

**2. .env ファイルを作成**

```bash
# Windows PowerShell の場合:
notepad .env

# または VS Code で作成:
# .env というファイルを新規作成
```

**3. .env に以下の内容を記入**

```
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...（取得したキーを貼り付け）
PORT=5001
```

**4. ファイルを保存**

---

### **2️⃣ Node.js パッケージをインストール**

```bash
npm install
```

✅ `node_modules/` フォルダが作成されたら成功。

### **3️⃣ ターミナル1：API サーバーを起動**

```bash
npm run dev
```

✅ 以下のメッセージが表示されたら起動完了：
```
🚀 Server running at: http://localhost:5001

🤖 AI Provider Configuration:
   - AI_PROVIDER: GEMINI
   - GEMINI_API_KEY: ✅ Set
```

### **4️⃣ ターミナル2：Live Server で game.html を開く**

```bash
# VSCode の「Live Server」拡張を使う場合:
# game.html を右クリック → "Open with Live Server"

# または Python を使う場合:
python -m http.server 5500
# ブラウザで http://localhost:5500/game.html を開く
```

✅ ブラウザで `http://localhost:5500/game.html` が開いたら準備完了。

---

## ✅ 動作確認

### **ステップ1: ルナに話しかける**

1. game.html を開く
2. ログイン（研究参加コード or ニックネーム）
3. 下部「🤖 AI」タブ → 「ルナに相談」
4. メッセージを入力 → 送信

**期待される動作:**
- ✅ `[Coach] Calling API: http://localhost:5001/api/gemini-coach` がコンソールに表示
- ✅ 0.5〜3秒待つ
- ✅ ルナから返答が返される

### **ステップ2: コンソールを確認**

**ブラウザコンソール（F12）の「Console」タブ:**
```
[Coach] Calling API: http://localhost:5001/api/gemini-coach
[Coach] API Response: {reply: "素晴らしい質問ですね。まず..."}
```

**API サーバーターミナル:**
```
[API] POST /api/gemini-coach
[API] Body: {
  "history": [],
  "userText": "今日のおすすめ教えて"
}
[API] Calling Gemini API...
[API] ✅ Success. Reply: 素晴らしい質問ですね。まず...
```

### **ステップ3: エラーが出た場合**

| エラー | 原因 | 対処 |
|---|---|---|
| `404 Not Found` | API サーバーが起動していない | `npm run dev` を実行 |
| `CORS error` | CORS が設定されていない | api-server.js を確認（`express.use(cors())`） |
| `401 Unauthorized` | Gemini API キーが無効 | キーを再取得して .env を更新 |
| ローカルレスポンス | `GEMINI_API_KEY` が未設定 | .env に `GEMINI_API_KEY=...` を追加 |

---

## 📝 API リクエスト・レスポンス仕様

### **Request**

```json
{
  "history": [
    {"role": "user", "text": "過去のメッセージ1"},
    {"role": "model", "text": "ルナの返答1"},
    {"role": "user", "text": "過去のメッセージ2"}
  ],
  "userText": "今のユーザーメッセージ"
}
```

### **Response (Success)**

```json
{
  "reply": "ルナからの返答テキスト"
}
```

### **Response (Error)**

```json
{
  "error": "Failed to call Gemini API",
  "message": "詳細なエラーメッセージ"
}
```

---

## 🔧 トラブルシューティング

### **npm install でエラーが出た**

```bash
# Node.js が正しくインストールされているか確認
node --version  # v14 以上が必要
npm --version   # v6 以上が必要

# キャッシュをクリアして再試行
npm cache clean --force
npm install
```

### **API サーバーが起動しない**

```bash
# ポート 5001 が既に使用されている可能性
# 別のプロセスを確認
lsof -i :5001  # macOS/Linux
netstat -ano | findstr :5001  # Windows

# 使用ポートを変更
PORT=5002 npm run dev
```

### **Gemini API キーが無効**

- キーを取得してから 1 時間待つ
- https://console.cloud.google.com で API が有効化されているか確認
- キーを再生成して試す

### **CORS エラーが出た**

```
Access to XMLHttpRequest at 'http://localhost:5001/...' from origin 'http://localhost:5500'
has been blocked by CORS policy
```

→ api-server.js に `app.use(cors());` が設定されているか確認

---

---

## 🔄 AI プロバイダーの切り替え

Vitalia は複数の AI プロバイダーに対応しています。プロバイダーを切り替えるのは簡単です。

### **Gemini → OpenAI に切り替え（例）**

**ステップ1: OpenAI API キーを取得**

```
1. https://platform.openai.com/ にアクセス
2. 「API keys」セクションで新しいキーを生成
3. キーをコピー
```

**ステップ2: .env を編集**

```bash
# .env を開く
notepad .env
```

**編集内容:**

```diff
- AI_PROVIDER=gemini
+ AI_PROVIDER=openai

- GEMINI_API_KEY=AIza...
+ OPENAI_API_KEY=sk-...（OpenAI のキーを貼り付け）
```

**ステップ3: サーバーを再起動**

```bash
npm run dev
```

✅ 起動ログで確認：
```
🤖 AI Provider Configuration:
   - AI_PROVIDER: OPENAI
   - OPENAI_API_KEY: ✅ Set
```

### **利用可能なプロバイダー一覧**

| プロバイダー | AI_PROVIDER 値 | API キー環境変数 | 取得URL |
|---|---|---|---|
| Google Gemini | `gemini` | `GEMINI_API_KEY` | https://ai.google.dev/ |
| OpenAI GPT-4o | `openai` | `OPENAI_API_KEY` | https://platform.openai.com/ |
| Anthropic Claude | `claude` | `CLAUDE_API_KEY` | https://console.anthropic.com/ |

---

## 🌐 本番環境へのデプロイ（後の手順）

### **Vercel へのデプロイ例**

```bash
# 1. Vercel アカウント作成 (https://vercel.com)
# 2. vercel CLI をインストール
npm install -g vercel

# 3. 環境変数を設定
# Vercel Dashboard → Settings → Environment Variables
# GEMINI_API_KEY (または使用するプロバイダーのキー) を設定

# 4. デプロイ
vercel

# 5. game.html の COACH_PROXY_URL を変更
// 例: https://vitalia-api.vercel.app/api/gemini-coach
```

### **Netlify へのデプロイ例**

```bash
# 1. Netlify に API サーバーのディレクトリをコミット
git add api-server.js ai-provider.js setup-env.js package.json .env.example
git commit -m "Add API server for Vitalia"

# 2. Netlify Dashboard で環境変数を設定
# GEMINI_API_KEY を設定

# 3. デプロイ
# Netlify の Functions で /api/gemini-coach を自動起動
```

---

## 📊 各プロバイダーの比較

| 項目 | Gemini | OpenAI | Claude |
|---|---|---|---|
| **無料枠** | 月100万リクエスト | なし | 試用クレジット |
| **入力トークン単価** | 無料 | $0.15/1M | $3/1M |
| **出力トークン単価** | 無料 | $0.60/1M | $15/1M |
| **応答速度** | 高速 | 標準 | 標準 |
| **推奨用途** | **開発・テスト** | 本番環境 | 高品質が必要な場合 |

**推奨:** 開発段階は **Gemini**（無料）、本番環境は要件に応じて選択

---

## ✨ 参考リンク

- 📖 [Google AI Studio](https://ai.google.dev/)
- 📖 [OpenAI Platform](https://platform.openai.com/)
- 📖 [Anthropic Console](https://console.anthropic.com/)
- 🚀 [Express.js Documentation](https://expressjs.com/)
- ♻️ [CORS Middleware](https://github.com/expressjs/cors)
- 📦 [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments/overview)
- 📦 [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)

---

## ❓ その他の質問

- API の実装ファイル: `api-server.js`
- 環境変数の設定: `.env` （`.env.example` をコピー）
- game.html の変更箇所: [line 5171-5180] COACH_PROXY_URL / [line 5379-5397] callCoachProxy()

質問があれば、このファイルのセクションを参照してください。

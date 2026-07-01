# ✅ Gemini API × Firebase 検証チェックリスト

## 📊 5つの確認項目

### **1️⃣ ルナは Gemini API で返答しているか？**

**確認方法:**

ブラウザコンソール（F12 → Console）で以下を確認：

```
✅ [Coach] Calling API: http://localhost:5001/api/gemini-coach
✅ [Coach] API Response: {reply: "今週は無理なく続けるなら..."}
```

**良い兆候:**
- API が呼ばれている
- レスポンスが質問に応じた内容（デモモードではない）
- 返答に具体的な提案が含まれている

**悪い兆候:**
- エラーが出ている（401, 403, 500 など）
- API が呼ばれていない
- 返答が常に同じ曖昧な内容

---

### **2️⃣ ルナとの会話は Firestore に保存されているか？**

**確認方法:**

ブラウザコンソール（F12 → Console）で以下を確認：

```
✅ [Coach] 📝 Initializing Firebase conversation...
✅ [Coach] ✅ Firebase conversation initialized
✅ [Coach] 💬 Saving user message to Firebase...
✅ [Coach] ✅ User message saved to Firebase
✅ [Coach] 💬 Saving Luna reply to Firebase...
✅ [Coach] ✅ Luna reply saved to Firebase
✅ [Coach] 📊 Updating conversation metadata...
✅ [Coach] ✅ Conversation metadata updated
```

**良い兆候:**
- すべてのログが ✅ で表示される
- Document ID が出力される
- エラーが出ていない

**悪い兆候:**
- ❌ Failed... というエラーが出ている
- ログが出ていない
- 一部のログだけ出ている

---

### **3️⃣ 保存先の正確なパスは？**

**Conversation ドキュメント:**
```
/users/{userId}/lunaConversations/{conversationId}
```

**メッセージ（サブコレクション）:**
```
/users/{userId}/lunaConversations/{conversationId}/messages/{messageId}
```

**具体例:**
```
/users/user_1719999999_abc123/lunaConversations/conv_20260701_xxxxx
/users/user_1719999999_abc123/lunaConversations/conv_20260701_xxxxx/messages/xxxxx
```

**コンソールログで確認できる:**
```
[Coach] Path: users/user_1719999999_abc123/lunaConversations/conv_20260701_xxxxx/messages
```

---

### **4️⃣ Firebase Console で確認する手順は？**

**4ステップで確認可能:**

```
1. https://console.firebase.google.com/ を開く

2. プロジェクト「shounigann」を選択

3. Firestore Database → users コレクション

4. {userId} ドキュメント → lunaConversations コレクション
   → {conversationId} ドキュメント を展開

5. 以下が表示されるはず：
   ✅ conversationId: "conv_20260701_xxxxx"
   ✅ userId: "user_..."
   ✅ userName: "テスト太郎"
   ✅ messageCount: 2 (以上)
   ✅ lastUserMessage: "質問内容"
   ✅ lastLunaReply: "ルナの返答"

6. messages サブコレクションを展開
   ✅ メッセージが複数件保存されている
   ✅ role が "user" または "model"
   ✅ timestamp がある
```

**詳細は:** `FIRESTORE_LUNA_GUIDE.md` を参照

---

### **5️⃣ 保存に失敗している場合のログ確認**

**成功時のログ:**
```
✅ [Coach] ✅ User message saved to Firebase
   [Coach]   Document ID: xxxxx
```

**失敗時のログ:**
```
❌ [Coach] ❌ Failed to save user message to Firebase
   [Coach]   Error: Permission denied
   [Coach]   Code: permission-denied
   [Coach]   Full error: {...}
```

**エラーコード別の対応:**

| エラーコード | 原因 | 対処方法 |
|---|---|---|
| `permission-denied` | Firestore 権限がない | Security Rules を確認 |
| `not-found` | コレクションが存在しない | Firestore を初期化 |
| `UNAUTHENTICATED` | 認証されていない | ログインをやり直す |
| `INTERNAL` | サーバーエラー | しばらく待ってから再試行 |

---

## 🔄 実行フロー図

```
ユーザーがメッセージを送信
    ↓
[1] Firebase Conversation セッションを初期化（初回のみ）
    ↓
[2] Firebase にユーザーメッセージを保存
    [コンソールログ: "✅ User message saved to Firebase"]
    ↓
[3] Gemini API を呼び出し
    [コンソールログ: "✅ Gemini response received"]
    ↓
[4] Firebase にルナの返答を保存
    [コンソールログ: "✅ Luna reply saved to Firebase"]
    ↓
[5] Conversation メタデータを更新
    [コンソールログ: "✅ Conversation metadata updated"]
    ↓
画面にルナの返答が表示
```

---

## 📝 確認テスト手順

### **ステップ1: 環境を準備**

```bash
# ターミナル1: API サーバー実行中か確認
npm run dev

# ログに表示されるはず：
# 🤖 AI Provider Configuration:
#    - AI_PROVIDER: GEMINI
#    - GEMINI_API_KEY: ✅ Set
```

### **ステップ2: ブラウザでテスト**

```
1. http://localhost:5500/game.html を開く
2. ログイン（test001 / テスト太郎）
3. 🤖 AI タブ
4. 「今週のおすすめの運動を教えてください」と送信
```

### **ステップ3: コンソール確認（F12）**

```
期待されるログ（全て表示されるはず）:

✅ [Coach] 📝 Initializing Firebase conversation...
✅ [Coach] ✅ Firebase conversation initialized
✅ [Coach] 💬 Saving user message to Firebase...
✅ [Coach] ✅ User message saved to Firebase
✅ [Coach] Calling API: http://localhost:5001/api/gemini-coach
✅ [Coach] API Response: {reply: "..."}
✅ [Coach] 💬 Saving Luna reply to Firebase...
✅ [Coach] ✅ Luna reply saved to Firebase
✅ [Coach] 📊 Updating conversation metadata...
✅ [Coach] ✅ Conversation metadata updated
```

### **ステップ4: Firestore 確認**

```
1. Firebase Console を開く
2. users/{userId}/lunaConversations を確認
3. conv_YYYYMMDD_xxxxx ドキュメントが作成されている
4. messages サブコレクションに 2 件以上のメッセージがある
```

### **ステップ5: ルナの返答品質を確認**

```
質問: 「今週のおすすめの運動を教えてください」

✅ 良い返答例:
「今週は無理なく続けるなら、これがおすすめです。
1. 10分の散歩を週3回
2. 家で軽いストレッチを5分
3. 疲れている日は深呼吸だけでもOK
体調が悪い日は休んで大丈夫です。」

❌ 悪い返答例:
「あなたのペースで進めましょう。」
```

---

## 🎯 成功の基準

### **すべて ✅ なら成功です：**

- ✅ Gemini API が呼ばれている（ログで確認）
- ✅ Firestore にセッションが作成されている
- ✅ Firestore にメッセージが保存されている
- ✅ コンソールログにエラーが出ていない
- ✅ ルナの返答が具体的で質問に答えている

---

## 🚀 次のステップ

すべてが ✅ なら、以下に進みます：

```
→ ホーム画面リデザイン（フェーズ1 + 2）
  ・新 5タブ構成の実装
  ・ホーム画面の簡略化
  ・キャラクター × タブの対応
```

---

## 📞 サポート

各種ガイド：
- **Gemini API セットアップ:** `SETUP_COACH_API.md`
- **Firestore 詳細:** `FIRESTORE_LUNA_GUIDE.md`
- **プロンプト改善:** `ai-provider.js` の system prompt を参照

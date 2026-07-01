# 🗄️ Vitalia ルナ × Firestore 連携ガイド

## 📋 概要

Vitalia では、ユーザーがルナと交わした会話をすべて Firebase Firestore に保存します。
これにより、研究者が参加者の相談内容や変化を追跡できます。

---

## 📍 保存先の構造

### **Firestore コレクションツリー**

```
Firestore (shounigann プロジェクト)
│
└─ users/ (ユーザーコレクション)
    │
    └─ {userId} (ユーザードキュメント)
        │
        ├─ profile/ (プロフィール情報)
        │
        ├─ weeklyCheckins/ (週次チェックイン)
        │
        └─ lunaConversations/ (✨ ルナ会話コレクション)
            │
            ├─ {conversationId_1} (セッション1)
            │   ├─ conversationId: "conv_20260701_abc123"
            │   ├─ userId: "user_1719999999_abc123"
            │   ├─ userName: "テスト太郎"
            │   ├─ mode: "G" (GROW段階)
            │   ├─ startedAt: 2026-07-01T14:00:00Z
            │   ├─ updatedAt: 2026-07-01T14:15:00Z
            │   ├─ messageCount: 4 (ユーザー + ルナの合計)
            │   ├─ lastUserMessage: "今週のおすすめの運動を教えてください"
            │   ├─ lastLunaReply: "今週は無理なく続けるなら..."
            │   ├─ summaryStatus: "raw"
            │   │
            │   └─ messages/ (メッセージサブコレクション)
            │       ├─ {messageId_1} (メッセージ1)
            │       │   ├─ timestamp: 2026-07-01T14:00:10Z
            │       │   ├─ role: "user"
            │       │   ├─ text: "今週のおすすめの運動を教えてください"
            │       │   ├─ userId: "user_1719999999_abc123"
            │       │   ├─ userName: "テスト太郎"
            │       │   └─ mode: "G"
            │       │
            │       └─ {messageId_2} (メッセージ2)
            │           ├─ timestamp: 2026-07-01T14:00:15Z
            │           ├─ role: "model" (ルナ)
            │           ├─ text: "今週は無理なく続けるなら..."
            │           ├─ userId: "user_1719999999_abc123"
            │           ├─ userName: "テスト太郎"
            │           └─ mode: "G"
            │
            └─ {conversationId_2} (セッション2)
                └─ ... (同じ構造)
```

### **正確なパス**

```
保存先（Conversation ドキュメント）:
  /users/{userId}/lunaConversations/{conversationId}

保存先（各メッセージ）:
  /users/{userId}/lunaConversations/{conversationId}/messages/{messageId}
```

**具体例:**
```
/users/user_1719999999_abc123/lunaConversations/conv_20260701_abc123
/users/user_1719999999_abc123/lunaConversations/conv_20260701_abc123/messages/xxxxx
```

---

## 🔍 Firebase Console で確認する手順

### **ステップ1: Firebase Console を開く**

```
https://console.firebase.google.com/
```

### **ステップ2: プロジェクト「shounigann」を選択**

Firebase Dashboard から、プロジェクト一覧の中から「shounigann」をクリック。

### **ステップ3: Firestore Database を開く**

左メニュー → **Firestore Database** をクリック

### **ステップ4: users コレクションを展開**

```
コレクション: users
```

クリックして展開。

### **ステップ5: ユーザーID を確認**

```
ドキュメント: user_1719999999_abc123 （ログイン時の userId）
```

クリックして展開。

### **ステップ6: lunaConversations コレクションを展開**

```
コレクション: lunaConversations
```

ここにセッション別のドキュメントが表示されます。

### **ステップ7: conversationId ドキュメントをクリック**

```
ドキュメント: conv_20260701_abc123
```

以下の情報が表示されるはず：

```
conversationId: "conv_20260701_abc123"
userId: "user_1719999999_abc123"
userName: "テスト太郎"
mode: "G"
startedAt: タイムスタンプ
updatedAt: タイムスタンプ
messageCount: 4
lastUserMessage: "今週のおすすめの運動を教えてください"
lastLunaReply: "今週は無理なく続けるなら..."
summaryStatus: "raw"
```

### **ステップ8: messages サブコレクションを展開**

```
サブコレクション: messages
```

をクリックすると、**ユーザーメッセージとルナの返答** が時系列で表示されます。

**各メッセージの構造:**

```
{messageId} ドキュメント
├─ timestamp: 2026-07-01T14:00:10Z
├─ role: "user" または "model"
├─ text: "メッセージテキスト"
├─ userId: "user_..."
├─ userName: "テスト太郎"
└─ mode: "G"
```

---

## 📊 コンソールログで確認する手順

### **ブラウザの開発者ツールを開く**

```
F12 キー
または
右クリック → 検査
```

### **Console タブを選択**

### **期待されるログシーケンス**

```
[Coach] 📝 Initializing Firebase conversation...
[Coach]   Path: users/user_1719999999_abc123/lunaConversations/conv_20260701_xxxxx
[Coach] ✅ Firebase conversation initialized
[Coach]   Conversation ID: conv_20260701_xxxxx

[Coach] 💬 Saving user message to Firebase...
[Coach]   Path: users/user_1719999999_abc123/lunaConversations/conv_20260701_xxxxx/messages
[Coach]   Text: 今週のおすすめの運動を教えてください
[Coach] ✅ User message saved to Firebase
[Coach]   Document ID: xxxxx

[Coach] Calling API: http://localhost:5001/api/gemini-coach
[Coach] API Response: {reply: "今週は無理なく続けるなら..."}

[Coach] 💬 Saving Luna reply to Firebase...
[Coach]   Path: users/user_1719999999_abc123/lunaConversations/conv_20260701_xxxxx/messages
[Coach]   Text: 今週は無理なく続けるなら...
[Coach] ✅ Luna reply saved to Firebase
[Coach]   Document ID: xxxxx

[Coach] 📊 Updating conversation metadata...
[Coach] ✅ Conversation metadata updated
[Coach]   messageCount: 2
```

### **エラーが出た場合**

```
❌ Failed to initialize Firebase conversation
   Error: [エラーメッセージ]
   Code: [エラーコード]
```

---

## 📋 チェックリスト

### **1️⃣ API サーバーの確認**

```
✅ npm run dev が起動している
✅ GEMINI_API_KEY: ✅ Set が表示されている
```

### **2️⃣ ブラウザでのテスト**

```
✅ http://localhost:5500/game.html にアクセスしている
✅ ログイン済み
✅ 🤖 AI タブでルナに質問を送信した
```

### **3️⃣ コンソールログの確認**

```
✅ F12 → Console で上記のログが全て表示されている
✅ ❌ エラーが出ていない
```

### **4️⃣ Firebase Console の確認**

```
✅ users/{userId}/lunaConversations/{conversationId} が作成されている
✅ messages サブコレクションに user + model の 2 件が保存されている
✅ messageCount が 2 になっている
✅ lastUserMessage / lastLunaReply が正しく保存されている
```

---

## 🚨 トラブルシューティング

### **ログが表示されない**

**原因:** Firestore が初期化されていない

```
解決策:
1. ブラウザをリロード
2. ログイン画面でもう一度ログインする
3. F12 → Console で新しいログを確認
```

### **「Failed to save to Firebase」エラー**

**原因:** Firebase 認証が失敗している、または Firestore の権限がない

```
解決策:
1. Firestore Security Rules を確認
2. プロジェクトの認証が有効か確認
3. ネットワーク接続を確認
```

### **messageCount が増えない**

**原因:** updateDoc が失敗している

```
解決策:
1. コンソールのエラーを確認
2. Firestore の書き込み権限を確認
3. conversationId が正しいか確認
```

---

## 📚 Firestore Security Rules（参考）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      // ユーザー自身のデータのみアクセス可能
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## 💡 研究データの活用例

### **個人分析**

```
users/{userId}/lunaConversations
↓
各セッションの messageCount, lastUserMessage, lastLunaReply を分析
↓
参加者がルナにどんな相談をしているか、どう変化しているか追跡可能
```

### **グループ分析**

```
全 users のルnaConversations を集計
↓
「運動の相談」「食事の相談」「メンタルの相談」の傾向を抽出
↓
研究レポートに反映
```

### **時系列分析**

```
messages の timestamp を利用
↓
参加者がいつ相談したか、セッション時間などを分析
↓
利用パターンの理解
```

---

## ✅ 次のステップ

1. **ブラウザでルナに質問を送信**
2. **コンソールログを確認（F12）**
3. **Firebase Console で Firestore を確認**
4. **データが正しく保存されていることを確認**

すべてが正常に動作していれば、**ホーム画面リデザイン（フェーズ1 + 2）** に進むことができます！ 🚀

# Dify Workflow 統合 実装検証

## 実装完了項目

### ✅ game.html
- [x] scene-chat HTML 構造実装（id="luna-response-container"）
- [x] 「了解」「もっと話す」ボタン実装
- [x] 「ルナと話す」ホームカード onclick を `gameState.displayChatWithLuna()` に変更

### ✅ game-state.js
- [x] `displayChatWithLuna()` メソッド実装
  - [x] loading シーン表示
  - [x] Firebase からプロフィール取得
  - [x] Firebase から週次データ取得（オプション）
  - [x] lunaContextGenerator で変換
  - [x] Dify API 呼び出し
  - [x] ローカル メモリに保存（this.lunaResponse）
  - [x] chat シーン遷移
  - [x] エラーハンドリング

- [x] `displayChatScene()` メソッド改善
  - [x] 改行を保持した複数行表示
  - [x] 段落単位での分割表示
  - [x] エラーメッセージ表示

- [x] `respondToLuna()` メソッド実装
  - [x] 「了解」→ ホームに戻る
  - [x] 「もっと話す」→ ホームに戻る（将来拡張予定）

### ✅ dify-api.js
- [x] `sendLunaInitialMessage()` メソッド実装
  - [x] API キー存在確認
  - [x] ペイロード構築（inputs.luna_context, inputs.query）
  - [x] タイムアウト 30秒設定
  - [x] デモモード対応（API キー未設定時）
  - [x] エラーハンドリング（401/404/429/500-503）
  - [x] レスポンス抽出（outputs.answer 他）

- [x] `getAnswer()` メソッド（優先順位付き抽出）
- [x] `generateDemoLunaResponse()` デモ返答生成
- [x] DifyAPIError クラス（エラー情報保持）

### ✅ firebase-api.js
- [x] `loadProfile()` プロフィール取得
- [x] `getLatestWeeklyCheckin()` 週次データ取得（DESC order）

### ✅ luna-context-generator.js
- [x] `generateLunaContext()` コンテキスト生成
  - [x] 基本情報抽出
  - [x] 週次ステータス抽出
  - [x] コーチング注記生成
  - [x] 安全注記生成

## フロー図

```
ユーザー: 「ルナと話す」クリック
   ↓
gameState.displayChatWithLuna()
   ├─ goToScene('loading') → ローディング表示
   ├─ firebaseAPI.loadProfile() → プロフィール取得
   ├─ firebaseAPI.getLatestWeeklyCheckin() → 週次データ取得（オプション）
   ├─ lunaContextGenerator.generateLunaContext() → コンテキスト生成
   ├─ difyAPI.sendLunaInitialMessage() → Dify 呼び出し
   │  ├─ API キー確認 → なければ generateDemoLunaResponse()
   │  ├─ fetch POST https://api.dify.ai/v1/workflows/run
   │  ├─ ペイロード: { inputs: { luna_context, query }, response_mode, user }
   │  ├─ タイムアウト 30秒（AbortController）
   │  ├─ エラーハンドリング（401/404/429/500-503）
   │  └─ 返答: response.outputs.answer or others
   ├─ this.lunaResponse = 返答
   ├─ goToScene('chat') → チャット画面遷移
   └─ displayChatScene() → 返答表示
      ├─ 改行を保持
      ├─ 段落単位で分割
      └─ luna-dialog に表示

ユーザー: 「了解」「もっと話す」クリック
   ↓
gameState.respondToLuna('understood' or 'more')
   └─ goToScene('home') → ホームに戻す
```

## テスト手順

### 1. ローカルテスト（デモモード）
```bash
# API キー未設定状態で実行
# → generateDemoLunaResponse() が実行
# → デモ返答が表示される
```

### 2. Dify API キー設定時
```javascript
// ブラウザコンソール
localStorage.setItem('dify_api_key', 'your-api-key-here');
// または
difyAPI.setApiKey('your-api-key-here', 'your-workflow-id');
```

### 3. E2E テストシナリオ

| シナリオ | 期待値 | 検証項目 |
|---|---|---|
| ホーム→ルナと話す→loading 表示 | 3秒以内に返答 | ネットワーク遅延・UI応答 |
| ルナ返答表示 | 改行が保持される | displayChatScene() の段落処理 |
| 「了解」クリック | ホームに戻る | goToScene('home') 動作確認 |
| プロフィール未設定→ルナと話す | エラーメッセージ | エラーハンドリング |
| Firebase 接続失敗 | 「データベース接続失敗」メッセージ | showErrorMessage() 動作 |
| Dify タイムアウト | 「タイムアウト」メッセージ | AbortController 動作 |
| API キー無効 | デモ返答が表示 | generateDemoLunaResponse() |

## エラーハンドリング検証

### ケース 1: Firebase プロフィール未設定
```
displayChatWithLuna() → firebaseAPI.loadProfile() → null
→ showErrorMessage('プロフィール情報が見つかりません。もう一度インタビューを開始してください。', callback)
→ goToScene('home')
```

### ケース 2: Dify API キー無効（401）
```
difyAPI.sendLunaInitialMessage() → response.status = 401
→ throw DifyAPIError
→ catch: throw new Error('Dify API: API キーが無効です')
→ displayChatWithLuna() catch
→ showErrorMessage('ルナとの接続に失敗しました。もう一度試してください。', callback)
→ goToScene('home')
```

### ケース 3: Dify タイムアウト（30秒以上）
```
difyAPI.sendLunaInitialMessage() → AbortController timeout
→ controller.abort()
→ catch: error.name === 'AbortError'
→ throw new Error('Dify API: タイムアウト（30秒以上応答がありません）')
→ displayChatWithLuna() catch
→ showErrorMessage(...)
```

## 動作確認チェックリスト

### UI レベル
- [ ] ホーム画面から「ルナと話す」カード表示
- [ ] クリック時に loading シーン表示
- [ ] 3秒内に chat シーン遷移
- [ ] ルナの返答が改行付きで表示
- [ ] 「了解」「もっと話す」ボタン表示
- [ ] 「了解」クリック時にホーム戻る
- [ ] 「もっと話す」クリック時にホーム戻る（メッセージ表示）

### API レベル
- [ ] Firebase loadProfile() が正常動作
- [ ] Firebase getLatestWeeklyCheckin() が正常動作（初回時 null OK）
- [ ] lunaContextGenerator が JSON 生成
- [ ] difyAPI.sendLunaInitialMessage() が返答取得
- [ ] レスポンス抽出（getAnswer()）が正常動作

### エラーレベル
- [ ] プロフィール未設定エラー処理
- [ ] Firebase 接続エラー処理
- [ ] Dify API キー無効エラー処理
- [ ] Dify タイムアウトエラー処理
- [ ] ネットワークエラー処理

## デプロイ前チェック

- [ ] Dify API キー設定済みか確認
- [ ] Firebase 設定済みか確認
- [ ] コンソールエラーなし
- [ ] リンク切れなし（404）
- [ ] localStorage キー名: vitalia_user_id / firebase_user_id / dify_api_key
- [ ] すべてのメソッドがグローバルインスタンスから呼び出し可能

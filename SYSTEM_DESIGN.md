# ヴィタリア リメイク 技術仕様書

## システム概要

**ルナ（Luna）** — 小児がん経験者に寄り添うAIコンパニオン  
**目標** — 習慣の継続（日次チェックイン + 週次GROWセッション）  
**プラットフォーム** — 単一HTML（Vanilla JS） + Gemini API  
**データ保存** — localStorage（無サーバー）

---

## 状態管理（ステートマシン）

### 状態の種類

```javascript
const STATES = {
  // 初期
  INIT: 'init',
  WELCOME: 'welcome',
  
  // 日次
  DAILY_GREETING: 'daily_greeting',
  DAILY_MOOD: 'daily_mood',
  DAILY_BEHAVIORS: 'daily_behaviors',
  DAILY_COMMENT: 'daily_comment',
  DAILY_DONE: 'daily_done',
  
  // 進捗ビュー
  DASHBOARD: 'dashboard',
  CALENDAR: 'calendar',
  
  // 週次インタビュー
  INTERVIEW_START: 'interview_start',
  INTERVIEW_Q1: 'interview_q1',           // 困り事 あり/なし
  INTERVIEW_Q2_1: 'interview_q2_1',       // 困り事 具体例
  INTERVIEW_Q2_2: 'interview_q2_2',       // 相談相手
  INTERVIEW_Q2_3: 'interview_q2_3',       // 受けたサポート
  INTERVIEW_Q2_4: 'interview_q2_4',       // あればよかったサポート
  INTERVIEW_Q2_5: 'interview_q2_5',       // 解決方法
  INTERVIEW_Q2_6: 'interview_q2_6',       // 成否判定
  INTERVIEW_Q2_7: 'interview_q2_7',       // 成功/失敗詳細
  
  INTERVIEW_Q3: 'interview_q3',           // 不安・心配 あり/なし
  INTERVIEW_Q4_1: 'interview_q4_1',       // 不安・心配 具体例
  // ... Q4系統省略
  
  INTERVIEW_Q5: 'interview_q5',           // 小児がんについて（3問）
  INTERVIEW_Q6: 'interview_q6',           // 晩期合併症について（3問）
  INTERVIEW_Q7_1: 'interview_q7_1',       // 健康管理方法
  INTERVIEW_Q7_2: 'interview_q7_2',       // 意識的な健康行動
  INTERVIEW_Q7_3: 'interview_q7_3',       // トランスセオ段階評価
  INTERVIEW_Q7_4: 'interview_q7_4',       // 健康行動の成否
  INTERVIEW_Q7_5: 'interview_q7_5',       // 変更対象選定
  
  GROW_GOAL: 'grow_goal',
  GROW_REALITY: 'grow_reality',
  GROW_OPTIONS: 'grow_options',
  GROW_WILL: 'grow_will',
  GROW_SUMMARY: 'grow_summary',
  
  INTERVIEW_DONE: 'interview_done',
}
```

### 状態遷移ロジック

```javascript
const TRANSITIONS = {
  // 初期化フロー
  [STATES.INIT]: {
    'loaded': STATES.WELCOME,
  },
  
  // 日次フロー
  [STATES.WELCOME]: {
    'start_daily': STATES.DAILY_GREETING,
    'view_calendar': STATES.CALENDAR,
    'start_interview': STATES.INTERVIEW_START,
  },
  
  [STATES.DAILY_GREETING]: {
    'proceed': STATES.DAILY_MOOD,
  },
  
  [STATES.DAILY_MOOD]: {
    'good': STATES.DAILY_BEHAVIORS,
    'normal': STATES.DAILY_BEHAVIORS,
    'hard': STATES.DAILY_BEHAVIORS,
  },
  
  [STATES.DAILY_BEHAVIORS]: {
    'proceed': STATES.DAILY_COMMENT,
  },
  
  [STATES.DAILY_COMMENT]: {
    'proceed': STATES.DAILY_DONE,
  },
  
  [STATES.DAILY_DONE]: {
    'back_home': STATES.WELCOME,
  },
  
  // インタビューフロー（分岐あり）
  [STATES.INTERVIEW_Q1]: {
    'yes': STATES.INTERVIEW_Q2_1,
    'no': STATES.INTERVIEW_Q3,  // 困り事なしはスキップ
  },
  
  [STATES.INTERVIEW_Q2_6]: {
    'success': STATES.INTERVIEW_Q2_7,  // 成功分岐
    'failure': STATES.INTERVIEW_Q2_7,  // 失敗分岐
  },
  
  // GROWコーチング
  [STATES.INTERVIEW_Q7_5]: {
    'selected': STATES.GROW_GOAL,
  },
  
  [STATES.GROW_GOAL]: {
    'proceed': STATES.GROW_REALITY,
  },
  
  [STATES.GROW_REALITY]: {
    'proceed': STATES.GROW_OPTIONS,
  },
  
  [STATES.GROW_OPTIONS]: {
    'proceed': STATES.GROW_WILL,
  },
  
  [STATES.GROW_WILL]: {
    'proceed': STATES.GROW_SUMMARY,
  },
  
  [STATES.GROW_SUMMARY]: {
    'complete': STATES.INTERVIEW_DONE,
  },
  
  [STATES.INTERVIEW_DONE]: {
    'back_home': STATES.WELCOME,
  },
}
```

---

## データ構造

### localStorage キー一覧

```javascript
STORAGE_KEYS = {
  USER: 'vitalia_user',
  DAILY_LOGS: 'vitalia_daily_logs',
  WEEKLY_SESSIONS: 'vitalia_weekly_sessions',
  STREAKS: 'vitalia_streaks',
  STAMPS: 'vitalia_stamps',
}
```

### user オブジェクト

```json
{
  "id": "uuid",
  "name": "ユーザー名（未設定の場合は空）",
  "createdAt": "2026-06-27T00:00:00Z",
  "lastDailyDate": "2026-06-27"
}
```

### dailyLogs 配列

```json
[
  {
    "date": "2026-06-27",
    "mood": "good",  // "good" | "normal" | "hard"
    "behaviors": {
      "exercise": true,
      "food": true,
      "sleep": false,
      "stress": true
    },
    "lunaComment": "今日も頑張ったね！",
    "timestamp": "2026-06-27T14:30:00Z"
  }
]
```

### weeklySessions 配列

```json
[
  {
    "week": "2026-W26",
    "date": "2026-06-22",
    "interview": {
      "q1_troubles": "yes",
      "q2_1_detail": "睡眠が不規則",
      "q2_2_support_available": "yes",
      "q2_3_received": ["情緒的サポート", "情報的サポート"],
      "q2_4_wanted": ["手段的サポート"],
      // ... 他の質問の回答
    },
    "grow": {
      "selected_behavior": "睡眠",
      "goal": "毎晩11時までに寝る",
      "reality": "現在は1時頃に寝ている",
      "options": ["スマホを見ない時間を作る", "瞑想を試す"],
      "will": "明日から10時半にスマホを置く",
      "will_date": "2026-06-28"
    },
    "timestamp": "2026-06-27T10:00:00Z"
  }
]
```

### streaks オブジェクト

```json
{
  "current": 5,
  "best": 12,
  "lastDate": "2026-06-27",
  "history": [
    { "date": "2026-06-27", "completed": true },
    { "date": "2026-06-26", "completed": true },
    { "date": "2026-06-25", "completed": false }
  ]
}
```

### stamps 配列

```json
[
  "first_checkin",           // 初回チェックイン
  "7days_streak",            // 7日連続
  "14days_streak",           // 14日連続
  "interview_first",         // 初回インタビュー
  "grow_first",              // 初回GROWセッション
  "100days_total"            // 累計100日
]
```

---

## UI 画面一覧

### 1. ウェルカム画面（WELCOME）
- ルナのアバター表示
- 本日のルナの一言（Gemini生成 or 固定文）
- ボタン3つ：
  - 「今日のチェックイン」
  - 「進捗を見る」
  - 「深く話す（週次セッション）」

### 2. 日次チェックイン画面群

#### 2-1. 挨拶画面（DAILY_GREETING）
- ルナのアバター
- 「こんにちは！今日も一緒に頑張ろう」
- [進める]ボタン

#### 2-2. 体調確認（DAILY_MOOD）
- 質問：「今日の体調はどうですか？」
- ボタン3つ：【良い】【普通】【つらい】

#### 2-3. 健康行動チェック（DAILY_BEHAVIORS）
- チェックボックス4つ：
  - ☐ 運動できた
  - ☐ 食事バランス良かった
  - ☐ 睡眠とれた
  - ☐ ストレス管理できた
- [記録する]ボタン

#### 2-4. ルナのコメント（DAILY_COMMENT）
- ルナの返答（Gemini API から取得）
- [ホームに戻る]ボタン

### 3. ダッシュボード画面（DASHBOARD）
- ストリークカレンダー（当月・先月の部分表示）
- 今週のサマリー（ルナのコメント）
- スタンプ一覧（獲得済みを表示）

### 4. インタビューフロー画面群

各質問ごとに画面を分ける（状態管理をシンプルにするため）

#### Q1. 困り事確認
- 質問：「今、何か困っていますか？」
- ボタン2つ：【あり】【なし】

#### Q2-1. 困り事の詳細
- 質問：「何が困っていますか？具体的に教えてください」
- テキストエリア自由記述

#### Q2-2 〜 Q2-7. 以下同様

#### GROW画面群

各ステップ（Goal/Reality/Options/Will）ごとに画面を分ける

---

## Gemini API 連携

### 呼び出しポイント

1. **日次挨拶**
   - タイミング：ユーザーが「今日のチェックイン」をタップ
   - 入力：ユーザーID、本日の日時
   - 出力：ルナの挨拶メッセージ
   - プロンプト例：
     ```
     あなたはルナ、小児がん経験者をサポートするAIコンパニオント。
     今日のユーザーを励ましく、一緒に頑張ろう！という気持ちを込めた
     1～2文の短い挨拶を生成してください。
     ```

2. **日次チェックイン後の共感コメント**
   - タイミング：ユーザーが健康行動チェックを完了
   - 入力：today's mood, behaviors completed
   - 出力：共感と励ましのコメント（1～2文）
   - プロンプト例：
     ```
     ユーザーの本日の体調: {mood}
     実施した健康行動: {behaviors}
     
     ルナになりきって、このユーザーを温かく励ましてください。
     1～2文で十分です。
     ```

3. **インタビュー回答への共感**（オプション）
   - タイミング：自由記述の回答入力後
   - 入力：ユーザーのテキスト回答
   - 出力：「そうなんですね」という共感コメント
   - 使用：ユーザーが「ルナの返答を聞く」をタップした時のみ

### エラーハンドリング

```javascript
async function getLunaComment(context) {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: context.prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        }
      }),
      params: {
        key: GEMINI_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    // フォールバック：デフォルトメッセージ
    console.error('Gemini API error:', error);
    return DEFAULT_FALLBACK_COMMENT[Math.floor(Math.random() * DEFAULT_FALLBACK_COMMENT.length)];
  }
}
```

---

## スタンプシステム

### 取得条件

| スタンプ | 条件 |
|---|---|
| `first_checkin` | 初回チェックイン完了 |
| `7days_streak` | 連続7日チェックイン |
| `14days_streak` | 連続14日チェックイン |
| `28days_streak` | 連続28日チェックイン |
| `interview_first` | 初回インタビュー完了 |
| `grow_first` | 初回GROWセッション完了 |
| `all_behaviors` | 4つの健康行動すべて実施（1日） |
| `100days_total` | 累計100日のチェックイン |

### UI表示

スタンプは獲得順にバッジとして表示（ダッシュボード画面）

---

## ローカルストレージの初期化

```javascript
function initializeData() {
  const user = {
    id: generateUUID(),
    name: '',
    createdAt: new Date().toISOString(),
    lastDailyDate: null,
  };
  
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.WEEKLY_SESSIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify({
    current: 0,
    best: 0,
    lastDate: null,
    history: [],
  }));
  localStorage.setItem(STORAGE_KEYS.STAMPS, JSON.stringify([]));
}
```

---

## パフォーマンス考慮

- **Gemini APIのキャッシング**：同じプロンプトを複数回呼ぶ場合、結果をメモリにキャッシュ
- **localStorage のサイズ**：毎日のログが増え続けるので、古いデータは定期的にアーカイブ（実装v2以降）
- **UI描画**：状態が変わるたびに必要な部分だけ再描画（全体再描画は避ける）


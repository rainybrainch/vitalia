// Dify API連携
class DifyAPI {
  constructor() {
    // 実装時に設定されます
    // - DIFY_API_KEY
    // - DIFY_WORKFLOW_ID または DIFY_CHAT_ID
    // - DIFY_BASE_URL
    this.apiKey = localStorage.getItem('dify_api_key') || '';
    this.workflowId = localStorage.getItem('dify_workflow_id') || '';
    this.baseUrl = 'https://api.dify.ai/v1'; // または環境に応じて変更
    this.userSession = localStorage.getItem('dify_user_session') || null;
  }

  /**
   * Vitalia ナレッジベースを Dify で初期化
   * （プロフィール作成後、Dify に「このユーザーの情報はナレッジベースを参照してね」と指示）
   */
  async initializeUserInDify() {
    if (!this.apiKey) {
      console.warn('Dify API キーが設定されていません');
      return;
    }

    try {
      const userId = dataManager.userId;
      const knowledgePaths = dataManager.getKnowledgePaths();
      const context = dataManager.generateDifyContext();

      const payload = {
        user_id: userId,
        inputs: {
          knowledge_paths: JSON.stringify(knowledgePaths),
          user_context: context,
          system_instruction: this.generateSystemInstruction()
        }
      };

      const response = await fetch(`${this.baseUrl}/workflows/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dify ユーザー初期化完了:', data);
        return data;
      } else {
        console.error('Dify 初期化失敗:', response.statusText);
      }
    } catch (error) {
      console.error('Dify 初期化エラー:', error);
    }
  }

  /**
   * Dify のシステムインストラクション生成
   */
  generateSystemInstruction() {
    return `あなたはルナです。小児がん経験者のパーソナルコーチです。

【あなたの仕事】
1. ユーザーの Vitalia ナレッジベースを読む
2. ユーザーを理解する
3. パーソナルコーチとして対話する

【読むべきファイル】
- /users/{userId}/profile.json（基本情報）
- /users/{userId}/weekly/latest.json（最新の週次更新）
- /users/{userId}/summaries/latest.md（会話サマリー）
- /knowledge/medical/（医療参照用）

【ルール】
- ユーザーの個人ナレッジを勝手に書き換えない
- 情報は Vitalia が更新する
- あなたは読むだけ、助言するだけ
- 前回の会話を覚えて、継続的な支援をする`;
  }

  /**
   * Difyとの会話（チャット）
   * @param {String} message - ユーザーメッセージ
   */
  async chat(message) {
    if (!this.apiKey) {
      console.warn('Dify API キーが設定されていません');
      return;
    }

    try {
      const profile = gameState.userProfile;
      const summary = profileGenerator.generateSummary(profile);
      const systemPrompt = profileGenerator.generateDifySystemPrompt(profile, summary);

      const payload = {
        inputs: {
          query: message,
          profile_context: summary
        },
        response_mode: 'blocking',
        user: profile.id,
        conversation_id: this.userSession || ''
      };

      const response = await fetch(`${this.baseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();

        // セッション情報を保存
        if (data.conversation_id) {
          this.userSession = data.conversation_id;
          localStorage.setItem('dify_user_session', data.conversation_id);
        }

        return data.answer || '';
      } else {
        console.error('Difyチャット失敗:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Dify チャット エラー:', error);
      return null;
    }
  }

  /**
   * Dify へプロフィール送信
   * （completeInterview後に呼ばれる）
   */
  async sendProfile(profile) {
    // APIキーがない場合はデモモード
    if (!this.apiKey) {
      console.log('Dify デモモード: プロフィール送信スキップ');
      return;
    }

    try {
      await this.initializeUserInDify();
    } catch (error) {
      console.error('Dify プロフィール送信エラー:', error);
      // エラーはログするが、ゲーム進行は継続する
    }
  }

  /**
   * API キーを設定（初期化）
   */
  setApiKey(apiKey, workflowId) {
    this.apiKey = apiKey;
    this.workflowId = workflowId;
    localStorage.setItem('dify_api_key', apiKey);
    localStorage.setItem('dify_workflow_id', workflowId);
  }

  /**
   * デモモード：ローカルレスポンス
   */
  getDemoResponse(profile) {
    const healthTarget = profile.health.change_target;
    const responses = {
      '運動': `そうですね。${profile.basic.age}歳で${healthTarget}を始めたいというのは素敵な目標ですね。一緒に無理のないペースで進めていきましょう。`,
      '食事': `食事の改善ですね。${healthTarget}は健康の基本です。あなたのペースに合わせてサポートします。`,
      '睡眠': `睡眠は回復に大切ですね。${healthTarget}の改善で、より良い毎日が過ごせると思います。`,
      'ストレス管理': `ストレスとの付き合い方は大切ですね。一緒に考えていきましょう。`,
      'その他': `ご指摘ありがとうございます。あなたの目標に合わせてサポートします。`
    };

    return responses[healthTarget] || responses['その他'];
  }
}

// グローバルインスタンス
const difyAPI = new DifyAPI();

// 注：実装時には、管理者が以下を設定する必要があります：
// difyAPI.setApiKey('your-api-key', 'your-workflow-id');

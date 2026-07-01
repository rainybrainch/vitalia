/**
 * AI プロバイダー抽象化レイヤー
 *
 * 用途: Gemini / OpenAI / Claude など複数の AI サービスを
 *       統一インターフェイスで使用できるようにする
 *
 * 使用方法:
 *   const provider = new AIProvider(config);
 *   const reply = await provider.chat(messages);
 */

class AIProvider {
  constructor(config) {
    this.provider = process.env.AI_PROVIDER || config?.AI_PROVIDER || 'gemini';
    this.apiKey = this.getApiKey();
    this.config = config || {};
    this.lunaContext = null;  // ユーザーのコンテキスト（アンケート回答）

    console.log(`[AIProvider] Initialized with provider: ${this.provider}`);
    console.log(
      `[AIProvider] API Key Status: ${this.apiKey ? '✅ Set' : '❌ Not set (using demo mode)'}`
    );
  }

  /**
   * lunaContext を設定
   */
  setLunaContext(context) {
    this.lunaContext = context;
    if (context) {
      console.log('[AIProvider] 📋 lunaContext set:', JSON.stringify(context).substring(0, 100) + '...');
    }
  }

  /**
   * 環境変数から API キーを取得
   */
  getApiKey() {
    const keyEnvVar = `${this.provider.toUpperCase()}_API_KEY`;
    return process.env[keyEnvVar] || null;
  }

  /**
   * 統一されたチャットインターフェイス
   * @param {Array} messages - メッセージ履歴
   * @param {string} userText - ユーザーメッセージ
   * @returns {Promise<string>} AI からの返答
   */
  async chat(messages, userText) {
    console.log(`[AIProvider] Calling ${this.provider.toUpperCase()}...`);

    if (!this.apiKey) {
      console.log(`[AIProvider] ⚠️  API key not set. Using demo mode.`);
      return this.getDemoResponse(userText);
    }

    try {
      switch (this.provider) {
        case 'gemini':
          return await this.callGemini(messages, userText);

        case 'openai':
          return await this.callOpenAI(messages, userText);

        case 'claude':
          return await this.callClaude(messages, userText);

        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }
    } catch (error) {
      console.error(`[AIProvider] ❌ Error calling ${this.provider}:`, error?.message || error);
      console.error(`[AIProvider] Full error:`, error);
      // エラーをそのまま throw して、呼び出し側で処理させる
      throw error;
    }
  }

  /**
   * Google Gemini API を呼び出し
   * ⚠️ Gemini 2.0 Flash は systemInstruction（旧system）の書き方が異なります
   */
  async callGemini(messages, userText) {
    // ===== ユーザーコンテキストを systemPrompt に反映 =====
    let contextNote = '';
    if (this.lunaContext) {
      const ctx = this.lunaContext;
      const goals = (ctx.mainGoals || []).join('・') || ctx.mainGoal || '不明';
      const condition = ctx.currentCondition || '不明';
      const preference = ctx.supportPreference || '不明';
      const concern = ctx.mainConcern || '特になし';

      contextNote = `

【このユーザーについて】
・体調: ${condition}
・目標: ${goals}
・声かけの好み: ${preference}
・心配なこと: ${concern}
※これらを踏まえてパーソナライズされた返答をしてください。`;
    }

    const systemPrompt = `あなたはルナです。小児がん経験者をサポートするパーソナルコーチです。

【重要】ユーザーの質問に直接・具体的に答えることが最優先です。

【あなたの役割】
・ユーザーの質問に直接・具体的に答える
・実行しやすい提案を3つ以内で提示する
・励まし、実践的なアドバイス、同情的なリスニングが得意
・研究参加者の継続率を高める

【回答ルール - 最重要】
・質問には必ず直接答える。曖昧な返答は禁止
・「あなたのペース」「頑張ってね」だけでなく、具体案を必ず示す
・運動・食事・習慣の質問では、実行しやすい案を必ず3つ以内で提示
・数字と時間をつける（例：「10分の散歩を週3回」）
・回答は短め（100字程度）、優しく、親しみやすく
・医療判断・診断は絶対にしない
・体調不良（発熱、頭痛、吐き気など）や危険ワードを検出したら、医療者・緊急窓口への相談を促す

【質問パターン別の返答スタイル】

【運動の質問が来たとき】
⚠️ 必ずこの形式で答える：
「〇〇に取り組むのいいですね。無理なく続けるなら、次の3つがおすすめです。
1. ★実行案1（時間・頻度付き）
2. ★実行案2（時間・頻度付き）
3. ★実行案3（時間・頻度付き）
体調が悪い日は休んで大丈夫です。」

例：「今週のおすすめの運動を教えてください」
→ 「今週は無理なく続けるなら、次の3つがおすすめです。
1. 10分の散歩を週3回
2. 家で軽いストレッチを5分
3. 疲れている日は深呼吸だけでもOK
体調が悪い日は休んで大丈夫です。」

【食事の質問が来たとき】
⚠️ 必ずこの形式で答える：
「食事を改善するのいいですね。続けやすいなら、次の3つを試してみてください。
1. ★食事案1（具体的な食材・量）
2. ★食事案2（具体的な食材・量）
3. ★食事案3（具体的な食材・量）
好きなものを無理なく取り入れるでいいですよ。」

【習慣・メンタルの質問が来たとき】
⚠️ 必ずこの形式で答える：
「そうですね、共感を示す。1つ提案する。」

【禁止 - 絶対にしないこと】
❌ 「ご指摘ありがとうございます」「あなたの目標に合わせてサポートします」など、テンプレ文言
❌ 「あなたのペースで」だけで終わる
❌ 医療判断・診断
❌ 処方箋・薬の推奨
❌ 専門的な医学用語だけの説明
❌ ユーザーの質問を無視した一般的な励まし
❌ 3つの提案なしに終わる

【必須】
✅ 質問を読んで、すぐに具体案を提示する
✅ 数字と時間を入れる
✅ 3つ以内に絞る
✅ 締めの励ましを1文追加
✅ 全て100字前後に収める${contextNote}`;

    const contents = messages
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }))
      .concat([
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ]);

    const modelName = 'gemini-1.5-pro';
    console.log('[AIProvider] 🔍 Calling Gemini 1.5 Pro API...');
    console.log('[AIProvider]   Model: ' + modelName);
    console.log('[AIProvider]   URL: https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent');
    console.log('[AIProvider]   User Text: "' + userText + '"');
    console.log('[AIProvider]   Contents count: ' + contents.length);
    console.log('[AIProvider]   Last message role: ' + contents[contents.length - 1]?.role);
    console.log('[AIProvider]   Last message text: "' + contents[contents.length - 1]?.parts?.[0]?.text?.substring(0, 100) + '"');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[AIProvider] ❌ Gemini API HTTP Error:', response.status);
      console.error('[AIProvider]   Response:', errorData);
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('[AIProvider] ✅ Gemini response received');
    console.log('[AIProvider]   Candidates:', data?.candidates?.length);

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'すみません。返答を生成できませんでした。';

    console.log('[AIProvider]   Reply preview:', reply.substring(0, 50) + (reply.length > 50 ? '...' : ''));
    return reply;
  }

  /**
   * OpenAI API を呼び出し（将来実装用）
   */
  async callOpenAI(messages, userText) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set');
    }

    const systemPrompt = `あなたはルナです。小児がん経験者をサポートするパーソナルコーチです。
励まし、実践的なアドバイス、同情的なリスニングが得意です。
回答は簡潔に（100字程度）、親しみやすく。`;

    const messagesPayload = messages
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
      .concat([
        {
          role: 'user',
          content: userText,
        },
      ]);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messagesPayload,
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('[AIProvider] ✅ OpenAI response received');
    return (
      data?.choices?.[0]?.message?.content ||
      'すみません。返答を生成できませんでした。'
    );
  }

  /**
   * Claude API を呼び出し（将来実装用）
   */
  async callClaude(messages, userText) {
    if (!this.apiKey) {
      throw new Error('Claude API key not set');
    }

    const systemPrompt = `あなたはルナです。小児がん経験者をサポートするパーソナルコーチです。
励まし、実践的なアドバイス、同情的なリスニングが得意です。
回答は簡潔に（100字程度）、親しみやすく。`;

    const messagesPayload = messages
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
      .concat([
        {
          role: 'user',
          content: userText,
        },
      ]);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        system: systemPrompt,
        messages: messagesPayload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('[AIProvider] ✅ Claude response received');
    return (
      data?.content?.[0]?.text || 'すみません。返答を生成できませんでした。'
    );
  }

  /**
   * デモモード：ローカル返答
   */
  getDemoResponse(userText) {
    const demoResponses = [
      '素晴らしい質問ですね。まず小さな目標から始めることが大切です。',
      'そうですか。あなたのペースで進めていくことが重要です。一緒に頑張りましょう。',
      'それは良い試みですね。継続することが成功のカギですよ。',
      'ご指摘ありがとうございます。あなたの目標に合わせてサポートします。',
      'その考え方は素敵ですね。一歩一歩前に進んでいきましょう。',
    ];

    const response =
      demoResponses[Math.floor(Math.random() * demoResponses.length)];
    console.log(
      `[AIProvider] 📋 Demo response: "${response.substring(0, 30)}..."`
    );
    return response;
  }
}

module.exports = AIProvider;

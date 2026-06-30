// グローバル状態管理
class GameState {
  constructor() {
    this.currentScene = 'title';
    this.userProfile = this.loadProfile();
    this.gameProgress = this.loadProgress();
    this.interviewData = {};
    this.weeklyData = {};
    this.currentStep = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // 規約への同意チェックボックス
    const agreeCheckbox = document.getElementById('agree-terms');
    const proceedButton = document.getElementById('btn-proceed');

    if (agreeCheckbox) {
      agreeCheckbox.addEventListener('change', () => {
        proceedButton.disabled = !agreeCheckbox.checked;
        proceedButton.style.opacity = agreeCheckbox.checked ? '1' : '0.5';
        proceedButton.style.cursor = agreeCheckbox.checked ? 'pointer' : 'not-allowed';
      });
    }
  }

  goToScene(sceneName) {
    // 現在のシーンを非表示
    document.getElementById(`scene-${this.currentScene}`).classList.remove('active');

    // 新しいシーンを表示
    this.currentScene = sceneName;
    const newScene = document.getElementById(`scene-${sceneName}`);
    if (newScene) {
      newScene.classList.add('active');
    }

    // シーン別の初期化
    this.initializeScene(sceneName);
  }

  initializeScene(sceneName) {
    switch (sceneName) {
      case 'interview':
        this.initializeInterview();
        break;
      case 'weekly-interview':
        this.initializeWeeklyInterview();
        break;
      case 'loading':
        this.startLoadingAnimation();
        break;
      case 'game-start':
        this.displayGameStartMessage();
        break;
      case 'home':
        this.displayHome();
        break;
      case 'daily-check':
        this.displayDailyCheck();
        break;
      case 'profile':
        this.displayProfile();
        break;
      case 'health':
        this.displayHealth();
        break;
      case 'chat':
        this.displayChatScene();
        break;
    }
  }

  initializeInterview() {
    this.currentStep = 0;
    this.interviewData = {};
    this.showInterviewQuestion();
  }

  showInterviewQuestion() {
    const questions = questionnaire.getQuestions();
    if (this.currentStep >= questions.length) {
      // インタビュー完了
      this.completeInterview();
      return;
    }

    const question = questions[this.currentStep];
    const content = document.getElementById('interview-content');

    // プログレスバー更新
    const progress = ((this.currentStep + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-text').textContent = `${this.currentStep + 1} / ${questions.length}`;

    // 質問表示
    let html = `
      <div class="luna-head" style="background: linear-gradient(135deg, #a99bc8 0%, #8B7BA8 100%);">
        <div class="luna-icon">${lunaExpressions.getCurrentExpression(question)}</div>
      </div>
      <div class="luna-dialog">
        <p>${question.text}</p>
      </div>
    `;

    if (question.type === 'choice') {
      html += '<div class="button-group">';
      question.options.forEach((option, idx) => {
        html += `<button class="btn btn-choice" onclick="gameState.selectOption(${idx}, ${this.currentStep})">○ ${option}</button>`;
      });
      html += '</div>';
    } else if (question.type === 'text') {
      html += `
        <input type="text" class="input-field" id="interview-input" placeholder="ここに入力してください" />
        <div class="button-group">
          <button class="btn btn-primary" onclick="gameState.submitTextAnswer()">次へ ▶</button>
        </div>
      `;
    }

    content.innerHTML = html;

    // テキスト入力の場合、フォーカス
    if (question.type === 'text') {
      setTimeout(() => document.getElementById('interview-input').focus(), 100);
    }
  }

  selectOption(optionIndex, stepIndex) {
    const questions = questionnaire.getQuestions();
    const question = questions[stepIndex];
    const answer = question.options[optionIndex];

    this.interviewData[question.id] = answer;

    // 次のステップへ
    this.currentStep++;
    this.showInterviewQuestion();
  }

  submitTextAnswer() {
    const input = document.getElementById('interview-input');
    const questions = questionnaire.getQuestions();
    const question = questions[this.currentStep];

    if (!input.value.trim()) {
      alert('入力してください');
      return;
    }

    this.interviewData[question.id] = input.value;

    // 次のステップへ
    this.currentStep++;
    this.showInterviewQuestion();
  }

  async completeInterview() {
    // プロフィール生成
    this.userProfile = profileGenerator.generateProfile(this.interviewData);

    // ① ローカル保存（バックアップ）
    localStorage.setItem('_pending_profile', JSON.stringify(this.userProfile));

    // ローディング画面へ遷移（UI更新）
    this.goToScene('loading');

    try {
      // ② Firebase保存
      await firebaseAPI.saveProfile(this.userProfile);

      // ③ 成功時のみ削除
      localStorage.removeItem('_pending_profile');

      // Vitalia ナレッジベースに保存
      dataManager.setProfile(this.userProfile);
      dataManager.updateChatSummary();

      // ローディングアニメーション開始（Firebase保存後）
      setTimeout(() => {
        this.startLoadingAnimation();
      }, 300);

    } catch (error) {
      // ④ 失敗時は localStorage に残す
      console.error('Interview completion error:', error);
      // ローディング画面から戻る
      this.showErrorMessage(
        `${firebaseAPI.getErrorMessage(error)}`,
        () => {
          // 再試行コールバック
          this.retryCompleteInterview();
        }
      );
    }
  }

  async retryCompleteInterview() {
    try {
      // localStorageから復帰
      const pendingProfile = localStorage.getItem('_pending_profile');
      if (pendingProfile) {
        this.userProfile = JSON.parse(pendingProfile);
      } else {
        this.showErrorMessage('保存データが見つかりません。もう一度インタビューを開始してください。', null);
        return;
      }

      // ローディング画面へ
      this.goToScene('loading');

      // Firebase再保存
      await firebaseAPI.saveProfile(this.userProfile);

      // 成功時のみ削除
      localStorage.removeItem('_pending_profile');

      // Vitalia ナレッジベースに保存
      dataManager.setProfile(this.userProfile);
      dataManager.updateChatSummary();

      // ローディングアニメーション開始（Firebase保存後）
      setTimeout(() => {
        this.startLoadingAnimation();
      }, 300);

    } catch (error) {
      console.error('Retry error:', error);
      this.showErrorMessage(
        `${firebaseAPI.getErrorMessage(error)}`,
        () => {
          this.retryCompleteInterview();
        }
      );
    }
  }

  showErrorMessage(message, retryCallback) {
    // モーダルまたはシーン内でエラー表示
    const errorContainer = document.getElementById('error-modal');

    if (!errorContainer) {
      // エラーモーダルが存在しない場合、alarmを使用（フォールバック）
      alert(message);
      if (retryCallback) {
        retryCallback();
      }
      return;
    }

    // エラーモーダルを表示
    errorContainer.style.display = 'flex';
    document.getElementById('error-message').textContent = message;

    // 再試行ボタン
    const retryBtn = document.getElementById('error-retry-btn');
    if (retryBtn && retryCallback) {
      retryBtn.onclick = () => {
        errorContainer.style.display = 'none';
        retryCallback();
      };
    }
  }

  startLoadingAnimation() {
    const checkItems = ['check-1', 'check-2', 'check-3'];
    const progressElement = document.getElementById('loading-progress');
    let progress = 0;

    // ローディングプログレス
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 100) progress = 100;
      progressElement.style.width = progress + '%';
    }, 300);

    // チェックアイテム表示
    const showCheckDelay = 1500;
    checkItems.forEach((id, idx) => {
      setTimeout(() => {
        const element = document.getElementById(id);
        element.classList.add('done');
        element.querySelector('.check-icon').textContent = '✓';
      }, showCheckDelay + idx * 800);
    });

    // ゲーム開始シーンへ
    setTimeout(() => {
      clearInterval(progressInterval);
      progressElement.style.width = '100%';

      // Dify へ送信（非同期）
      difyAPI.sendProfile(this.userProfile);

      // ゲーム開始シーンへ
      this.goToScene('game-start');
    }, showCheckDelay + checkItems.length * 800 + 500);
  }

  displayGameStartMessage() {
    // プロフィール情報に基づくメッセージ
    const profile = this.userProfile;
    let message = `
      <p>ありがとう。</p>
      <p style="margin-top: 1rem;">あなたのことを理解できました。</p>
    `;

    if (profile.problem && profile.problem.has_problem) {
      message += `<p style="margin-top: 1rem;">${profile.problem.content}について少し不安があるんですね。</p>`;
    }

    if (profile.health && profile.health.change_target) {
      message += `<p style="margin-top: 1rem;">${profile.health.change_target}を変えたいんですね。素敵な目標です✨</p>`;
    }

    message += `<p style="margin-top: 1rem;">これからは、あなた専属のコーチとして、一緒に歩んでいきます。</p>
                <p style="margin-top: 1rem;">よろしくお願いします😊</p>`;

    document.getElementById('game-start-message').innerHTML = message;
  }

  displayHome() {
    const greeting = this.getTimeGreeting();
    document.getElementById('home-greeting').textContent = greeting;
  }

  getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'おはよう！';
    if (hour < 18) return 'こんにちは！';
    return 'こんばんは！';
  }

  displayDailyCheck() {
    const profile = this.userProfile;
    const healthTarget = profile.health && profile.health.change_target;

    const questionElement = document.getElementById('daily-check-question');
    questionElement.innerHTML = `<p>今日は${healthTarget}できそう？</p>`;

    const buttonsElement = document.getElementById('daily-check-buttons');
    buttonsElement.innerHTML = `
      <button class="btn btn-choice" onclick="gameState.answerDailyCheck('yes')">○ はい</button>
      <button class="btn btn-choice" onclick="gameState.answerDailyCheck('difficult')">○ 難しい</button>
      <button class="btn btn-choice" onclick="gameState.goToScene('home')" style="border-color: #ccc; color: #999;">○ ルナに相談する</button>
    `;
  }

  answerDailyCheck(answer) {
    const profile = this.userProfile;
    const exp = answer === 'yes' ? 10 : 5;

    profile.game_state = profile.game_state || { day: 1, level: 1, exp: 0 };
    profile.game_state.exp = (profile.game_state.exp || 0) + exp;

    // レベルアップチェック
    if (profile.game_state.exp >= 100) {
      profile.game_state.level++;
      profile.game_state.exp = 0;
      alert(`🎉 Lv${profile.game_state.level}にレベルアップ！`);
    }

    this.saveProfile(profile);
    this.goToScene('home');
  }

  displayProfile() {
    const profile = this.userProfile;
    const html = `
      <div style="background: #f5f3f8; padding: 1.5rem; border-radius: 10px; text-align: left;">
        <p><strong>年齢:</strong> ${profile.basic.age}歳</p>
        <p><strong>性別:</strong> ${profile.basic.gender}</p>
        <p><strong>治療終了:</strong> ${profile.basic.treatment_years}年</p>
        <p><strong>現在の状況:</strong> ${profile.basic.current_status}</p>
        ${profile.health && profile.health.change_target ? `<p><strong>変えたい行動:</strong> ${profile.health.change_target}</p>` : ''}
        ${profile.game_state ? `<p><strong>Level:</strong> ${profile.game_state.level} | <strong>経験値:</strong> ${profile.game_state.exp}/100</p>` : ''}
      </div>
    `;
    document.getElementById('profile-display').innerHTML = html;
  }

  displayHealth() {
    const profile = this.userProfile;
    const activities = profile.health && profile.health.activities ? profile.health.activities : [];

    let html = '<div style="text-align: left;">';
    if (activities.length > 0) {
      html += '<p><strong>取り組んでいる行動:</strong></p>';
      activities.forEach(activity => {
        html += `<p>✓ ${activity}</p>`;
      });
    } else {
      html += '<p>まだ行動が記録されていません。</p>';
    }
    html += '</div>';

    document.getElementById('health-display').innerHTML = html;
  }

  saveProfile(profile) {
    localStorage.setItem('userProfile', JSON.stringify(profile));
    this.userProfile = profile;
  }

  loadProfile() {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : null;
  }

  saveProgress(progress) {
    localStorage.setItem('gameProgress', JSON.stringify(progress));
    this.gameProgress = progress;
  }

  loadProgress() {
    const saved = localStorage.getItem('gameProgress');
    return saved ? JSON.parse(saved) : { day: 1, level: 1, exp: 0 };
  }

  loadGame() {
    if (this.userProfile) {
      this.goToScene('home');
    } else {
      this.goToScene('title');
    }
  }

  // ===== 週次インタビュー機能 =====

  /**
   * 週次アンケートを開始
   */
  openWeeklyQuestionnaire() {
    this.weeklyData = {};
    this.currentStep = 0;
    this.goToScene('weekly-interview');
  }

  /**
   * 週次インタビューを初期化
   */
  initializeWeeklyInterview() {
    this.currentStep = 0;
    this.weeklyData = {};
    this.showWeeklyQuestion();
  }

  /**
   * 週次質問を表示（1画面1質問）
   */
  showWeeklyQuestion() {
    const questions = weeklyQuestionnaire.getQuestions();
    if (this.currentStep >= questions.length) {
      // 週次インタビュー完了
      this.completeWeeklyInterview();
      return;
    }

    const question = questions[this.currentStep];
    const content = document.getElementById('weekly-interview-content');

    // プログレスバー更新
    const progress = ((this.currentStep + 1) / questions.length) * 100;
    document.getElementById('weekly-progress-fill').style.width = progress + '%';
    document.getElementById('weekly-progress-text').textContent = `${this.currentStep + 1} / ${questions.length}`;

    // 質問表示
    let html = `
      <div class="luna-head" style="background: linear-gradient(135deg, #a99bc8 0%, #8B7BA8 100%);">
        <div class="luna-icon">📊</div>
      </div>
      <div class="luna-dialog">
        <p>${question.text}</p>
      </div>
    `;

    if (question.type === 'choice') {
      html += '<div class="button-group">';
      question.options.forEach((option, idx) => {
        html += `<button class="btn btn-choice" onclick="gameState.selectWeeklyOption(${idx}, ${this.currentStep})">○ ${option}</button>`;
      });
      html += '</div>';
    } else if (question.type === 'text') {
      html += `
        <input type="text" class="input-field" id="weekly-input" placeholder="${question.placeholder || 'ここに入力してください'}" />
        <div class="button-group">
          <button class="btn btn-primary" onclick="gameState.submitWeeklyAnswer()">次へ ▶</button>
        </div>
      `;
    }

    content.innerHTML = html;

    // テキスト入力の場合、フォーカス
    if (question.type === 'text') {
      setTimeout(() => {
        const input = document.getElementById('weekly-input');
        if (input) input.focus();
      }, 100);
    }
  }

  /**
   * 週次選択肢を選択
   * @param {number} optionIndex - 選択肢のインデックス
   * @param {number} stepIndex - ステップインデックス
   */
  selectWeeklyOption(optionIndex, stepIndex) {
    const questions = weeklyQuestionnaire.getQuestions();
    const question = questions[stepIndex];
    const answer = question.options[optionIndex];

    this.weeklyData[question.id] = answer;

    // 次のステップへ
    this.currentStep++;
    this.showWeeklyQuestion();
  }

  /**
   * 週次テキスト回答を送信
   */
  submitWeeklyAnswer() {
    const input = document.getElementById('weekly-input');
    const questions = weeklyQuestionnaire.getQuestions();
    const question = questions[this.currentStep];

    // オプション（required: false）の場合は空白でも可
    if (question.required && !input.value.trim()) {
      alert('入力してください');
      return;
    }

    // 空白でなければ、または必須でなければ記録
    this.weeklyData[question.id] = input.value.trim() || null;

    // 次のステップへ
    this.currentStep++;
    this.showWeeklyQuestion();
  }

  /**
   * 週次インタビューを完了
   */
  async completeWeeklyInterview() {
    try {
      // ① weeklyCheckinJsonを生成
      const weeklyCheckinJson = weeklyProfileGenerator.generateWeeklyCheckin(
        this.weeklyData,
        this.userProfile
      );

      // ② localStorage に一時保存
      localStorage.setItem('_pending_weekly', JSON.stringify(weeklyCheckinJson));

      // ③ Firebase保存
      await firebaseAPI.saveWeeklyCheckin(weeklyCheckinJson);

      // ④ 成功時のみ削除
      localStorage.removeItem('_pending_weekly');

      // ⑤ ゲーム状態を更新（EXP加算）
      if (weeklyCheckinJson.gameStateUpdate) {
        if (!this.userProfile.game_state) {
          this.userProfile.game_state = { level: 1, exp: 0 };
        }
        this.userProfile.game_state.exp = (this.userProfile.game_state.exp || 0) + weeklyCheckinJson.gameStateUpdate.exp;

        // レベルアップチェック
        if (this.userProfile.game_state.exp >= 100) {
          this.userProfile.game_state.level++;
          this.userProfile.game_state.exp = 0;
        }

        this.saveProfile(this.userProfile);
      }

      // ⑥ ホームへ戻る
      this.goToScene('home');

    } catch (error) {
      console.error('Weekly interview completion error:', error);
      this.showErrorMessage(
        `${firebaseAPI.getErrorMessage(error)}`,
        () => {
          // 再試行コールバック
          this.retryCompleteWeeklyInterview();
        }
      );
    }
  }

  /**
   * 週次インタビューの再試行
   */
  async retryCompleteWeeklyInterview() {
    try {
      // localStorageから復帰
      const pendingWeekly = localStorage.getItem('_pending_weekly');
      if (!pendingWeekly) {
        this.showErrorMessage('保存データが見つかりません。ホームに戻ります。', null);
        this.goToScene('home');
        return;
      }

      const weeklyCheckinJson = JSON.parse(pendingWeekly);

      // Firebase再保存
      await firebaseAPI.saveWeeklyCheckin(weeklyCheckinJson);

      // 成功時のみ削除
      localStorage.removeItem('_pending_weekly');

      // ゲーム状態を更新
      if (weeklyCheckinJson.gameStateUpdate) {
        if (!this.userProfile.game_state) {
          this.userProfile.game_state = { level: 1, exp: 0 };
        }
        this.userProfile.game_state.exp = (this.userProfile.game_state.exp || 0) + weeklyCheckinJson.gameStateUpdate.exp;

        if (this.userProfile.game_state.exp >= 100) {
          this.userProfile.game_state.level++;
          this.userProfile.game_state.exp = 0;
        }

        this.saveProfile(this.userProfile);
      }

      // ホームへ戻る
      this.goToScene('home');

    } catch (error) {
      console.error('Retry error:', error);
      this.showErrorMessage(
        `${firebaseAPI.getErrorMessage(error)}`,
        () => {
          this.retryCompleteWeeklyInterview();
        }
      );
    }
  }

  // ===== ルナAIコーチングチャット機能 =====

  /**
   * ルナAIのチャット画面を表示
   * 初回プロフィールと最新の週次チェックインを取得し、ルナコンテキストを生成
   * Dify経由でルナの初期返答を取得し、チャット画面に表示
   */
  async displayChatWithLuna() {
    try {
      // ローディング画面への遷移（UI更新）
      this.goToScene('loading');

      // ① 初回プロフィールを Firebase から取得
      const profileJson = await firebaseAPI.loadProfile();
      if (!profileJson) {
        this.showErrorMessage('プロフィール情報が見つかりません。もう一度インタビューを開始してください。',
          () => this.goToScene('home'));
        return;
      }

      // ② 最新の週次チェックインを Firebase から取得（オプション）
      let latestWeeklyCheckinJson = null;
      try {
        latestWeeklyCheckinJson = await firebaseAPI.getLatestWeeklyCheckin();
      } catch (error) {
        console.warn('Latest weekly checkin not found (first time):', error);
        // 初回時は週次データがないため、エラーとせず続行
      }

      // ③ ルナコンテキストを生成
      const lunaContextJson = lunaContextGenerator.generateLunaContext(profileJson, latestWeeklyCheckinJson);

      // ④ ローカルメモリに保持
      this.lunaContext = lunaContextJson;

      console.log('Luna context generated:', lunaContextJson);

      // ⑤ Dify に ルナコンテキストを送信して初期返答を取得
      const userId = profileJson.id || 'anonymous';
      const lunaResponse = await difyAPI.sendLunaInitialMessage(userId, lunaContextJson);

      // ⑥ ルナの返答をメモリに保存
      this.lunaResponse = lunaResponse;

      console.log('Luna response from Dify:', lunaResponse);

      // ⑦ チャットシーンへ遷移（返答を表示）
      this.goToScene('chat');

    } catch (error) {
      console.error('Error displaying chat with Luna:', error);
      this.showErrorMessage(
        'ルナとの接続に失敗しました。もう一度試してください。',
        () => {
          // ホームに戻る
          this.goToScene('home');
        }
      );
    }
  }

  /**
   * チャットシーンの初期化
   * ルナの返答を画面に表示
   */
  displayChatScene() {
    const container = document.getElementById('luna-response-container');

    if (!this.lunaResponse) {
      container.innerHTML = `
        <div class="luna-dialog">
          <p>申し訳ありません。ルナの返答が取得できませんでした。</p>
          <p style="margin-top: 1rem;">もう一度ホームからお試しください。</p>
        </div>
      `;
      return;
    }

    // ルナの返答を複数行で表示（改行を保持）
    // 段落で分割して見やすく表示
    const paragraphs = this.lunaResponse
      .split('\n\n')
      .filter(para => para.trim());

    const responseHtml = paragraphs
      .map(para => {
        const lines = para
          .split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .join('<br/>');
        return `<p>${lines}</p>`;
      })
      .join('');

    container.innerHTML = `
      <div class="luna-dialog">
        ${responseHtml}
      </div>
    `;
  }

  /**
   * ルナへの返答を処理
   * @param {string} action - 'understood' または 'more'
   */
  respondToLuna(action) {
    if (action === 'understood') {
      // 「了解」ボタン → ホームに戻る
      this.goToScene('home');
    } else if (action === 'more') {
      // 「もっと話す」ボタン → 今後の多回会話実装予定
      alert('ありがとうございます。複数回の会話機能は近日実装予定です。\nまずは本日のルナからの声かけを受け止めてくださいね。');
      this.goToScene('home');
    }
  }
}

// グローバルインスタンス
const gameState = new GameState();

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  gameState.goToScene('title');
});

// Vitalia データ管理層
// 個人ナレッジデータベース（Single Source of Truth）
// フォルダ構造：/users/{userId}/{profile.json, weekly/*, diary/*, summaries/*, vectors/*}
class DataManager {
  constructor() {
    // ユーザーID生成（初回のみ）
    this.userId = this.loadUserId() || this.generateUserId();
    this.saveUserId(this.userId);

    // ナレッジベース
    this.knowledge = {
      // ① 基本プロフィール（初回アンケート）
      profile: this.loadProfile(),

      // ② 週次アップデート（毎週のアンケート）
      weekly: this.loadWeekly(),

      // ③ 日記（ユーザー記入）
      diary: this.loadDiary(),

      // ④ 要約・チャットメモ（システムが生成）
      summaries: this.loadSummaries(),

      // ⑤ 行動記録（日次チェック）
      behavior_log: this.loadBehaviorLog(),

      // ⑥ 医療ナレッジ（参照用 PDF/テキスト）
      medical_knowledge: this.loadMedicalKnowledge()
    };
  }

  /**
   * ユーザーID生成
   */
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 基本プロフィールを設定（初回アンケート時）
   */
  setProfile(profile) {
    this.knowledge.profile = {
      id: this.userId,
      ...profile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.saveProfile();
    return this.knowledge.profile;
  }

  /**
   * 毎週アンケート結果を追加
   */
  addWeeklyUpdate(updateData) {
    if (!Array.isArray(this.knowledge.weekly)) {
      this.knowledge.weekly = [];
    }

    const weekNumber = this.knowledge.weekly.length + 1;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const update = {
      week: weekNumber,
      date: date,
      data: updateData
    };

    this.knowledge.weekly.push(update);
    this.saveWeekly();

    // 自動で要約を生成・更新
    this.updateChatSummary();

    return update;
  }

  /**
   * 日記を追加
   */
  addDiaryEntry(content) {
    if (!Array.isArray(this.knowledge.diary)) {
      this.knowledge.diary = [];
    }

    const date = new Date().toISOString().split('T')[0];
    const entry = {
      date: date,
      timestamp: new Date().toISOString(),
      content: content
    };

    this.knowledge.diary.push(entry);
    this.saveDiary();

    return entry;
  }

  /**
   * チャットサマリーを更新（システムが自動生成）
   */
  updateChatSummary() {
    const profile = this.knowledge.profile;
    const latestWeekly = this.getLatestWeekly();
    const recentDiary = this.knowledge.diary ? this.knowledge.diary.slice(-2) : [];

    let summary = `# ユーザーサマリー\n\n`;
    summary += `## 基本情報\n`;
    summary += `- ユーザーID: ${this.userId}\n`;
    summary += `- 年齢: ${profile?.basic?.age || '未記入'}歳\n`;
    summary += `- 治療終了: ${profile?.basic?.treatment_years || '未記入'}年\n`;
    summary += `- 目標: ${profile?.health?.change_target || '未設定'}\n\n`;

    if (latestWeekly) {
      summary += `## 最新の更新 (Week ${latestWeekly.week})\n`;
      summary += `- 日時: ${latestWeekly.date}\n`;
      if (latestWeekly.data) {
        Object.entries(latestWeekly.data).forEach(([key, value]) => {
          summary += `- ${key}: ${value}\n`;
        });
      }
      summary += '\n';
    }

    if (recentDiary.length > 0) {
      summary += `## 最近の日記\n`;
      recentDiary.forEach(entry => {
        summary += `- ${entry.date}: ${entry.content.substring(0, 50)}...\n`;
      });
    }

    if (!this.knowledge.summaries) {
      this.knowledge.summaries = {};
    }
    this.knowledge.summaries.latest = summary;
    this.saveSummaries();

    return summary;
  }

  /**
   * 行動記録を追加（日次チェック）
   */
  recordBehavior(day, behavior, success, notes = '') {
    if (!Array.isArray(this.knowledge.behavior_log)) {
      this.knowledge.behavior_log = [];
    }

    const date = new Date().toISOString().split('T')[0];
    const record = {
      date: date,
      day: day,
      behavior: behavior,
      success: success,
      notes: notes,
      exp_earned: success ? 10 : 3
    };

    this.knowledge.behavior_log.push(record);
    this.saveBehaviorLog();

    return record;
  }

  /**
   * 最新の週次アップデートを取得
   */
  getLatestWeekly() {
    const weekly = this.knowledge.weekly;
    if (!Array.isArray(weekly) || weekly.length === 0) {
      return null;
    }
    return weekly[weekly.length - 1];
  }

  /**
   * Dify が読むべきナレッジパスを取得
   * （Dify はこのパスのファイルを読む）
   */
  getKnowledgePaths() {
    return {
      profile: `/users/${this.userId}/profile.json`,
      weekly: `/users/${this.userId}/weekly/latest.json`,
      summaries: `/users/${this.userId}/summaries/latest.md`,
      medical: `/knowledge/medical/` // 共有医療ナレッジ
    };
  }

  /**
   * Dify へ送信するナレッジコンテキスト
   */
  generateDifyContext() {
    const profile = this.knowledge.profile;
    const latestWeekly = this.getLatestWeekly();

    let context = `## ユーザープロフィール\n\n`;
    context += `- ユーザーID: ${this.userId}\n`;
    context += `- 年齢: ${profile?.basic?.age || '未記入'}歳\n`;
    context += `- 治療終了: ${profile?.basic?.treatment_years || '未記入'}年\n`;
    context += `- 現在の状況: ${profile?.basic?.current_status || '未記入'}\n`;
    context += `- 変えたい行動: ${profile?.health?.change_target || '未設定'}\n`;
    context += `- 目標: ${profile?.grow?.goal || '未設定'}\n\n`;

    if (latestWeekly) {
      context += `## 最新の更新 (Week ${latestWeekly.week})\n\n`;
      context += `更新日: ${latestWeekly.date}\n\n`;
      if (typeof latestWeekly.data === 'object') {
        Object.entries(latestWeekly.data).forEach(([key, value]) => {
          context += `- ${key}: ${value}\n`;
        });
      }
      context += '\n';
    }

    // チャットサマリーを含める
    if (this.knowledge.summaries?.latest) {
      context += `## 会話サマリー\n\n`;
      context += this.knowledge.summaries.latest;
    }

    return context;
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    const behaviorLog = this.data.behavior_log || [];
    const totalDays = behaviorLog.length;
    const successDays = behaviorLog.filter(log => log.success).length;
    const successRate = totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0;

    const weeklyUpdates = this.data.weekly_updates || [];
    const week = Math.ceil((totalDays + 1) / 7);

    return {
      total_days: totalDays,
      success_days: successDays,
      success_rate: successRate,
      current_week: week,
      total_weeks: weeklyUpdates.length + 1,
      conversation_notes_count: (this.data.conversation_notes || []).length
    };
  }

  /**
   * 全データをエクスポート（バックアップ）
   */
  exportData() {
    return {
      exported_at: new Date().toISOString(),
      data: this.data
    };
  }

  /**
   * 全データをインポート（リストア）
   */
  importData(importedData) {
    if (importedData.data) {
      this.data = importedData.data;
      this.saveAll();
      return true;
    }
    return false;
  }

  // ============ Storage 関連 ============

  saveUserId() {
    localStorage.setItem('vitalia_user_id', this.userId);
  }

  loadUserId() {
    return localStorage.getItem('vitalia_user_id');
  }

  saveProfile() {
    localStorage.setItem(`vitalia_profile_${this.userId}`, JSON.stringify(this.knowledge.profile));
  }

  loadProfile() {
    const saved = localStorage.getItem(`vitalia_profile_${this.userId}`);
    return saved ? JSON.parse(saved) : null;
  }

  saveWeekly() {
    localStorage.setItem(`vitalia_weekly_${this.userId}`, JSON.stringify(this.knowledge.weekly));
  }

  loadWeekly() {
    const saved = localStorage.getItem(`vitalia_weekly_${this.userId}`);
    return saved ? JSON.parse(saved) : [];
  }

  saveDiary() {
    localStorage.setItem(`vitalia_diary_${this.userId}`, JSON.stringify(this.knowledge.diary));
  }

  loadDiary() {
    const saved = localStorage.getItem(`vitalia_diary_${this.userId}`);
    return saved ? JSON.parse(saved) : [];
  }

  saveSummaries() {
    localStorage.setItem(`vitalia_summaries_${this.userId}`, JSON.stringify(this.knowledge.summaries));
  }

  loadSummaries() {
    const saved = localStorage.getItem(`vitalia_summaries_${this.userId}`);
    return saved ? JSON.parse(saved) : {};
  }

  saveBehaviorLog() {
    localStorage.setItem(`vitalia_behavior_log_${this.userId}`, JSON.stringify(this.knowledge.behavior_log));
  }

  loadBehaviorLog() {
    const saved = localStorage.getItem(`vitalia_behavior_log_${this.userId}`);
    return saved ? JSON.parse(saved) : [];
  }

  loadMedicalKnowledge() {
    // 医療ナレッジは静的またはサーバーから読み込む
    // 今後実装
    return {};
  }

  saveAll() {
    this.saveUserId();
    this.saveProfile();
    this.saveWeekly();
    this.saveDiary();
    this.saveSummaries();
    this.saveBehaviorLog();
  }
}

// グローバルインスタンス
const dataManager = new DataManager();

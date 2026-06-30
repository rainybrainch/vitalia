// 週次プロフィール生成クラス
class WeeklyProfileGenerator {
  constructor() {}

  /**
   * weekIdを生成（YYYY-MM-DD形式の週開始日=月曜日）
   * @param {Date} date - 計算基準日（デフォルト: 今日）
   * @returns {string} YYYY-MM-DD形式のweekId
   */
  getWeekId(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    // 月曜日=1, 日曜日=0とする
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * 週番号を計算（その年の第何週か）
   * @param {string} weekId - YYYY-MM-DD形式のweekId
   * @returns {number} 週番号
   */
  getWeekNumber(weekId) {
    const date = new Date(weekId + 'T00:00:00Z');
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * 週次チェックインJSONを生成
   * @param {Object} answers - アンケート回答オブジェクト
   * @param {Object} userProfile - ユーザープロフィール（オプション）
   * @returns {Object} weeklyCheckinJson
   */
  generateWeeklyCheckin(answers, userProfile = null) {
    const now = new Date();
    const weekId = this.getWeekId(now);
    const weekNumber = this.getWeekNumber(weekId);

    // gameStateUpdate の計算
    const gameStateUpdate = this.calculateGameStateUpdate(answers, userProfile);

    return {
      // メタデータ
      weekId: weekId,
      date: now.toISOString(),
      weekNumber: weekNumber,

      // 回答データ
      questions: {
        health_status: answers.health_status || null,
        exercise_frequency: answers.exercise_frequency || null,
        meal_awareness: answers.meal_awareness || null,
        sleep_quality: answers.sleep_quality || null,
        trouble_or_anxiety: answers.trouble_or_anxiety || null,
        goal_achievement: answers.goal_achievement || null,
        next_focus: answers.next_focus || null,
        message_to_luna: answers.message_to_luna || null
      },

      // ゲーム状態の更新
      gameStateUpdate: gameStateUpdate
    };
  }

  /**
   * ゲーム状態の更新を計算
   * @param {Object} answers - アンケート回答
   * @param {Object} userProfile - ユーザープロフィール
   * @returns {Object} gameStateUpdate
   */
  calculateGameStateUpdate(answers, userProfile = null) {
    // 初期値
    let exp = 0;
    let streakDays = 1;

    // 回答に応じたEXP付与ロジック
    if (answers.health_status) {
      exp += answers.health_status === '良好' ? 10 : answers.health_status === 'まあまあ' ? 5 : 2;
    }

    if (answers.exercise_frequency) {
      const exerciseExp = {
        '毎日': 10,
        '週3-4回': 8,
        '週1-2回': 5,
        'できなかった': 0
      };
      exp += exerciseExp[answers.exercise_frequency] || 0;
    }

    if (answers.meal_awareness) {
      const mealExp = {
        '規則正しく': 8,
        '栄養バランス': 8,
        '量を調整': 5,
        '特に意識しなかった': 0
      };
      exp += mealExp[answers.meal_awareness] || 0;
    }

    if (answers.sleep_quality) {
      const sleepExp = {
        '十分': 10,
        'まあまあ': 5,
        '不足気味': 2,
        'かなり不足': 0
      };
      exp += sleepExp[answers.sleep_quality] || 0;
    }

    if (answers.goal_achievement) {
      const achievementExp = {
        'できた': 15,
        '部分的にできた': 8,
        'できなかった': 0
      };
      exp += achievementExp[answers.goal_achievement] || 0;
    }

    // テキスト回答があると加点
    if (answers.trouble_or_anxiety && answers.trouble_or_anxiety.trim()) {
      exp += 5; // 困ったことを記録しただけで加点（前向きな振り返り）
    }
    if (answers.next_focus && answers.next_focus.trim()) {
      exp += 10; // 来週の目標を立てると加点（意欲的）
    }
    if (answers.message_to_luna && answers.message_to_luna.trim()) {
      exp += 3; // ルナへのメッセージで加点（コミュニケーション）
    }

    return {
      level: (userProfile && userProfile.game_state && userProfile.game_state.level) || 1,
      exp: exp,
      streak_days: streakDays
    };
  }
}

// グローバルインスタンス
const weeklyProfileGenerator = new WeeklyProfileGenerator();

// ゲームループ・日次チェック管理
class GameLoop {
  constructor() {
    this.dailyLog = [];
    this.loadDailyLog();
  }

  /**
   * 日次チェックイン：「できた」を記録
   */
  recordDailySuccess(day) {
    const profile = gameState.userProfile;
    if (!profile.game_state) {
      profile.game_state = { day: 1, level: 1, exp: 0 };
    }

    const log = {
      day: day,
      date: new Date().toISOString(),
      success: true,
      exp_earned: 10
    };

    profile.game_state.exp += 10;
    this.checkLevelUp(profile);

    this.dailyLog.push(log);
    this.saveDailyLog();
    gameState.saveProfile(profile);

    return {
      expEarned: 10,
      leveledUp: false,
      newLevel: profile.game_state.level
    };
  }

  /**
   * 日次チェックイン：「難しい」を記録
   */
  recordDailyDifficult(day) {
    const profile = gameState.userProfile;
    if (!profile.game_state) {
      profile.game_state = { day: 1, level: 1, exp: 0 };
    }

    const log = {
      day: day,
      date: new Date().toISOString(),
      success: false,
      exp_earned: 3
    };

    profile.game_state.exp += 3;
    this.checkLevelUp(profile);

    this.dailyLog.push(log);
    this.saveDailyLog();
    gameState.saveProfile(profile);

    return {
      expEarned: 3,
      leveledUp: false,
      newLevel: profile.game_state.level
    };
  }

  /**
   * レベルアップチェック
   */
  checkLevelUp(profile) {
    const EXP_TO_LEVEL_UP = 100;

    if (profile.game_state.exp >= EXP_TO_LEVEL_UP) {
      profile.game_state.level++;
      profile.game_state.exp = profile.game_state.exp - EXP_TO_LEVEL_UP;
      return true;
    }
    return false;
  }

  /**
   * 連続成功日数を取得
   */
  getConsecutiveSuccessCount() {
    let count = 0;
    const sortedLog = this.dailyLog.sort((a, b) => b.day - a.day);

    for (let i = 0; i < sortedLog.length; i++) {
      if (sortedLog[i].success) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * 成功率を取得
   */
  getSuccessRate() {
    if (this.dailyLog.length === 0) return 0;

    const successCount = this.dailyLog.filter(log => log.success).length;
    return Math.round((successCount / this.dailyLog.length) * 100);
  }

  /**
   * 日次ログを保存
   */
  saveDailyLog() {
    localStorage.setItem('dailyLog', JSON.stringify(this.dailyLog));
  }

  /**
   * 日次ログを読み込み
   */
  loadDailyLog() {
    const saved = localStorage.getItem('dailyLog');
    this.dailyLog = saved ? JSON.parse(saved) : [];
  }

  /**
   * ゲーム統計を取得
   */
  getStats() {
    const profile = gameState.userProfile;
    return {
      level: profile.game_state.level,
      exp: profile.game_state.exp,
      expToLevelUp: 100 - (profile.game_state.exp % 100),
      totalDays: this.dailyLog.length,
      successCount: this.dailyLog.filter(log => log.success).length,
      successRate: this.getSuccessRate(),
      consecutiveSuccess: this.getConsecutiveSuccessCount()
    };
  }

  /**
   * 新しい会話を解放（レベルに応じて）
   */
  unlockNewConversations(level) {
    const unlocks = {
      1: [],
      2: ['共感のコーチング'],
      3: ['GROW モデルの深化'],
      4: ['ストレス管理'],
      5: ['習慣形成'],
      6: ['社会復帰支援'],
      7: ['キャリア相談'],
      8: ['人間関係'],
      9: ['自己肯定感'],
      10: ['人生設計']
    };

    return unlocks[level] || [];
  }

  /**
   * 報酬を取得（ランダム）
   */
  getRandomReward() {
    const rewards = [
      '「頑張ってますね！」',
      '「その調子です！」',
      '「素晴らしい！」',
      '「いいペースですね！」',
      '「続けてください！」'
    ];

    return rewards[Math.floor(Math.random() * rewards.length)];
  }
}

// グローバルインスタンス
const gameLoop = new GameLoop();

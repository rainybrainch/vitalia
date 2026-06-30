// 週次アンケート定義クラス
class WeeklyQuestionnaire {
  constructor() {
    this.questions = this.getQuestions();
  }

  /**
   * 週次アンケートの8問を定義
   * @returns {Array<Object>} 質問配列
   */
  getQuestions() {
    return [
      {
        id: 'health_status',
        type: 'choice',
        text: '今週の体調はどうでしたか？',
        options: ['良好', 'まあまあ', '疲れている', '不調']
      },
      {
        id: 'exercise_frequency',
        type: 'choice',
        text: '今週、運動はどれくらいできましたか？',
        options: ['毎日', '週3-4回', '週1-2回', 'できなかった']
      },
      {
        id: 'meal_awareness',
        type: 'choice',
        text: '今週、食事で意識できたことはありますか？',
        options: ['規則正しく', '栄養バランス', '量を調整', '特に意識しなかった']
      },
      {
        id: 'sleep_quality',
        type: 'choice',
        text: '今週、睡眠はどうでしたか？',
        options: ['十分', 'まあまあ', '不足気味', 'かなり不足']
      },
      {
        id: 'trouble_or_anxiety',
        type: 'text',
        text: '今週、困ったことや不安はありましたか？',
        placeholder: 'ここに入力してください（オプション）',
        required: false
      },
      {
        id: 'goal_achievement',
        type: 'choice',
        text: '初回または前回決めた一歩はできましたか？',
        options: ['できた', '部分的にできた', 'できなかった']
      },
      {
        id: 'next_focus',
        type: 'text',
        text: '来週、1つだけ意識したいことは何ですか？',
        placeholder: 'ここに入力してください',
        required: true
      },
      {
        id: 'message_to_luna',
        type: 'text',
        text: 'ルナに伝えたいことはありますか？',
        placeholder: 'ここに入力してください（オプション）',
        required: false
      }
    ];
  }

  /**
   * 指定インデックスの質問を取得
   * @param {number} index - 質問のインデックス
   * @returns {Object} 質問オブジェクト
   */
  getQuestion(index) {
    return this.questions[index];
  }

  /**
   * 全質問数を取得
   * @returns {number} 質問数
   */
  getTotalQuestions() {
    return this.questions.length;
  }
}

// グローバルインスタンス
const weeklyQuestionnaire = new WeeklyQuestionnaire();

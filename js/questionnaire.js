// インタビュー問題定義
class Questionnaire {
  constructor() {
    this.questions = [
      // Step 1: 基本情報 - 年齢
      {
        id: 'basic_age',
        step: 0,
        type: 'text',
        text: 'あなたの年齢を教えてください',
        category: 'basic'
      },
      // Step 2: 基本情報 - 性別
      {
        id: 'basic_gender',
        step: 1,
        type: 'choice',
        text: '性別を教えてください',
        options: ['男性', '女性', 'その他'],
        category: 'basic'
      },
      // Step 3: 基本情報 - 治療終了年
      {
        id: 'basic_treatment_years',
        step: 2,
        type: 'text',
        text: '治療が終了してから何年たっていますか？',
        category: 'basic'
      },
      // Step 4: 基本情報 - 現在の状況
      {
        id: 'basic_current_status',
        step: 3,
        type: 'choice',
        text: '現在の状況を教えてください',
        options: ['学生', '就職（会社員）', '自営業', '休職中', 'その他'],
        category: 'basic'
      },
      // Step 5: 困り事
      {
        id: 'problem_has',
        step: 4,
        type: 'choice',
        text: '今、困っていることはありますか？',
        options: ['ある', 'ない'],
        category: 'problem'
      },
      // Step 6: 困り事 - 内容（条件分岐：「ある」の場合のみ）
      {
        id: 'problem_content',
        step: 5,
        type: 'text',
        text: 'どんなことで困っていますか？',
        category: 'problem',
        condition: (data) => data.problem_has === 'ある'
      },
      // Step 7: 健康行動 - 変えたい行動
      {
        id: 'health_change_target',
        step: 6,
        type: 'choice',
        text: 'これから一番変えたい行動は何ですか？',
        options: ['運動', '食事', '睡眠', 'ストレス管理', 'その他'],
        category: 'health'
      },
      // Step 8: GROW
      {
        id: 'grow_goal',
        step: 7,
        type: 'text',
        text: 'あなてのゴールは何ですか？（例：週3回、30分歩く）',
        category: 'grow'
      }
    ];
  }

  getQuestions() {
    // 条件分岐を考慮した問題リストを生成
    let filteredQuestions = [];
    const currentData = gameState.interviewData || {};

    this.questions.forEach(q => {
      // 条件チェック
      if (q.condition && !q.condition(currentData)) {
        return; // スキップ
      }
      filteredQuestions.push(q);
    });

    return filteredQuestions;
  }

  getQuestion(index) {
    const questions = this.getQuestions();
    return questions[index] || null;
  }

  getTotalQuestions() {
    return this.getQuestions().length;
  }
}

// グローバルインスタンス
const questionnaire = new Questionnaire();

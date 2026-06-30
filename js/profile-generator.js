// プロフィール生成・JSON生成・要約生成
class ProfileGenerator {
  generateProfile(interviewData) {
    // インタビューデータを構造化されたJSONスキーマに変換
    return {
      id: this.generateUserID(),
      created_at: new Date().toISOString(),

      basic: {
        age: interviewData.basic_age || '',
        gender: interviewData.basic_gender || '',
        treatment_years: interviewData.basic_treatment_years || '',
        current_status: interviewData.basic_current_status || ''
      },

      problem: {
        has_problem: interviewData.problem_has === 'ある',
        content: interviewData.problem_content || '',
        support_person: '',
        received_support: [],
        wanted_support: [],
        solution: '',
        result: '',
        reason: '',
        future_plan: ''
      },

      anxiety: {
        has_anxiety: false,
        content: '',
        support_person: '',
        received_support: [],
        wanted_support: [],
        solution: '',
        result: '',
        reason: '',
        future_plan: ''
      },

      health: {
        activities: [],
        stages: {},
        change_target: interviewData.health_change_target || ''
      },

      grow: {
        goal: interviewData.grow_goal || '',
        reality: '',
        options: '',
        will: ''
      },

      memo: '',

      game_state: {
        day: 1,
        level: 1,
        exp: 0
      }
    };
  }

  generateSummary(profile) {
    const lines = [
      '【ユーザー概要】'
    ];

    // 基本情報
    if (profile.basic.age) {
      lines.push(`・${profile.basic.age}歳`);
    }
    if (profile.basic.gender) {
      lines.push(`・${profile.basic.gender}`);
    }
    if (profile.basic.treatment_years) {
      lines.push(`・治療終了${profile.basic.treatment_years}年`);
    }
    if (profile.basic.current_status) {
      lines.push(`・現在${profile.basic.current_status}`);
    }

    // 困り事
    if (profile.problem.has_problem && profile.problem.content) {
      lines.push(`・困り事：${profile.problem.content}`);
    }

    // 不安
    if (profile.anxiety.has_anxiety && profile.anxiety.content) {
      lines.push(`・不安：${profile.anxiety.content}`);
    }

    // 健康行動
    if (profile.health.change_target) {
      lines.push(`・変えたい行動：${profile.health.change_target}`);
    }

    // GROW
    if (profile.grow.goal) {
      lines.push(`・ゴール：${profile.grow.goal}`);
    }

    return lines.join('\n');
  }

  generateDifySystemPrompt(profile, summary) {
    return `あなたはルナです。小児がん経験者をサポートするAIコンパニオンです。

【ユーザー情報】
${summary}

【詳細データ】
${JSON.stringify(profile, null, 2)}

【指示】
- 上記のユーザー情報を完全に理解した上で、パーソナルコーチとして会話してください
- 不足している情報だけ、追加で質問してください
- 一度に質問は一つだけです
- 共感・要約・コーチングを主に行ってください
- ユーザーの健康目標「${profile.health.change_target}」に寄り添ってください
- 小児がん経験者ならではの心理的背景を理解し、優しく支援してください`;
  }

  generateUserID() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  exportJSON(profile) {
    return JSON.stringify(profile, null, 2);
  }

  importJSON(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON解析エラー:', e);
      return null;
    }
  }
}

// グローバルインスタンス
const profileGenerator = new ProfileGenerator();

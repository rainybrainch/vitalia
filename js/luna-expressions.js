// ルナの表情パターン管理
class LunaExpressions {
  constructor() {
    this.expressions = {
      // デフォルト
      default: '😊',
      // 共感
      empathy: '😊',
      // 思考
      thinking: '🤔',
      // 褒める
      praise: '🎉',
      // アドバイス
      advice: '💡',
      // 分析
      analysis: '🧠',
      // 最終メッセージ
      final: '🌙'
    };

    this.expressionMap = {
      // 困り事に関する質問
      problem_has: 'empathy',
      problem_content: 'thinking',
      // 健康行動
      health_change_target: 'advice',
      // GROW
      grow_goal: 'advice'
    };
  }

  getCurrentExpression(question) {
    const expressionType = this.expressionMap[question.id] || 'default';
    return this.expressions[expressionType];
  }

  getExpressionByType(type) {
    return this.expressions[type] || this.expressions.default;
  }

  // ユーザーの回答に応じた表情
  getReactionExpression(answer) {
    if (answer === 'はい' || answer === 'yes') {
      return this.expressions.praise;
    }
    if (answer === 'いいえ' || answer === 'no') {
      return this.expressions.empathy;
    }
    return this.expressions.default;
  }
}

// グローバルインスタンス
const lunaExpressions = new LunaExpressions();

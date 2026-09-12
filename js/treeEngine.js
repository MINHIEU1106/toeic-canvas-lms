/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - KNOWLEDGE TREE GAMIFICATION ENGINE (treeEngine.js)
 * =========================================================================
 */

const TreeEngine = {
  /**
   * Tính toán EXP và Level của Cây dựa trên lịch sử submissions
   * QUY TẮC: CHỈ TÍNH ĐIỂM CỦA BÀI NỘP LẦN 1 (attemptNumber === 1)
   */
  calculateTreeProgress(submissions = []) {
    let totalXP = 0;
    const processedAssignments = new Set();

    submissions.forEach(sub => {
      // Chỉ lấy bài nộp lần 1 của từng đề
      if ((sub.attemptNumber === 1 || !sub.attemptNumber) && !processedAssignments.has(sub.assignmentId)) {
        processedAssignments.add(sub.assignmentId);
        
        const score = Number(sub.score) || 0;
        const total = Number(sub.totalQuestions) || 1;
        const accuracy = Number(sub.accuracyRate) || Math.round((score / total) * 100);

        // Mỗi câu đúng = +10 XP, Hoàn thành bài = +30 XP bonus
        let earned = (score * 10) + 30;
        if (accuracy === 100) earned += 50; // Bonus hoàn hảo 100%

        totalXP += earned;
      }
    });

    const stages = CONFIG.TREE_THEME.stages;
    let currentStage = stages[0];
    let nextStage = stages[1] || null;

    for (let i = stages.length - 1; i >= 0; i--) {
      if (totalXP >= stages[i].minXP) {
        currentStage = stages[i];
        nextStage = stages[i + 1] || null;
        break;
      }
    }

    let progressToNext = 100;
    if (nextStage) {
      const currentMin = currentStage.minXP;
      const nextMin = nextStage.minXP;
      const range = nextMin - currentMin;
      const currentInStage = totalXP - currentMin;
      progressToNext = Math.min(100, Math.max(0, Math.round((currentInStage / range) * 100)));
    }

    return {
      totalXP,
      currentLevel: currentStage.level,
      stageName: currentStage.name,
      stageIcon: currentStage.icon,
      description: currentStage.description,
      nextStage: nextStage ? nextStage.name : "Cấp Tối Thượng",
      nextMinXP: nextStage ? nextStage.minXP : totalXP,
      progressToNext,
      xpNeededForNext: nextStage ? (nextStage.minXP - totalXP) : 0
    };
  },

  /**
   * Render HTML cho widget Cây Tri Thức
   */
  renderTreeWidget(progress, options = { compact: false }) {
    if (options.compact) {
      return `
        <div class="tree-badge-pill" title="${progress.stageName} (${progress.totalXP} XP)">
          <span class="tree-icon-mini">${progress.stageIcon}</span>
          <span class="tree-level-text">Lv.${progress.currentLevel}</span>
          <span class="tree-xp-mini">${progress.totalXP} XP</span>
        </div>
      `;
    }

    return `
      <div class="knowledge-tree-card">
        <div class="tree-avatar-wrapper">
          <div class="tree-glow-bg"></div>
          <div class="tree-emoji-display">${progress.stageIcon}</div>
          <div class="tree-level-tag">Cấp ${progress.currentLevel}</div>
        </div>

        <div class="tree-info-block">
          <div class="tree-title">${progress.stageName}</div>
          <div class="tree-desc">${progress.description}</div>
          
          <div class="tree-exp-row">
            <span>Kinh nghiệm: <strong>${progress.totalXP} XP</strong></span>
            ${progress.nextStage !== "Cấp Tối Thượng" ? `
              <span>Cần thêm <strong>${progress.xpNeededForNext} XP</strong> lên ${progress.nextStage}</span>
            ` : `<span style="color: var(--accent-warning);">⭐ Đã đạt cấp tối đa!</span>`}
          </div>

          <div class="tree-progress-bar">
            <div class="tree-progress-fill" style="width: ${progress.progressToNext}%;"></div>
          </div>
        </div>
      </div>
    `;
  }
};

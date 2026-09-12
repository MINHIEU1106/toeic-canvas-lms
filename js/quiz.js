/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - GEMINI CANVAS CONTROLLER (quiz.js)
 * =========================================================================
 */

(function () {
  // State
  let assignmentData = null;
  let flattenedQuestions = [];
  let studentList = [];
  let currentStudent = null;
  let userAnswers = {}; // { questionId: 'A' | 'B' | 'C' | 'D' }
  let currentQuestionIndex = 0;

  // Audio Play Limiter State
  let audioPlayCounts = {}; // { audioUrl: count }

  // Timer
  let startTime = null;
  let timerInterval = null;
  let timeSpentSeconds = 0;

  // DOM Elements
  const htmlRoot = document.documentElement;
  const btnToggleTheme = document.getElementById("btn-toggle-theme");
  const loginSection = document.getElementById("login-section");
  const canvasSection = document.getElementById("canvas-section");
  const resultSection = document.getElementById("result-section");

  const assignmentTitleLogin = document.getElementById("assignment-title-login");
  const selectClass = document.getElementById("select-class");
  const selectStudent = document.getElementById("select-student");
  const customNameBox = document.getElementById("custom-name-box");
  const inputCustomName = document.getElementById("input-custom-name");
  const loginStatusBox = document.getElementById("login-status-box");
  const btnStartCanvas = document.getElementById("btn-start-canvas");

  // Canvas Header & Progress
  const canvasAssignmentTitle = document.getElementById("canvas-assignment-title");
  const btnShareCanvas = document.getElementById("btn-share-canvas");
  const btnCloseCanvas = document.getElementById("btn-close-canvas");
  const canvasProgressBar = document.getElementById("canvas-progress-bar");
  const canvasCounterText = document.getElementById("canvas-counter-text");
  const liveWrongBadge = document.getElementById("live-wrong-badge");
  const liveCorrectBadge = document.getElementById("live-correct-badge");

  // Canvas Audio & Passage
  const canvasAudioBox = document.getElementById("canvas-audio-box");
  const canvasAudioPlayer = document.getElementById("canvas-audio-player");
  const audioPlayCounterBadge = document.getElementById("audio-play-counter-badge");
  const canvasPassageBox = document.getElementById("canvas-passage-box");
  const canvasPassageTitle = document.getElementById("canvas-passage-title");
  const canvasPassageContent = document.getElementById("canvas-passage-content");

  // Canvas Question & Options
  const canvasQNumber = document.getElementById("canvas-q-number");
  const canvasQText = document.getElementById("canvas-q-text");
  const canvasOptionsList = document.getElementById("canvas-options-list");
  const canvasTimerText = document.getElementById("canvas-timer-text");
  const btnCanvasBack = document.getElementById("btn-canvas-back");
  const btnCanvasNext = document.getElementById("btn-canvas-next");

  // Result Elements
  const treeRewardContainer = document.getElementById("tree-reward-container");
  const resultScoreVal = document.getElementById("result-score-val");
  const resultAccuracyVal = document.getElementById("result-accuracy-val");
  const resultTimeVal = document.getElementById("result-time-val");
  const resultAttemptBadge = document.getElementById("result-attempt-badge");
  const retakeInfoText = document.getElementById("retake-info-text");
  const btnRetakeQuiz = document.getElementById("btn-retake-quiz");
  const reviewQuestionsContainer = document.getElementById("review-questions-container");

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    initTheme();

    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get("id") || "TOEIC_HW_01";

    btnToggleTheme.addEventListener("click", toggleTheme);
    btnShareCanvas.addEventListener("click", shareCanvasLink);
    btnCloseCanvas.addEventListener("click", closeCanvas);

    selectClass.addEventListener("change", handleClassChange);
    selectStudent.addEventListener("change", handleStudentChange);
    inputCustomName.addEventListener("input", handleCustomNameInput);
    btnStartCanvas.addEventListener("click", startCanvasQuiz);

    btnCanvasBack.addEventListener("click", () => navigateQuestion(-1));
    btnCanvasNext.addEventListener("click", handleNextOrSubmit);
    btnRetakeQuiz.addEventListener("click", retakeQuiz);

    // Audio Play Limit Listener
    canvasAudioPlayer.addEventListener("play", handleAudioPlay);

    // 1. Tải đề bài
    try {
      const res = await API.getAssignment(assignmentId);
      if (res.success && res.data) {
        assignmentData = res.data;
        assignmentTitleLogin.textContent = assignmentData.title || `Bài tập: ${assignmentId}`;
        canvasAssignmentTitle.textContent = assignmentData.title || `Bài tập: ${assignmentId}`;
        flattenQuestions(assignmentData);
      } else {
        assignmentTitleLogin.textContent = `Không tìm thấy bài tập (${assignmentId})`;
        alert("Không thể tải bài tập: " + (res.message || "Vui lòng kiểm tra lại link!"));
        return;
      }
    } catch (err) {
      assignmentTitleLogin.textContent = "Lỗi kết nối tải đề bài";
      console.error(err);
      return;
    }

    // 2. Tải danh sách học sinh
    try {
      const stuRes = await API.getStudents();
      studentList = stuRes.success && stuRes.data ? stuRes.data : CONFIG.MOCK_STUDENTS;
      populateClassDropdown();
    } catch (err) {
      studentList = CONFIG.MOCK_STUDENTS;
      populateClassDropdown();
    }
  }

  // =========================================================================
  // THEME MANAGEMENT
  // =========================================================================
  function initTheme() {
    const saved = localStorage.getItem("TOEIC_CANVAS_THEME") || "dark";
    htmlRoot.setAttribute("data-theme", saved);
    btnToggleTheme.textContent = saved === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    const current = htmlRoot.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    htmlRoot.setAttribute("data-theme", next);
    localStorage.setItem("TOEIC_CANVAS_THEME", next);
    btnToggleTheme.textContent = next === "dark" ? "☀️" : "🌙";
  }

  // =========================================================================
  // DATA PARSING & FLATTENING
  // =========================================================================
  function flattenQuestions(data) {
    flattenedQuestions = [];

    // Nhóm câu hỏi đơn lẻ (Reading Part 5 hoặc Listening ngắn)
    if (Array.isArray(data.questions)) {
      data.questions.forEach((q) => {
        flattenedQuestions.push({
          ...q,
          displayIndex: flattenedQuestions.length + 1,
          isListening: !!(data.audioUrl || q.audioUrl),
          audioUrl: q.audioUrl || data.audioUrl || "",
          passageContext: null
        });
      });
    }

    // Nhóm bài đọc (Part 6, 7) hoặc bài nghe hội thoại (Part 3, 4)
    if (Array.isArray(data.groups)) {
      data.groups.forEach(g => {
        const isGroupListening = !!(g.audioUrl || data.audioUrl);
        const groupAudio = g.audioUrl || data.audioUrl || "";

        const passageContext = {
          passageTitle: g.passageTitle || "",
          passageText: g.passageText || "",
          passageImage: g.passageImage || "",
          transcript: g.transcript || "",
          transcriptTranslation: g.transcriptTranslation || "",
          audioUrl: groupAudio,
          isListening: isGroupListening
        };

        if (Array.isArray(g.questions)) {
          g.questions.forEach(q => {
            flattenedQuestions.push({
              ...q,
              displayIndex: flattenedQuestions.length + 1,
              isListening: isGroupListening,
              audioUrl: groupAudio,
              passageContext: passageContext
            });
          });
        }
      });
    }
  }

  // =========================================================================
  // STUDENT IDENTITY FLOW
  // =========================================================================
  function populateClassDropdown() {
    const classes = [...new Set(studentList.map(s => s.class).filter(Boolean))].sort();
    selectClass.innerHTML = `<option value="">-- Chọn Lớp (Ví dụ: TOEIC_B_TB39, TOEIC_B_TB45) --</option>`;
    classes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `Lớp ${c}`;
      selectClass.appendChild(opt);
    });
  }

  function handleClassChange() {
    const selectedClass = selectClass.value;
    selectStudent.innerHTML = `<option value="">-- Chọn Họ và Tên của bạn --</option>`;
    loginStatusBox.style.display = "none";
    customNameBox.style.display = "none";
    btnStartCanvas.disabled = true;

    if (!selectedClass) {
      selectStudent.disabled = true;
      return;
    }

    const filtered = studentList.filter(s => s.class === selectedClass);
    filtered.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.studentId;
      opt.textContent = `${s.studentName} (${s.studentId})`;
      selectStudent.appendChild(opt);
    });

    // Thêm tùy chọn nhập tên tự do
    const otherOpt = document.createElement("option");
    otherOpt.value = "CUSTOM_NAME";
    otherOpt.textContent = "✍️ Nhập tên khác (Nếu không thấy tên bạn)...";
    selectStudent.appendChild(otherOpt);

    selectStudent.disabled = false;
  }

  async function handleStudentChange() {
    const studentId = selectStudent.value;
    if (!studentId) {
      btnStartCanvas.disabled = true;
      loginStatusBox.style.display = "none";
      customNameBox.style.display = "none";
      return;
    }

    if (studentId === "CUSTOM_NAME") {
      customNameBox.style.display = "block";
      inputCustomName.focus();
      btnStartCanvas.disabled = !inputCustomName.value.trim();
      currentStudent = {
        studentId: `${selectClass.value}_CUSTOM_${Date.now()}`,
        studentName: inputCustomName.value.trim(),
        class: selectClass.value
      };
      return;
    }

    customNameBox.style.display = "none";
    currentStudent = studentList.find(s => s.studentId === studentId) || { studentId, studentName: studentId, class: selectClass.value };

    // Kiểm tra số lần đã làm bài
    btnStartCanvas.disabled = true;
    loginStatusBox.style.display = "block";
    loginStatusBox.style.background = "rgba(59, 130, 246, 0.1)";
    loginStatusBox.style.border = "1px solid rgba(59, 130, 246, 0.3)";
    loginStatusBox.style.color = "#60a5fa";
    loginStatusBox.innerHTML = `⏳ Đang kiểm tra lịch sử làm bài...`;

    try {
      const statusRes = await API.checkSubmissionStatus(studentId, assignmentData.assignmentId);
      const subInfo = statusRes.data || { attemptCount: 0, canRetake: true };

      if (subInfo.attemptCount === 0) {
        loginStatusBox.style.background = "rgba(16, 185, 129, 0.1)";
        loginStatusBox.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        loginStatusBox.style.color = "var(--accent-success)";
        loginStatusBox.innerHTML = `🌱 Bạn chưa làm bài này. Điểm số lần 1 sẽ được cộng <strong>EXP nuôi Cây Tri Thức</strong>!`;
        btnStartCanvas.textContent = "🚀 Mở Canvas Làm Bài (Lần 1)";
        btnStartCanvas.disabled = false;
        btnStartCanvas.onclick = () => startCanvasQuiz();
      } else if (subInfo.attemptCount === 1) {
        const last = subInfo.lastSubmission;
        loginStatusBox.style.background = "rgba(245, 158, 11, 0.1)";
        loginStatusBox.style.border = "1px solid rgba(245, 158, 11, 0.3)";
        loginStatusBox.style.color = "var(--accent-warning)";
        loginStatusBox.innerHTML = `⚠️ Bạn đã nộp 1 lần (${last?.score}/${last?.totalQuestions}đ - ${last?.accuracyRate}%).<br>Bạn còn <strong>1 lượt làm lại</strong> để củng cố kiến thức.`;
        btnStartCanvas.textContent = "🔄 Làm lại bài (Lần 2)";
        btnStartCanvas.disabled = false;
        btnStartCanvas.onclick = () => startCanvasQuiz();
      } else {
        const last = subInfo.lastSubmission;
        loginStatusBox.style.background = "rgba(244, 63, 94, 0.1)";
        loginStatusBox.style.border = "1px solid rgba(244, 63, 94, 0.3)";
        loginStatusBox.style.color = "#fda4af";
        loginStatusBox.innerHTML = `🔒 Bạn đã hoàn thành tối đa <strong>2 lượt làm bài</strong>.<br>Điểm lần cuối: <strong>${last?.score}/${last?.totalQuestions}</strong>.`;
        btnStartCanvas.textContent = "👁️ Xem lại chi tiết bài làm";
        btnStartCanvas.disabled = false;
        btnStartCanvas.onclick = () => showPastResult(subInfo.lastSubmission);
      }
    } catch (e) {
      btnStartCanvas.disabled = false;
    }
  }

  function handleCustomNameInput() {
    const val = inputCustomName.value.trim();
    btnStartCanvas.disabled = val.length < 2;
    if (currentStudent) {
      currentStudent.studentName = val;
    }
  }

  // =========================================================================
  // CANVAS QUIZ EXECUTION
  // =========================================================================
  function startCanvasQuiz() {
    loginSection.style.display = "none";
    resultSection.style.display = "none";
    canvasSection.style.display = "block";

    currentQuestionIndex = 0;
    userAnswers = {};
    audioPlayCounts = {};

    startTime = new Date().toISOString();
    timeSpentSeconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeSpentSeconds++;
      canvasTimerText.textContent = `⏱️ ${formatTime(timeSpentSeconds)}`;
    }, 1000);

    renderCanvasQuestion();
  }

  /**
   * Render câu hỏi trên Canvas
   */
  function renderCanvasQuestion() {
    if (flattenedQuestions.length === 0) return;
    const q = flattenedQuestions[currentQuestionIndex];
    const total = flattenedQuestions.length;

    // 1. Cập nhật Progress Slider & Counter
    const progressPercent = ((currentQuestionIndex + 1) / total) * 100;
    canvasProgressBar.style.width = `${progressPercent}%`;
    canvasCounterText.textContent = `${currentQuestionIndex + 1} / ${total}`;

    // Live Badges (Trong lúc làm: hiển thị số câu đã làm)
    const answeredCount = Object.keys(userAnswers).length;
    liveCorrectBadge.textContent = `✓ ${answeredCount}`;
    liveWrongBadge.textContent = `... ${total - answeredCount}`;

    // 2. Xử lý Audio Player (Listening: max 2 lần nghe)
    if (q.audioUrl && q.audioUrl.trim() !== "") {
      canvasAudioBox.style.display = "flex";
      const currentAudio = q.audioUrl;
      const plays = audioPlayCounts[currentAudio] || 0;

      audioPlayCounterBadge.textContent = `🔊 Lần nghe: ${plays} / ${CONFIG.MAX_AUDIO_PLAYS}`;
      if (plays >= CONFIG.MAX_AUDIO_PLAYS) {
        audioPlayCounterBadge.classList.add("limit-reached");
        canvasAudioPlayer.controls = false;
        canvasAudioPlayer.src = "";
      } else {
        audioPlayCounterBadge.classList.remove("limit-reached");
        canvasAudioPlayer.controls = true;
        if (canvasAudioPlayer.src !== currentAudio) {
          canvasAudioPlayer.src = currentAudio;
        }
      }
    } else {
      canvasAudioBox.style.display = "none";
    }

    // 3. Xử lý Passage Box (Reading Part 6/7)
    if (q.passageContext && (q.passageContext.passageText || q.passageContext.passageImage)) {
      canvasPassageBox.style.display = "block";
      canvasPassageTitle.textContent = q.passageContext.passageTitle ? `📌 ${q.passageContext.passageTitle}` : "📌 ĐOẠN VĂN THAM KHẢO";
      let pContent = "";
      if (q.passageContext.passageImage) {
        pContent += `<img src="${q.passageContext.passageImage}" style="max-width:100%; border-radius:8px; margin-bottom:12px;" alt="Passage Image">\n`;
      }
      pContent += q.passageContext.passageText || "";
      canvasPassageContent.innerHTML = pContent;
    } else {
      canvasPassageBox.style.display = "none";
    }

    // 4. Render Question Title & Options
    canvasQNumber.textContent = `Question ${q.displayIndex}`;
    canvasQText.innerHTML = q.question;

    const selectedKey = userAnswers[q.id];
    let optionsHtml = "";
    q.options.forEach(opt => {
      const isSelected = selectedKey === opt.key;
      optionsHtml += `
        <div class="canvas-option-pill ${isSelected ? "selected" : ""}" onclick="selectCanvasAnswer(${q.id}, '${opt.key}')">
          <div class="canvas-option-header">
            <span class="canvas-option-label"><strong>${opt.key}.</strong> ${escapeHtml(opt.text)}</span>
            ${isSelected ? '<span class="badge badge-primary">Đã chọn</span>' : ''}
          </div>
        </div>
      `;
    });
    canvasOptionsList.innerHTML = optionsHtml;

    // 5. Điều hướng Reading vs Listening:
    // - Listening: KHÔNG cho quay lại (Back disabled/hidden)
    // - Reading: Cho phép quay lại xem/sửa (Back enabled nếu index > 0)
    if (q.isListening) {
      btnCanvasBack.style.display = "none";
    } else {
      btnCanvasBack.style.display = "inline-block";
      btnCanvasBack.disabled = currentQuestionIndex === 0;
    }

    // Nút Next ở câu cuối đổi thành Nộp bài
    if (currentQuestionIndex === total - 1) {
      btnCanvasNext.textContent = "Nộp bài & Hoàn tất ✅";
      btnCanvasNext.style.background = "linear-gradient(135deg, #10b981, #059669)";
    } else {
      btnCanvasNext.textContent = "Next ➡️";
      btnCanvasNext.style.background = "var(--accent-primary)";
    }
  }

  /**
   * Chọn đáp án
   */
  window.selectCanvasAnswer = function (questionId, key) {
    userAnswers[questionId] = key;
    renderCanvasQuestion();
  };

  /**
   * Xử lý giới hạn 2 lần nghe cho audio
   */
  function handleAudioPlay() {
    const q = flattenedQuestions[currentQuestionIndex];
    if (!q || !q.audioUrl) return;

    const currentAudio = q.audioUrl;
    audioPlayCounts[currentAudio] = (audioPlayCounts[currentAudio] || 0) + 1;
    const plays = audioPlayCounts[currentAudio];

    audioPlayCounterBadge.textContent = `🔊 Lần nghe: ${plays} / ${CONFIG.MAX_AUDIO_PLAYS}`;

    if (plays >= CONFIG.MAX_AUDIO_PLAYS) {
      audioPlayCounterBadge.classList.add("limit-reached");
      setTimeout(() => {
        canvasAudioPlayer.pause();
        canvasAudioPlayer.controls = false;
        alert("⚠️ Bạn đã đạt giới hạn 2 lần nghe tối đa cho đoạn audio này!");
      }, 500);
    }
  }

  /**
   * Điều hướng chuyển câu
   */
  function navigateQuestion(delta) {
    const newIdx = currentQuestionIndex + delta;
    if (newIdx >= 0 && newIdx < flattenedQuestions.length) {
      currentQuestionIndex = newIdx;
      renderCanvasQuestion();
    }
  }

  function handleNextOrSubmit() {
    const q = flattenedQuestions[currentQuestionIndex];
    if (!userAnswers[q.id]) {
      const proceed = confirm(`Bạn chưa chọn đáp án cho Question ${q.displayIndex}. Bạn có muốn tiếp tục không?`);
      if (!proceed) return;
    }

    if (currentQuestionIndex === flattenedQuestions.length - 1) {
      submitCanvasQuiz();
    } else {
      navigateQuestion(1);
    }
  }

  // =========================================================================
  // SUBMISSION & CONFETTI & TREE GAMIFICATION
  // =========================================================================
  async function submitCanvasQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    const endTime = new Date().toISOString();

    let score = 0;
    const answersDetail = [];
    const wrongQuestions = [];

    flattenedQuestions.forEach(q => {
      const chosen = userAnswers[q.id] || "";
      const isCorrect = String(chosen).trim().toUpperCase() === String(q.correct).trim().toUpperCase();

      if (isCorrect) score++;

      answersDetail.push({
        questionId: q.id,
        selected: chosen,
        correct: q.correct,
        isCorrect: isCorrect,
        category: q.category || "Ngữ pháp"
      });

      if (!isCorrect) {
        wrongQuestions.push({
          id: q.id,
          question: q.question,
          highlightedQuestion: q.highlightedQuestion || q.question,
          selected: chosen,
          correct: q.correct,
          category: q.category || "Ngữ pháp",
          explanation: q.explanation || "",
          translation: q.translation || ""
        });
      }
    });

    const total = flattenedQuestions.length;
    const accuracyRate = total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0;

    const payload = {
      studentId: currentStudent.studentId,
      studentName: currentStudent.studentName,
      studentClass: currentStudent.class,
      assignmentId: assignmentData.assignmentId,
      startTime: startTime,
      endTime: endTime,
      timeSpentSeconds: timeSpentSeconds,
      score: score,
      totalQuestions: total,
      accuracyRate: accuracyRate,
      answersDetail: answersDetail,
      wrongQuestions: wrongQuestions
    };

    // Gửi kết quả lên API
    try {
      const res = await API.submitAnswer(payload);
      const attemptNumber = res.success ? (res.data?.attemptNumber || 1) : 1;
      showResultScreen({ ...payload, attemptNumber });
    } catch (err) {
      console.error(err);
      showResultScreen({ ...payload, attemptNumber: 1 });
    }
  }

  /**
   * Hiển thị màn hình kết quả + Pháo hoa + Cây Tri Thức
   */
  function showResultScreen(result) {
    canvasSection.style.display = "none";
    resultSection.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Bắn pháo hoa Confetti
    triggerFireworks();

    resultScoreVal.textContent = `${result.score}/${result.totalQuestions}`;
    resultAccuracyVal.textContent = `${result.accuracyRate}%`;
    resultTimeVal.textContent = formatTime(result.timeSpentSeconds);

    const attempt = result.attemptNumber || 1;
    resultAttemptBadge.textContent = `LẦN NỘP THỨ ${attempt} / ${CONFIG.MAX_ATTEMPTS}`;

    if (attempt < CONFIG.MAX_ATTEMPTS) {
      retakeInfoText.innerHTML = `Bạn còn <strong>1 lượt làm lại</strong> để ghi nhớ từ vựng và cấu trúc ngữ pháp!`;
      btnRetakeQuiz.style.display = "inline-flex";
    } else {
      retakeInfoText.innerHTML = `🔒 Bạn đã hoàn thành tối đa <strong>${CONFIG.MAX_ATTEMPTS} lần làm bài</strong>.`;
      btnRetakeQuiz.style.display = "none";
    }

    // Tính toán & Render Cây Tri Thức (Chỉ tính EXP lần 1)
    renderKnowledgeTreeReward(result);

    // Render Review Questions có Highlight NotebookLM
    renderReviewQuestions(result.answersDetail);
  }

  function showPastResult(sub) {
    loginSection.style.display = "none";
    showResultScreen(sub);
  }

  function triggerFireworks() {
    if (typeof confetti === "function") {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    }
  }

  /**
   * Render Cây Tri Thức sau khi nộp bài
   */
  async function renderKnowledgeTreeReward(currentResult) {
    try {
      const histRes = await API.getStudentHistory(currentStudent.studentId);
      const history = histRes.success && histRes.data ? (histRes.data.history || []) : [currentResult];
      const treeProgress = TreeEngine.calculateTreeProgress(history);
      treeRewardContainer.innerHTML = TreeEngine.renderTreeWidget(treeProgress);
    } catch (e) {
      const treeProgress = TreeEngine.calculateTreeProgress([currentResult]);
      treeRewardContainer.innerHTML = TreeEngine.renderTreeWidget(treeProgress);
    }
  }

  /**
   * Render Review Questions (NotebookLM Keywords & Evidence Highlights)
   */
  function renderReviewQuestions(answersDetail = []) {
    const detailMap = {};
    answersDetail.forEach(d => { detailMap[d.questionId] = d; });

    let html = "";
    let currentPassageKey = null;

    flattenedQuestions.forEach((q) => {
      const detail = detailMap[q.id] || { selected: "", isCorrect: false };
      const chosen = detail.selected;
      const isCorrect = detail.isCorrect;

      // Hiển thị Passage / Transcript có highlight
      if (q.passageContext) {
        const pKey = (q.passageContext.passageTitle || "") + (q.passageContext.transcript || "") + (q.passageContext.passageText || "");
        if (pKey !== currentPassageKey) {
          currentPassageKey = pKey;
          html += `
            <div class="passage-review-box" style="margin-top: 24px;">
              <div class="passage-review-header">
                ${q.passageContext.isListening ? '🎧 TRANSCRIPT BÀI NGHE (ĐÃ TÔ SÁNG BẰNG CHỨNG)' : '📖 ĐOẠN VĂN ĐỌC HIỂU (ĐÃ TÔ SÁNG BẰNG CHỨNG)'}
              </div>
              <div>${q.passageContext.transcript || q.passageContext.passageText || ""}</div>
              ${q.passageContext.transcriptTranslation ? `
                <div style="margin-top: 10px; font-size: 13px; color: var(--text-muted); font-style: italic;">
                  🌐 Bản dịch đoạn: ${q.passageContext.transcriptTranslation}
                </div>
              ` : ''}
            </div>
          `;
        }
      }

      // Options
      let optionsHtml = "";
      q.options.forEach(opt => {
        let optClass = "";
        let inlineExp = opt.explanation || "";

        if (opt.key === q.correct) {
          optClass = "is-correct-pill";
        } else if (opt.key === chosen && !isCorrect) {
          optClass = "is-wrong-pill";
        }

        optionsHtml += `
          <div class="canvas-option-pill ${optClass}">
            <div class="canvas-option-header">
              <span class="canvas-option-label"><strong>${opt.key}.</strong> ${escapeHtml(opt.text)}</span>
              ${opt.key === q.correct ? '<span class="badge badge-success">✓ Đáp án đúng</span>' : ''}
              ${opt.key === chosen && !isCorrect ? '<span class="badge badge-danger">✕ Lựa chọn của bạn</span>' : ''}
            </div>
            ${inlineExp ? `<div class="inline-explanation-text">💡 ${inlineExp}</div>` : ''}
          </div>
        `;
      });

      // Question card
      const questionTextToDisplay = q.highlightedQuestion || q.question;

      html += `
        <div class="card" style="border-left: 4px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="canvas-q-number" style="margin-bottom: 0;">Question ${q.displayIndex}</span>
            <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">
              ${isCorrect ? 'ĐÚNG (+1đ)' : 'CHƯA ĐÚNG'}
            </span>
          </div>
          
          <div class="canvas-q-text" style="margin-bottom: 16px;">${questionTextToDisplay}</div>
          <div class="canvas-options-list" style="margin-bottom: 14px;">${optionsHtml}</div>

          ${q.explanation ? `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 14px; font-size: 13.5px; line-height: 1.6; margin-top: 12px;">
              <strong style="color: var(--accent-success);">💡 Giải thích tổng quan:</strong> ${q.explanation}
            </div>
          ` : ''}

          ${q.translation ? `
            <div style="background: var(--bg-input); border-radius: var(--radius-sm); padding: 12px; margin-top: 10px; font-size: 13px; color: var(--text-secondary); font-style: italic;">
              🌐 <strong>Bản dịch câu hỏi:</strong> ${escapeHtml(q.translation)}
            </div>
          ` : ''}
        </div>
      `;
    });

    reviewQuestionsContainer.innerHTML = html;
  }

  function retakeQuiz() {
    userAnswers = {};
    currentQuestionIndex = 0;
    startCanvasQuiz();
  }

  function shareCanvasLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("Đã sao chép link Canvas bài tập vào clipboard!");
    }).catch(() => {
      prompt("Sao chép link làm bài:", url);
    });
  }

  function closeCanvas() {
    if (confirm("Bạn có chắc chắn muốn thoát khỏi phòng làm bài?")) {
      window.location.href = "index.html";
    }
  }

  function formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

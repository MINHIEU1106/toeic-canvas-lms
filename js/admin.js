/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - ADMIN PANEL CONTROLLER (admin.js)
 * =========================================================================
 */

(function () {
  const htmlRoot = document.documentElement;
  const btnToggleTheme = document.getElementById("btn-toggle-theme");

  const pinModal = document.getElementById("pin-modal");
  const inputPin = document.getElementById("input-pin");
  const btnVerifyPin = document.getElementById("btn-verify-pin");
  const pinErrorMsg = document.getElementById("pin-error-msg");

  const jsonInput = document.getElementById("json-input");
  const btnLoadSample = document.getElementById("btn-load-sample");
  const btnValidateJson = document.getElementById("btn-validate-json");
  const btnPublishAssignment = document.getElementById("btn-publish-assignment");
  const validationMsg = document.getElementById("validation-msg");

  const generatedLinkCard = document.getElementById("generated-link-card");
  const generatedUrlInput = document.getElementById("generated-url-input");
  const btnCopyGeneratedUrl = document.getElementById("btn-copy-generated-url");
  const btnOpenQuizTest = document.getElementById("btn-open-quiz-test");
  const btnOpenDashboardTest = document.getElementById("btn-open-dashboard-test");

  const previewContainer = document.getElementById("preview-container");
  const assignmentsListTbody = document.getElementById("assignments-list-tbody");

  const SAMPLE_NOTEBOOKLM_JSON = {
    "assignmentId": "TOEIC_B_TB39_HW01",
    "title": "TOEIC Grammar & Reading: To-V, Passive & Part 7 Notice",
    "audioUrl": "",
    "questions": [
      {
        "id": 1,
        "question": "The problem with its record keeping system ------- by Franklin Financial next month.",
        "highlightedQuestion": "The problem with its record keeping system ------- by Franklin Financial <mark class=\"hl-kw\">next month</mark>.",
        "options": [
          {
            "key": "A",
            "text": "is addressing",
            "explanation": "Does not fit grammatically because the subject is 'The problem,' which is not performing the action."
          },
          {
            "key": "B",
            "text": "will be addressed",
            "explanation": "Forms a proper future passive construction that matches the sentence structure."
          },
          {
            "key": "C",
            "text": "addressing",
            "explanation": "Participle alone cannot act as the main verb of the predicate."
          },
          {
            "key": "D",
            "text": "addressed",
            "explanation": "Past tense verb conflicts with the future time expression 'next month'."
          }
        ],
        "correct": "B",
        "category": "Thể bị động",
        "explanation": "Chủ ngữ là vật 'The problem' kết hợp dấu hiệu tương lai '<mark class=\"hl-kw\">next month</mark>' -> dùng thì tương lai bị động (will be + V3/ed).",
        "translation": "Vấn đề về hệ thống lưu trữ hồ sơ của nó sẽ được Franklin Financial giải quyết vào tháng tới."
      }
    ],
    "groups": [
      {
        "groupId": "G1",
        "passageTitle": "Questions 2-3 refer to the following email notice:",
        "passageText": "From: Facilities Department\nTo: All Employees\nSubject: Elevator Safety Inspection\n\nPlease note that the main elevators will undergo <mark class=\"hl-evidence\">mandatory maintenance this Friday from 8:00 PM to 11:00 PM</mark>. During this time, please <mark class=\"hl-evidence\">use the north stairwells or the freight elevator</mark>.",
        "transcriptTranslation": "Thông báo: Thang máy chính sẽ được bảo trì bắt buộc vào thứ Sáu tuần này từ 8:00 tối đến 11:00 tối...",
        "audioUrl": "",
        "questions": [
          {
            "id": 2,
            "question": "What is the purpose of the email notice?",
            "highlightedQuestion": "What is the <mark class=\"hl-kw\">purpose</mark> of the email notice?",
            "options": [
              {"key": "A", "text": "To announce elevator maintenance", "explanation": "Directly matches the maintenance notice."},
              {"key": "B", "text": "To recruit safety inspectors", "explanation": "Not mentioned in the text."},
              {"key": "C", "text": "To change office hours", "explanation": "Incorrect topic."}
            ],
            "correct": "A",
            "category": "Part 7 - Mục đích",
            "explanation": "Đoạn văn nêu rõ: '<mark class=\"hl-evidence\">mandatory maintenance this Friday</mark>'.",
            "translation": "Mục đích của thông báo qua email là gì? -> Để thông báo việc bảo trì thang máy."
          }
        ]
      }
    ]
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initTheme();
    checkPinAccess();

    btnToggleTheme.addEventListener("click", toggleTheme);

    btnVerifyPin.addEventListener("click", verifyPin);
    inputPin.addEventListener("keyup", (e) => {
      if (e.key === "Enter") verifyPin();
    });

    btnLoadSample.addEventListener("click", () => {
      jsonInput.value = JSON.stringify(SAMPLE_NOTEBOOKLM_JSON, null, 2);
      validateAndPreview();
    });

    btnValidateJson.addEventListener("click", validateAndPreview);
    btnPublishAssignment.addEventListener("click", publishAssignment);
    btnCopyGeneratedUrl.addEventListener("click", copyUrl);

    loadAssignmentsList();
  }

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

  function checkPinAccess() {
    const isUnlocked = sessionStorage.getItem("TOEIC_TEACHER_UNLOCKED");
    if (isUnlocked === "true") {
      pinModal.style.display = "none";
    } else {
      pinModal.style.display = "flex";
      inputPin.focus();
    }
  }

  function verifyPin() {
    const pin = inputPin.value.trim();
    if (pin === CONFIG.TEACHER_PIN) {
      sessionStorage.setItem("TOEIC_TEACHER_UNLOCKED", "true");
      pinModal.style.display = "none";
      loadAssignmentsList();
    } else {
      pinErrorMsg.style.display = "block";
      inputPin.value = "";
      inputPin.focus();
    }
  }

  function validateAndPreview() {
    const raw = jsonInput.value.trim();
    if (!raw) {
      showValidationMessage("Vui lòng dán nội dung JSON vào ô trên!", false);
      return null;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      showValidationMessage(`Lỗi cú pháp JSON: ${err.message}`, false);
      return null;
    }

    if (!parsed.assignmentId || !parsed.title) {
      showValidationMessage("Thiếu trường bắt buộc: 'assignmentId' hoặc 'title'!", false);
      return null;
    }

    showValidationMessage("✅ Cú pháp JSON hoàn toàn hợp lệ!", true);
    renderPreview(parsed);
    return parsed;
  }

  function showValidationMessage(text, isSuccess) {
    validationMsg.style.display = "block";
    validationMsg.style.background = isSuccess ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)";
    validationMsg.style.border = isSuccess ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(244, 63, 94, 0.3)";
    validationMsg.style.color = isSuccess ? "var(--accent-success)" : "var(--accent-danger)";
    validationMsg.textContent = text;
  }

  function renderPreview(data) {
    let html = `
      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${escapeHtml(data.title)}</h4>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Mã đề: <code>${escapeHtml(data.assignmentId)}</code></div>
      </div>
    `;

    if (Array.isArray(data.questions)) {
      data.questions.forEach((q, idx) => {
        html += `
          <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
              <strong>Câu ${q.id || idx + 1}</strong>
              <span style="color: var(--accent-success); font-weight: 700;">Đáp án: ${q.correct}</span>
            </div>
            <div style="font-size: 13.5px; color: var(--text-primary); margin-bottom: 8px;">${q.highlightedQuestion || escapeHtml(q.question)}</div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary);">
              ${q.options ? q.options.map(opt => `<div><strong>${opt.key}.</strong> ${escapeHtml(opt.text)} ${opt.explanation ? `<em>(${escapeHtml(opt.explanation)})</em>` : ''}</div>`).join("") : ""}
            </div>
          </div>
        `;
      });
    }

    if (Array.isArray(data.groups)) {
      data.groups.forEach((g, gIdx) => {
        html += `
          <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 12px; font-weight: 700; color: #60a5fa; margin-bottom: 6px;">📌 ${escapeHtml(g.passageTitle || `Nhóm câu hỏi ${gIdx + 1}`)}</div>
            ${g.questions ? g.questions.map(q => `
              <div style="margin-top: 8px; font-size: 13px;">
                <strong>Câu ${q.id}:</strong> ${q.highlightedQuestion || escapeHtml(q.question)} (ĐA: <strong>${q.correct}</strong>)
              </div>
            `).join("") : ""}
          </div>
        `;
      });
    }

    previewContainer.innerHTML = html;
  }

  async function publishAssignment() {
    const data = validateAndPreview();
    if (!data) return;

    btnPublishAssignment.disabled = true;
    btnPublishAssignment.textContent = "⏳ Đang xuất bản...";

    try {
      const res = await API.createAssignment(data);
      if (res.success) {
        showGeneratedLink(data.assignmentId);
        loadAssignmentsList();
        alert(`🎉 Xuất bản đề bài [${data.assignmentId}] thành công!`);
      } else {
        alert(res.message || "Có lỗi khi xuất bản đề bài!");
      }
    } catch (err) {
      alert("Lỗi kết nối khi xuất bản đề bài.");
    } finally {
      btnPublishAssignment.disabled = false;
      btnPublishAssignment.textContent = "🚀 Xuất bản Đề bài";
    }
  }

  function showGeneratedLink(assignmentId) {
    const origin = window.location.origin;
    const pathname = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
    const quizUrl = `${origin}${pathname}/quiz.html?id=${encodeURIComponent(assignmentId)}`;
    const dashUrl = `${origin}${pathname}/dashboard.html?id=${encodeURIComponent(assignmentId)}`;

    generatedUrlInput.value = quizUrl;
    btnOpenQuizTest.href = quizUrl;
    btnOpenDashboardTest.href = dashUrl;
    generatedLinkCard.style.display = "block";
    generatedLinkCard.scrollIntoView({ behavior: "smooth" });
  }

  function copyUrl() {
    generatedUrlInput.select();
    navigator.clipboard.writeText(generatedUrlInput.value).then(() => {
      alert("Đã sao chép link Canvas vào clipboard!");
    }).catch(() => {
      prompt("Sao chép link Canvas:", generatedUrlInput.value);
    });
  }

  async function loadAssignmentsList() {
    try {
      const res = await API.listAssignments();
      if (res.success && Array.isArray(res.data)) {
        renderAssignmentsTable(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function renderAssignmentsTable(list) {
    if (list.length === 0) {
      assignmentsListTbody.innerHTML = `
        <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có đề bài nào được tạo.</td></tr>
      `;
      return;
    }

    let html = "";
    list.forEach(item => {
      html += `
        <tr>
          <td style="font-weight: 700; color: #60a5fa;">${escapeHtml(item.assignmentId)}</td>
          <td>${escapeHtml(item.title)}</td>
          <td><span class="badge badge-primary">${item.questionCount || 0} câu</span></td>
          <td style="font-size: 12px; color: var(--text-muted);">${formatDate(item.createdAt)}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <a href="quiz.html?id=${encodeURIComponent(item.assignmentId)}" target="_blank" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">
                Canvas
              </a>
              <a href="dashboard.html?id=${encodeURIComponent(item.assignmentId)}" target="_blank" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">
                Dashboard
              </a>
            </div>
          </td>
        </tr>
      `;
    });

    assignmentsListTbody.innerHTML = html;
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

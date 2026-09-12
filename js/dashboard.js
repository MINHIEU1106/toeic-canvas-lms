/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - TEACHER DASHBOARD CONTROLLER (dashboard.js)
 * =========================================================================
 */

(function () {
  const htmlRoot = document.documentElement;
  const btnToggleTheme = document.getElementById("btn-toggle-theme");

  let currentAssignmentId = "";
  let rawDashboardData = null;
  let wrongChartInstance = null;

  // DOM Elements
  const pinModal = document.getElementById("pin-modal");
  const inputPin = document.getElementById("input-pin");
  const btnVerifyPin = document.getElementById("btn-verify-pin");
  const pinErrorMsg = document.getElementById("pin-error-msg");

  const selectAssignment = document.getElementById("select-assignment");
  const filterClass = document.getElementById("filter-class");
  const btnRefreshDashboard = document.getElementById("btn-refresh-dashboard");
  const btnCopyQuizLink = document.getElementById("btn-copy-quiz-link");

  const kpiTotalSubs = document.getElementById("kpi-total-subs");
  const kpiAvgScore = document.getElementById("kpi-avg-score");
  const kpiAvgAccuracy = document.getElementById("kpi-avg-accuracy");
  const kpiAvgTime = document.getElementById("kpi-avg-time");

  const topWrongContainer = document.getElementById("top-wrong-container");
  const leaderboardCount = document.getElementById("leaderboard-count");
  const leaderboardTbody = document.getElementById("leaderboard-tbody");

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initTheme();
    checkPinAccess();

    const urlParams = new URLSearchParams(window.location.search);
    currentAssignmentId = urlParams.get("id") || "TOEIC_HW_01";

    btnToggleTheme.addEventListener("click", toggleTheme);

    btnVerifyPin.addEventListener("click", verifyPin);
    inputPin.addEventListener("keyup", (e) => {
      if (e.key === "Enter") verifyPin();
    });

    selectAssignment.addEventListener("change", (e) => {
      currentAssignmentId = e.target.value;
      if (currentAssignmentId) {
        window.history.replaceState({}, "", `dashboard.html?id=${encodeURIComponent(currentAssignmentId)}`);
        loadDashboardData();
      }
    });

    filterClass.addEventListener("change", renderFilteredView);
    btnRefreshDashboard.addEventListener("click", loadDashboardData);
    btnCopyQuizLink.addEventListener("click", copyQuizLink);

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
      loadDashboardData();
    } else {
      pinErrorMsg.style.display = "block";
      inputPin.value = "";
      inputPin.focus();
    }
  }

  async function loadAssignmentsList() {
    try {
      const res = await API.listAssignments();
      if (res.success && Array.isArray(res.data)) {
        selectAssignment.innerHTML = "";
        res.data.forEach(item => {
          const opt = document.createElement("option");
          opt.value = item.assignmentId;
          opt.textContent = `${item.title} (${item.assignmentId})`;
          if (item.assignmentId === currentAssignmentId) {
            opt.selected = true;
          }
          selectAssignment.appendChild(opt);
        });

        if (!currentAssignmentId && res.data.length > 0) {
          currentAssignmentId = res.data[0].assignmentId;
        }
      }
      loadDashboardData();
    } catch (e) {
      loadDashboardData();
    }
  }

  async function loadDashboardData() {
    if (!currentAssignmentId) return;

    leaderboardTbody.innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">⏳ Đang tải dữ liệu bài làm...</td></tr>
    `;

    try {
      const res = await API.getDashboard(currentAssignmentId);
      if (res.success && res.data) {
        rawDashboardData = res.data;
        populateClassFilter(rawDashboardData.allSubmissions || []);
        renderFilteredView();
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  }

  function populateClassFilter(submissions) {
    const currentVal = filterClass.value || "ALL";
    const dynamicClasses = [...new Set(submissions.map(s => s.class).filter(Boolean))];
    const defaultClasses = ["TOEIC_B_TB39", "TOEIC_B_TB45"];
    const allClasses = [...new Set([...defaultClasses, ...dynamicClasses])].sort();

    filterClass.innerHTML = `<option value="ALL">Tất cả các lớp</option>`;
    allClasses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `Lớp ${c}`;
      if (c === currentVal) opt.selected = true;
      filterClass.appendChild(opt);
    });
  }

  function renderFilteredView() {
    if (!rawDashboardData) return;

    const selectedClass = filterClass.value;
    let submissions = rawDashboardData.allSubmissions || [];

    if (selectedClass && selectedClass !== "ALL") {
      submissions = submissions.filter(s => s.class === selectedClass);
    }

    const totalSubs = submissions.length;
    let totalScore = 0;
    let totalAccuracy = 0;
    let totalTime = 0;

    const questionWrongMap = {};

    submissions.forEach(sub => {
      totalScore += sub.score;
      totalAccuracy += sub.accuracyRate;
      totalTime += sub.timeSpentSeconds;

      if (Array.isArray(sub.wrongQuestions)) {
        sub.wrongQuestions.forEach(wq => {
          const qId = wq.id || "Q";
          if (!questionWrongMap[qId]) {
            questionWrongMap[qId] = {
              questionId: qId,
              questionText: wq.question || "",
              category: wq.category || "Ngữ pháp",
              wrongCount: 0
            };
          }
          questionWrongMap[qId].wrongCount++;
        });
      }
    });

    kpiTotalSubs.textContent = totalSubs;
    kpiAvgScore.textContent = totalSubs > 0 ? (totalScore / totalSubs).toFixed(1) : "0.0";
    kpiAvgAccuracy.textContent = totalSubs > 0 ? `${(totalAccuracy / totalSubs).toFixed(1)}%` : "0%";
    kpiAvgTime.textContent = totalSubs > 0 ? formatTime(Math.round(totalTime / totalSubs)) : "00:00";

    renderWrongChart(questionWrongMap);
    renderTopWrongQuestions(questionWrongMap);
    renderLeaderboard(submissions);
  }

  function renderWrongChart(wrongMap) {
    const ctx = document.getElementById("chart-wrong-questions").getContext("2d");

    const sortedQuestions = Object.values(wrongMap).sort((a, b) => {
      const numA = parseInt(a.questionId) || 0;
      const numB = parseInt(b.questionId) || 0;
      return numA - numB;
    });

    const labels = sortedQuestions.map(q => `Câu ${q.questionId}`);
    const dataValues = sortedQuestions.map(q => q.wrongCount);

    if (wrongChartInstance) wrongChartInstance.destroy();

    wrongChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length > 0 ? labels : ["Chưa có dữ liệu"],
        datasets: [{
          label: "Số học sinh làm sai",
          data: dataValues.length > 0 ? dataValues : [0],
          backgroundColor: "rgba(244, 63, 94, 0.65)",
          borderColor: "#f43f5e",
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: "#94a3b8" },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            ticks: { color: "#94a3b8" },
            grid: { display: false }
          }
        }
      }
    });
  }

  function renderTopWrongQuestions(wrongMap) {
    const list = Object.values(wrongMap).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5);

    if (list.length === 0) {
      topWrongContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Chưa có câu hỏi nào bị làm sai hoặc chưa có bài nộp.</p>`;
      return;
    }

    let html = "";
    list.forEach((item, index) => {
      html += `
        <div style="background: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: 700; color: #fda4af; font-size: 14px;">
              #${index + 1}. Câu ${item.questionId} (${item.category})
            </div>
            <div class="badge badge-danger">
              ❌ ${item.wrongCount} học sinh sai
            </div>
          </div>
          <div style="color: var(--text-primary); font-size: 14px; line-height: 1.5;">
            ${escapeHtml(item.questionText || "Nội dung câu hỏi")}
          </div>
        </div>
      `;
    });

    topWrongContainer.innerHTML = html;
  }

  function renderLeaderboard(submissions) {
    const sorted = [...submissions].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpentSeconds - b.timeSpentSeconds;
    });

    leaderboardCount.textContent = `${sorted.length} bài nộp`;

    if (sorted.length === 0) {
      leaderboardTbody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Chưa có học sinh nào nộp bài.</td></tr>
      `;
      return;
    }

    let html = "";
    sorted.forEach((sub, idx) => {
      let rankBadge = `${idx + 1}`;
      if (idx === 0) rankBadge = "🥇 1";
      else if (idx === 1) rankBadge = "🥈 2";
      else if (idx === 2) rankBadge = "🥉 3";

      html += `
        <tr>
          <td style="font-weight: 800; color: ${idx < 3 ? '#fbbf24' : 'var(--text-secondary)'};">${rankBadge}</td>
          <td>
            <a href="student.html?id=${encodeURIComponent(sub.studentId)}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">
              ${escapeHtml(sub.studentName || sub.studentId)}
            </a>
            <div style="font-size: 11px; color: var(--text-muted);">${sub.studentId}</div>
          </td>
          <td><span class="badge badge-primary">${escapeHtml(sub.class || "Chung")}</span></td>
          <td style="font-weight: 700; color: var(--accent-success);">${sub.score}/${sub.totalQuestions}</td>
          <td>
            <span class="badge ${sub.accuracyRate >= 80 ? 'badge-success' : (sub.accuracyRate >= 50 ? 'badge-warning' : 'badge-danger')}">
              ${sub.accuracyRate}%
            </span>
          </td>
          <td style="font-variant-numeric: tabular-nums;">${formatTime(sub.timeSpentSeconds)}</td>
          <td><span class="badge badge-warning">Lần ${sub.attemptNumber || 1}</span></td>
          <td style="font-size: 12px; color: var(--text-muted);">${formatDate(sub.timestamp)}</td>
        </tr>
      `;
    });

    leaderboardTbody.innerHTML = html;
  }

  function copyQuizLink() {
    const origin = window.location.origin;
    const pathname = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
    const quizUrl = `${origin}${pathname}/quiz.html?id=${encodeURIComponent(currentAssignmentId)}`;

    navigator.clipboard.writeText(quizUrl).then(() => {
      alert(`Đã sao chép link Canvas cho học sinh:\n${quizUrl}`);
    }).catch(() => {
      prompt("Sao chép link làm bài:", quizUrl);
    });
  }

  function formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
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

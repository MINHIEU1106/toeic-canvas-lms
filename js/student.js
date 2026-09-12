/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - STUDENT PROGRESS & KNOWLEDGE TREE (student.js)
 * =========================================================================
 */

(function () {
  let currentStudentId = "";
  let progressChartInstance = null;
  let categoryChartInstance = null;

  // DOM Elements
  const htmlRoot = document.documentElement;
  const btnToggleTheme = document.getElementById("btn-toggle-theme");
  const selectStudentProfile = document.getElementById("select-student-profile");
  const studentClassBadge = document.getElementById("student-class-badge");
  const studentTotalDone = document.getElementById("student-total-done");
  const studentTreeContainer = document.getElementById("student-tree-container");
  const studentHistoryTbody = document.getElementById("student-history-tbody");

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    initTheme();

    const urlParams = new URLSearchParams(window.location.search);
    currentStudentId = urlParams.get("id") || "";

    btnToggleTheme.addEventListener("click", toggleTheme);

    selectStudentProfile.addEventListener("change", (e) => {
      currentStudentId = e.target.value;
      if (currentStudentId) {
        window.history.replaceState({}, "", `student.html?id=${encodeURIComponent(currentStudentId)}`);
        loadStudentData();
      }
    });

    await loadStudentsList();
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

  async function loadStudentsList() {
    try {
      const res = await API.getStudents();
      const list = res.success && Array.isArray(res.data) ? res.data : CONFIG.MOCK_STUDENTS;

      selectStudentProfile.innerHTML = `<option value="">-- Chọn học viên --</option>`;

      const groups = {};
      list.forEach(s => {
        const c = s.class || "Khác";
        if (!groups[c]) groups[c] = [];
        groups[c].push(s);
      });

      Object.keys(groups).sort().forEach(className => {
        const optGroup = document.createElement("optgroup");
        optGroup.label = `Lớp ${className}`;

        groups[className].forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.studentId;
          opt.textContent = `${s.studentName} (${s.studentId})`;
          if (s.studentId === currentStudentId) {
            opt.selected = true;
          }
          optGroup.appendChild(opt);
        });

        selectStudentProfile.appendChild(optGroup);
      });

      if (!currentStudentId && list.length > 0) {
        currentStudentId = list[0].studentId;
        selectStudentProfile.value = currentStudentId;
      }

      loadStudentData();
    } catch (e) {
      console.error(e);
    }
  }

  async function loadStudentData() {
    if (!currentStudentId) return;

    studentHistoryTbody.innerHTML = `
      <tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">⏳ Đang tải lịch sử học viên...</td></tr>
    `;

    try {
      const res = await API.getStudentHistory(currentStudentId);
      if (res.success && res.data) {
        const student = res.data;
        studentClassBadge.textContent = student.class ? `Lớp ${student.class}` : "Chung";
        studentTotalDone.textContent = `${student.totalSubmissions || 0} bài`;

        // Render Cây Tri Thức (Chỉ tính EXP lần 1)
        const treeProgress = TreeEngine.calculateTreeProgress(student.history || []);
        studentTreeContainer.innerHTML = TreeEngine.renderTreeWidget(treeProgress);

        renderProgressChart(student.history || []);
        renderCategoryMistakesChart(student.categoryMistakes || {});
        renderHistoryTable(student.history || []);
      }
    } catch (err) {
      console.error("Student progress error:", err);
    }
  }

  function renderProgressChart(history) {
    const ctx = document.getElementById("chart-student-progress").getContext("2d");
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = sortedHistory.map((h) => `${h.assignmentId} (L${h.attemptNumber || 1})`);
    const accuracyData = sortedHistory.map(h => h.accuracyRate);

    if (progressChartInstance) progressChartInstance.destroy();

    progressChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length > 0 ? labels : ["Chưa có bài nộp"],
        datasets: [{
          label: "Độ chính xác (%)",
          data: accuracyData.length > 0 ? accuracyData : [0],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: "#60a5fa",
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { color: "#94a3b8", callback: v => `${v}%` },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            ticks: { color: "#94a3b8" },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function renderCategoryMistakesChart(categoryMistakes) {
    const ctx = document.getElementById("chart-category-mistakes").getContext("2d");
    const labels = Object.keys(categoryMistakes);
    const dataValues = Object.values(categoryMistakes);

    if (categoryChartInstance) categoryChartInstance.destroy();

    const isRadar = labels.length >= 3;

    categoryChartInstance = new Chart(ctx, {
      type: isRadar ? "radar" : "bar",
      data: {
        labels: labels.length > 0 ? labels : ["Chưa có lỗi sai"],
        datasets: [{
          label: "Số lần làm sai",
          data: dataValues.length > 0 ? dataValues : [0],
          backgroundColor: isRadar ? "rgba(244, 63, 94, 0.2)" : "rgba(244, 63, 94, 0.65)",
          borderColor: "#f43f5e",
          borderWidth: 2,
          pointBackgroundColor: "#f43f5e"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: isRadar ? {
          r: {
            beginAtZero: true,
            ticks: { precision: 0, backdropColor: "transparent", color: "#94a3b8" },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            pointLabels: { color: "#e2e8f0", font: { size: 12 } }
          }
        } : {
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

  function renderHistoryTable(history) {
    if (history.length === 0) {
      studentHistoryTbody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Học viên này chưa nộp bài tập nào.</td></tr>
      `;
      return;
    }

    const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = "";
    sorted.forEach(item => {
      html += `
        <tr>
          <td style="font-weight: 700; color: #60a5fa;">${escapeHtml(item.assignmentId)}</td>
          <td style="font-size: 13px; color: var(--text-secondary);">${formatDate(item.timestamp)}</td>
          <td style="font-weight: 700; color: var(--accent-success);">${item.score}/${item.totalQuestions}</td>
          <td>
            <span class="badge ${item.accuracyRate >= 80 ? 'badge-success' : (item.accuracyRate >= 50 ? 'badge-warning' : 'badge-danger')}">
              ${item.accuracyRate}%
            </span>
          </td>
          <td style="font-variant-numeric: tabular-nums;">${formatTime(item.timeSpentSeconds)}</td>
          <td><span class="badge badge-primary">Lần ${item.attemptNumber || 1}</span></td>
          <td>
            <a href="quiz.html?id=${encodeURIComponent(item.assignmentId)}" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">
              Xem đề / Làm lại
            </a>
          </td>
        </tr>
      `;
    });

    studentHistoryTbody.innerHTML = html;
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

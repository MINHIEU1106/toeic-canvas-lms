/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - UNIFIED API CLIENT
 * =========================================================================
 */

const API = {
  /**
   * Gọi GET request tới Apps Script Web App hoặc fallback mock data
   */
  async get(action, params = {}) {
    if (!CONFIG.API_BASE_URL || CONFIG.API_BASE_URL.trim() === "") {
      return this.handleMockGet(action, params);
    }

    const query = new URLSearchParams({ action, ...params }).toString();
    const url = `${CONFIG.API_BASE_URL}?${query}`;

    try {
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn("API Error, falling back to local storage/mock:", err);
      return this.handleMockGet(action, params);
    }
  },

  /**
   * Gọi POST request tới Apps Script Web App hoặc fallback mock data
   */
  async post(action, payload = {}) {
    if (!CONFIG.API_BASE_URL || CONFIG.API_BASE_URL.trim() === "") {
      return this.handleMockPost(action, payload);
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn("API POST Error, falling back to local storage:", err);
      return this.handleMockPost(action, payload);
    }
  },

  // High-level methods
  async getStudents() { return this.get("getStudents"); },
  async getAssignment(id) { return this.get("getAssignment", { id }); },
  async checkSubmissionStatus(studentId, assignmentId) { return this.get("checkSubmissionStatus", { studentId, assignmentId }); },
  async submitAnswer(payload) { return this.post("submitAnswer", payload); },
  async getDashboard(id) { return this.get("getDashboard", { id }); },
  async getStudentHistory(studentId) { return this.get("getStudentHistory", { studentId }); },
  async listAssignments() { return this.get("listAssignments"); },
  async createAssignment(payload) { return this.post("createAssignment", payload); },

  // =======================================================================
  // LOCAL MOCK & OFFLINE ENGINE (Dùng khi chưa gắn URL Web App)
  // =======================================================================
  handleMockGet(action, params) {
    const store = this.getLocalStore();

    switch (action) {
      case "getStudents":
        return { success: true, data: store.students };

      case "getAssignment": {
        const found = store.assignments.find(
          a => String(a.assignmentId).toLowerCase() === String(params.id).toLowerCase()
        );
        if (found) return { success: true, data: found };
        return { success: false, message: `Không tìm thấy đề bài: ${params.id}` };
      }

      case "checkSubmissionStatus": {
        const matches = store.submissions.filter(
          s => String(s.studentId).toLowerCase() === String(params.studentId).toLowerCase() &&
               String(s.assignmentId).toLowerCase() === String(params.assignmentId).toLowerCase()
        );
        const attemptCount = matches.length;
        return {
          success: true,
          data: {
            studentId: params.studentId,
            assignmentId: params.assignmentId,
            attemptCount: attemptCount,
            canRetake: attemptCount < CONFIG.MAX_ATTEMPTS,
            submissions: matches,
            lastSubmission: attemptCount > 0 ? matches[attemptCount - 1] : null
          }
        };
      }

      case "getDashboard": {
        const assignmentId = params.id;
        const matches = store.submissions.filter(
          s => String(s.assignmentId).toLowerCase() === String(assignmentId).toLowerCase()
        );
        const assign = store.assignments.find(
          a => String(a.assignmentId).toLowerCase() === String(assignmentId).toLowerCase()
        );

        let totalScore = 0;
        let totalAccuracy = 0;
        let totalTime = 0;
        const questionWrongStats = {};
        const categoryStats = {};

        matches.forEach(sub => {
          totalScore += sub.score;
          totalAccuracy += sub.accuracyRate;
          totalTime += sub.timeSpentSeconds;

          if (Array.isArray(sub.wrongQuestions)) {
            sub.wrongQuestions.forEach(wq => {
              const qId = wq.id || "Q";
              if (!questionWrongStats[qId]) {
                questionWrongStats[qId] = {
                  questionId: qId,
                  questionText: wq.question || "",
                  category: wq.category || "Ngữ pháp",
                  wrongCount: 0
                };
              }
              questionWrongStats[qId].wrongCount++;

              const cat = wq.category || "Ngữ pháp";
              if (!categoryStats[cat]) categoryStats[cat] = { category: cat, wrongCount: 0 };
              categoryStats[cat].wrongCount++;
            });
          }
        });

        const totalSubs = matches.length;
        const topWrong = Object.values(questionWrongStats)
          .sort((a, b) => b.wrongCount - a.wrongCount)
          .slice(0, 5);

        return {
          success: true,
          data: {
            assignmentId: assignmentId,
            assignmentTitle: assign ? assign.title : assignmentId,
            totalSubmissions: totalSubs,
            kpi: {
              totalStudents: totalSubs,
              averageScore: totalSubs > 0 ? Number((totalScore / totalSubs).toFixed(1)) : 0,
              averageAccuracy: totalSubs > 0 ? Number((totalAccuracy / totalSubs).toFixed(1)) : 0,
              averageTimeSeconds: totalSubs > 0 ? Math.round(totalTime / totalSubs) : 0
            },
            leaderboard: [...matches].sort((a, b) => b.score !== a.score ? b.score - a.score : a.timeSpentSeconds - b.timeSpentSeconds),
            questionWrongStats: questionWrongStats,
            topWrongQuestions: topWrong,
            categoryStats: categoryStats,
            allSubmissions: matches
          }
        };
      }

      case "getStudentHistory": {
        const studentId = params.studentId;
        const matches = store.submissions.filter(
          s => String(s.studentId).toLowerCase() === String(studentId).toLowerCase()
        );
        const stu = store.students.find(s => String(s.studentId).toLowerCase() === String(studentId).toLowerCase());

        const categoryMistakes = {};
        matches.forEach(sub => {
          if (Array.isArray(sub.wrongQuestions)) {
            sub.wrongQuestions.forEach(wq => {
              const cat = wq.category || "Ngữ pháp chung";
              categoryMistakes[cat] = (categoryMistakes[cat] || 0) + 1;
            });
          }
        });

        return {
          success: true,
          data: {
            studentId: studentId,
            studentName: stu ? stu.studentName : (matches[0]?.studentName || studentId),
            class: stu ? stu.class : (matches[0]?.class || ""),
            totalSubmissions: matches.length,
            history: matches,
            categoryMistakes: categoryMistakes
          }
        };
      }

      case "listAssignments": {
        const list = store.assignments.map(a => {
          let count = 0;
          if (Array.isArray(a.questions)) count += a.questions.length;
          if (Array.isArray(a.groups)) {
            a.groups.forEach(g => { if (Array.isArray(g.questions)) count += g.questions.length; });
          }
          return {
            assignmentId: a.assignmentId,
            title: a.title,
            audioUrl: a.audioUrl,
            questionCount: count,
            createdAt: a.createdAt || new Date().toISOString()
          };
        });
        return { success: true, data: list };
      }

      default:
        return { success: false, message: "Unknown action" };
    }
  },

  handleMockPost(action, payload) {
    const store = this.getLocalStore();

    if (action === "submitAnswer") {
      const past = store.submissions.filter(
        s => String(s.studentId).toLowerCase() === String(payload.studentId).toLowerCase() &&
             String(s.assignmentId).toLowerCase() === String(payload.assignmentId).toLowerCase()
      );

      if (past.length >= CONFIG.MAX_ATTEMPTS) {
        return { success: false, message: `Bạn đã nộp tối đa ${CONFIG.MAX_ATTEMPTS} lần cho bài này!` };
      }

      const newSub = {
        ...payload,
        timestamp: new Date().toISOString(),
        attemptNumber: past.length + 1
      };

      store.submissions.push(newSub);
      this.saveLocalStore(store);

      return {
        success: true,
        message: "Nộp bài thành công!",
        data: {
          attemptNumber: newSub.attemptNumber,
          remainingAttempts: CONFIG.MAX_ATTEMPTS - newSub.attemptNumber
        }
      };
    }

    if (action === "createAssignment") {
      const idx = store.assignments.findIndex(
        a => String(a.assignmentId).toLowerCase() === String(payload.assignmentId).toLowerCase()
      );

      if (idx >= 0) {
        store.assignments[idx] = { ...payload, createdAt: store.assignments[idx].createdAt || new Date().toISOString() };
      } else {
        store.assignments.push({ ...payload, createdAt: new Date().toISOString() });
      }

      this.saveLocalStore(store);
      return { success: true, message: "Lưu đề bài thành công!", data: { assignmentId: payload.assignmentId } };
    }

    return { success: false, message: "Unknown POST action" };
  },

  getLocalStore() {
    const defaultData = {
      students: CONFIG.MOCK_STUDENTS,
      assignments: [
        {
          "assignmentId": "TOEIC_HW_01",
          "title": "BTVN Chuyên đề: To-V, Bị Động & Đọc hiểu (Part 5 & 7)",
          "audioUrl": "",
          "instructions": "Chọn đáp án đúng nhất cho từng câu hỏi bên dưới. Bạn có tối đa 2 lần làm bài.",
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
              "explanation": "Chủ ngữ là vật 'The problem' kết hợp trạng từ chỉ tương lai '<mark class=\"hl-kw\">next month</mark>' -> Dùng tương lai đơn thể bị động: <strong>will be + V3/ed</strong>.",
              "translation": "Vấn đề với hệ thống lưu trữ hồ sơ của nó sẽ được Franklin Financial giải quyết vào tháng tới."
            },
            {
              "id": 2,
              "question": "All marketing interns are required ------- the orientation session before starting their daily tasks.",
              "highlightedQuestion": "All marketing interns are <mark class=\"hl-kw\">required -------</mark> the orientation session before starting their daily tasks.",
              "options": [
                {"key": "A", "text": "attend", "explanation": "Requires 'to' before base verb."},
                {"key": "B", "text": "to attend", "explanation": "Matches the passive structure 'be required to-V'."},
                {"key": "C", "text": "attending", "explanation": "Gerund cannot follow 'be required'."},
                {"key": "D", "text": "attended", "explanation": "Past participle form is incorrect here."}
              ],
              "correct": "B",
              "category": "Cấu trúc Bị động To-V",
              "explanation": "Cấu trúc ngữ pháp chuẩn: <strong>be required + to-V</strong> (được yêu cầu làm việc gì).",
              "translation": "Tất cả thực tập sinh tiếp thị đều được yêu cầu tham dự buổi định hướng trước khi bắt đầu nhiệm vụ hàng ngày của họ."
            },
            {
              "id": 3,
              "question": "The management team decided to ------- the launch of the new product due to supply chain disruptions.",
              "highlightedQuestion": "The management team <mark class=\"hl-kw\">decided to -------</mark> the launch of the new product due to supply chain disruptions.",
              "options": [
                {"key": "A", "text": "postpone", "explanation": "Correct base verb after 'to'."},
                {"key": "B", "text": "postponed", "explanation": "Past tense form cannot follow infinitive marker 'to'."},
                {"key": "C", "text": "postponing", "explanation": "V-ing cannot follow 'decided to'."},
                {"key": "D", "text": "postponement", "explanation": "Noun form does not fit verb position."}
              ],
              "correct": "A",
              "category": "Cấu trúc To-V",
              "explanation": "Cấu trúc: <strong>decide + to-V (nguyên mẫu)</strong> (quyết định làm gì). 'postpone' = trì hoãn.",
              "translation": "Đội ngũ quản lý đã quyết định hoãn việc ra mắt sản phẩm mới do sự gián đoạn chuỗi cung ứng."
            }
          ],
          "groups": [
            {
              "groupId": "G1",
              "passageTitle": "Questions 4-5 refer to the following email notice:",
              "passageText": "From: Facilities Department <facilities@greenwoodcorp.com>\nTo: All Greenwood Employees\nDate: October 14\nSubject: Scheduled Elevator Maintenance\n\nPlease be advised that the main elevators in Building A will undergo <mark class=\"hl-evidence\">mandatory safety inspections this Friday from 8:00 PM to 11:00 PM</mark>. During this time, elevator service will be temporarily unavailable. Employees working late are advised to <mark class=\"hl-evidence\">use the north stairwells or the freight elevator</mark> located near the loading dock.\n\nWe apologize for any inconvenience caused and appreciate your cooperation.",
              "transcriptTranslation": "Phòng Cơ sở vật chất thông báo: Thang máy chính tại Tòa nhà A sẽ được kiểm tra an toàn bắt buộc vào thứ Sáu tuần này từ 8:00 tối đến 11:00 tối...",
              "audioUrl": "",
              "questions": [
                {
                  "id": 4,
                  "question": "What is the purpose of the email notice?",
                  "highlightedQuestion": "What is the <mark class=\"hl-kw\">purpose</mark> of the email notice?",
                  "options": [
                    {"key": "A", "text": "To announce a temporary shutdown of the cafeteria", "explanation": "Not mentioned."},
                    {"key": "B", "text": "To inform staff of scheduled elevator maintenance", "explanation": "Direct match with the notice topic."},
                    {"key": "C", "text": "To recruit employees for the inspection team", "explanation": "Incorrect."},
                    {"key": "D", "text": "To change the building operating hours", "explanation": "Incorrect."}
                  ],
                  "correct": "B",
                  "category": "Part 7 - Mục đích đoạn văn",
                  "explanation": "Dòng 1 của email nêu rõ: '...will undergo <mark class=\"hl-evidence\">mandatory safety inspections this Friday</mark>'.",
                  "translation": "Mục đích của thông báo qua email là gì? -> Để thông báo cho nhân viên về việc bảo trì thang máy theo lịch trình."
                },
                {
                  "id": 5,
                  "question": "According to the notice, what should employees working late do?",
                  "highlightedQuestion": "According to the notice, what should <mark class=\"hl-kw\">employees working late</mark> do?",
                  "options": [
                    {"key": "A", "text": "Leave the building before 8:00 PM", "explanation": "Not required."},
                    {"key": "B", "text": "Contact the facility manager immediately", "explanation": "Not mentioned."},
                    {"key": "C", "text": "Use the north stairwells or freight elevator", "explanation": "Directly matches text recommendation."},
                    {"key": "D", "text": "Reschedule their work for the weekend", "explanation": "Incorrect."}
                  ],
                  "correct": "C",
                  "category": "Part 7 - Chi tiết hướng dẫn",
                  "explanation": "Đoạn văn hướng dẫn rõ: 'Employees working late are advised to <mark class=\"hl-evidence\">use the north stairwells or the freight elevator</mark>'.",
                  "translation": "Theo thông báo, những nhân viên làm việc muộn nên làm gì? -> Sử dụng cầu thang bộ phía bắc hoặc thang máy chở hàng."
                }
              ]
            }
          ]
        }
      ],
      submissions: [
        {
          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
          studentId: "TOEIC_B_TB39_01",
          studentName: "Trần Văn Bằng",
          studentClass: "TOEIC_B_TB39",
          assignmentId: "TOEIC_HW_01",
          timeSpentSeconds: 310,
          score: 5,
          totalQuestions: 5,
          accuracyRate: 100,
          attemptNumber: 1,
          answersDetail: [
            { questionId: 1, selected: "B", correct: "B", isCorrect: true, category: "Thể bị động" },
            { questionId: 2, selected: "B", correct: "B", isCorrect: true, category: "Cấu trúc Bị động To-V" },
            { questionId: 3, selected: "A", correct: "A", isCorrect: true, category: "Cấu trúc To-V" },
            { questionId: 4, selected: "B", correct: "B", isCorrect: true, category: "Part 7 - Mục đích đoạn văn" },
            { questionId: 5, selected: "C", correct: "C", isCorrect: true, category: "Part 7 - Chi tiết hướng dẫn" }
          ],
          wrongQuestions: []
        }
      ]
    };

    try {
      const raw = localStorage.getItem("TOEIC_LMS_STORE_V2");
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    return defaultData;
  },

  saveLocalStore(data) {
    try {
      localStorage.setItem("TOEIC_LMS_STORE_V2", JSON.stringify(data));
    } catch (e) {}
  }
};

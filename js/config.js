/**
 * =========================================================================
 * TOEIC HOMEWORK LMS - FRONTEND CONFIGURATION & DATA (CHUẨN 100% THEO FILE EXCEL)
 * =========================================================================
 */
const CONFIG = {
  // Thay thế URL dưới đây bằng URL Google Apps Script Web App của bạn sau khi deploy
  API_BASE_URL: "",

  // Mã PIN bảo mật mặc định cho Giáo viên (Dashboard & Admin Panel)
  TEACHER_PIN: "123456",

  // Số lần làm lại tối đa cho mỗi học sinh trên 1 bài tập
  MAX_ATTEMPTS: 2,

  // Số lần nghe tối đa cho mỗi audio Listening
  MAX_AUDIO_PLAYS: 2,

  // Cấu hình Icon Cây Tri Thức (Có thể tùy biến dễ dàng)
  TREE_THEME: {
    stages: [
      { level: 1, name: "Hạt Mầm Tri Thức", minXP: 0, icon: "🌱", description: "Vừa gieo mầm kiến thức TOEIC" },
      { level: 2, name: "Mầm Cây Vươn Chồi", minXP: 100, icon: "🌿", description: "Bắt đầu làm quen với các dạng bài" },
      { level: 3, name: "Cây Non Vững Vàng", minXP: 250, icon: "🪴", description: "Nắm chắc các chủ điểm ngữ pháp cốt lõi" },
      { level: 4, name: "Cây Trưởng Thành", minXP: 500, icon: "🌳", description: "Phản xạ nhanh nhạy với các bẫy đề thi" },
      { level: 5, name: "Đại Thụ Đơm Hoa Kết Trái", minXP: 850, icon: "🌸", description: "Master ngữ pháp và kỹ năng nghe TOEIC" }
    ]
  },

  // Danh sách học sinh chính xác trích xuất từ 2 file Excel: TOEIC B_TB39 & TOEIC B_TB45
  MOCK_STUDENTS: [
    // ==========================================
    // LỚP TOEIC_B_TB39 (15 học viên chính thức)
    // ==========================================
    { studentId: "TOEIC_B_TB39_01", studentName: "Trần Văn Bằng", class: "TOEIC_B_TB39", phone: "0965457307" },
    { studentId: "TOEIC_B_TB39_02", studentName: "Nguyễn Thái Sơn", class: "TOEIC_B_TB39", phone: "0979565058" },
    { studentId: "TOEIC_B_TB39_03", studentName: "Đặng Linh Trang", class: "TOEIC_B_TB39", phone: "0359228458" },
    { studentId: "TOEIC_B_TB39_04", studentName: "Chu Anh Tuấn", class: "TOEIC_B_TB39", phone: "0963871890" },
    { studentId: "TOEIC_B_TB39_05", studentName: "An Thị Huyền Trang", class: "TOEIC_B_TB39", phone: "0357465914" },
    { studentId: "TOEIC_B_TB39_06", studentName: "Phạm Dương Mai Anh", class: "TOEIC_B_TB39", phone: "0869794081" },
    { studentId: "TOEIC_B_TB39_07", studentName: "Phạm Thị Tuyết Nhung", class: "TOEIC_B_TB39", phone: "0386624665" },
    { studentId: "TOEIC_B_TB39_08", studentName: "Lương Thị Quỳnh Chi", class: "TOEIC_B_TB39", phone: "0899808892" },
    { studentId: "TOEIC_B_TB39_09", studentName: "Trần Đình Hiệp", class: "TOEIC_B_TB39", phone: "0379274204" },
    { studentId: "TOEIC_B_TB39_10", studentName: "Trần Hương Linh", class: "TOEIC_B_TB39", phone: "0328535234" },
    { studentId: "TOEIC_B_TB39_11", studentName: "Đào Trí Dũng", class: "TOEIC_B_TB39", phone: "0989324604" },
    { studentId: "TOEIC_B_TB39_12", studentName: "Nguyễn Văn Tú", class: "TOEIC_B_TB39", phone: "" },
    { studentId: "TOEIC_B_TB39_13", studentName: "Mạc Đức Lương", class: "TOEIC_B_TB39", phone: "" },
    { studentId: "TOEIC_B_TB39_14", studentName: "Mai Đăng Công Anh", class: "TOEIC_B_TB39", phone: "0343734900" },
    { studentId: "TOEIC_B_TB39_15", studentName: "Nguyễn Quang Huy", class: "TOEIC_B_TB39", phone: "" },

    // ==========================================
    // LỚP TOEIC_B_TB45 (18 học viên chính thức)
    // ==========================================
    { studentId: "TOEIC_B_TB45_01", studentName: "Nguyễn Khánh Linh", class: "TOEIC_B_TB45", phone: "0333409471" },
    { studentId: "TOEIC_B_TB45_02", studentName: "Trần Thị Minh Hoài", class: "TOEIC_B_TB45", phone: "0967447124" },
    { studentId: "TOEIC_B_TB45_03", studentName: "Nguyễn Trọng Quang Hào", class: "TOEIC_B_TB45", phone: "0389358002" },
    { studentId: "TOEIC_B_TB45_04", studentName: "Dương Thu Giang", class: "TOEIC_B_TB45", phone: "0369435984" },
    { studentId: "TOEIC_B_TB45_05", studentName: "Nguyễn Huy Khánh", class: "TOEIC_B_TB45", phone: "0365315859" },
    { studentId: "TOEIC_B_TB45_06", studentName: "Đặng Gia Bảo", class: "TOEIC_B_TB45", phone: "0911747460" },
    { studentId: "TOEIC_B_TB45_07", studentName: "Đặng Thành Danh", class: "TOEIC_B_TB45", phone: "0944331527" },
    { studentId: "TOEIC_B_TB45_08", studentName: "Võ Duy Thái", class: "TOEIC_B_TB45", phone: "0363465433" },
    { studentId: "TOEIC_B_TB45_09", studentName: "Nguyễn Ngọc Linh", class: "TOEIC_B_TB45", phone: "0967071360" },
    { studentId: "TOEIC_B_TB45_10", studentName: "Nguyễn Thị Dịu", class: "TOEIC_B_TB45", phone: "0367409815" },
    { studentId: "TOEIC_B_TB45_11", studentName: "Đỗ Thị Phương Anh", class: "TOEIC_B_TB45", phone: "0395035763" },
    { studentId: "TOEIC_B_TB45_12", studentName: "Trịnh Thị Trà My", class: "TOEIC_B_TB45", phone: "0967071360" },
    { studentId: "TOEIC_B_TB45_13", studentName: "Nguyễn Thị Phương Linh", class: "TOEIC_B_TB45", phone: "0772701041" },
    { studentId: "TOEIC_B_TB45_14", studentName: "Phạm Mạnh Hiếu", class: "TOEIC_B_TB45", phone: "0383129983" },
    { studentId: "TOEIC_B_TB45_15", studentName: "Phạm Quốc An", class: "TOEIC_B_TB45", phone: "0969378089" },
    { studentId: "TOEIC_B_TB45_16", studentName: "Lê Thị Ngọc Duyên", class: "TOEIC_B_TB45", phone: "0325279320" },
    { studentId: "TOEIC_B_TB45_17", studentName: "Phạm Thị Tâm", class: "TOEIC_B_TB45", phone: "0982460270" },
    { studentId: "TOEIC_B_TB45_18", studentName: "Vũ Bùi Hiền Trang", class: "TOEIC_B_TB45", phone: "0354079099" }
  ]
};

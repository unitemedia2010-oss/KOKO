/* ==========================================================================
   admin-config.js — dữ liệu mô tả cho trang quản trị
   --------------------------------------------------------------------------
   Trang admin tự sinh biểu mẫu từ danh sách này. Thêm một khoá mới vào
   index.html thì thêm tương ứng một dòng ở đây, không phải sửa HTML admin.

   Mỗi mục:
     id     : tên section (trùng id trong index.html)
     ten    : tên hiện trên thanh bên trái
     moTa   : gợi ý cho người dùng
     nhom   : nhóm trong thanh bên trái
     fields : danh sách khoá, mỗi khoá gồm
              { k: <khoá data-cms>, n: <nhãn>, g: <gợi ý>, d: <kiểu>,
                max: <độ dài tối đa>, rows: <số dòng cho textarea> }
   ========================================================================== */

window.KOKO_ADMIN_CONFIG = {

  backend: 'https://script.google.com/macros/s/AKfycbz82msR9fAC2hObTMzb-9WpLTqahEVAoQfUPfk2N6B6YtFp8PY5Nfk98d4vtJBT44Dl/exec',

  /* Định dạng lưu ký tự có dấu khi tải/xuất tệp */
  thuTuNhom: ['Trang chủ', 'Câu chuyện', 'Hành trình', 'Unite Group', 'Bền vững', 'Kết nối'],

  nhom: [
    { id: 'Trang chủ', cacSection: ['hero', 'manifesto'] },
    { id: 'Câu chuyện', cacSection: ['profile', 'operator', 'how-she-builds'] },
    { id: 'Hành trình', cacSection: ['journey'] },
    { id: 'Unite Group', cacSection: ['unite'] },
    { id: 'Bền vững', cacSection: ['people', 'point-of-view', 'beyond-office', 'moments', 'next-chapter'] },
    { id: 'Kết nối', cacSection: ['connect'] }
  ],

  sections: [

    /* ------------------------------------------------------------------ */
    {
      id: 'hero', ten: 'Trang chủ — Hero', nhom: 'Trang chủ',
      moTa: 'Phần đầu tiên người xem gặp. Chữ KOKO LINH hiện giữa cổng mở.',
      fields: [
        { k: 'hero_kicker', n: 'Chức danh', g: 'Ví dụ: Tổng Giám Đốc · Unite Group / 2026', d: 'text', max: 120 },
        { k: 'hero_title_1', n: 'Dòng 1 tên', g: 'KOKO', d: 'text', max: 40 },
        { k: 'hero_title_2', n: 'Dòng 2 tên', g: 'LINH', d: 'text', max: 40 },
        { k: 'hero_message', n: 'Câu dưới tên', g: 'Xây hệ thống. Xây đội ngũ. Kiến tạo tăng trưởng.', d: 'text', max: 200 },
        { k: 'hero_cta_1', n: 'Nút chính', g: 'Khám phá hành trình', d: 'text', max: 40 },
        { k: 'hero_cta_2', n: 'Nút phụ', g: 'Về Unite Group', d: 'text', max: 40 },
        { k: 'hero_footer', n: 'Ghi chú góc trái', g: 'Build clearly · Move intentionally', d: 'text', max: 120 },
        { k: 'hero_scroll', n: 'Ghi chú góc phải', g: 'Scroll to enter', d: 'text', max: 120 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'manifesto', ten: 'Manifesto', nhom: 'Trang chủ',
      moTa: 'Câu tuyên ngôn và 4 con số nổi bật.',
      fields: [
        { k: 'manifesto_eyebrow', n: 'Nhãn nhỏ', g: 'Manifesto', d: 'text', max: 40 },
        { k: 'manifesto_quote', n: 'Câu tuyên ngôn', g: 'Đoạn văn dài, hiện cỡ rất lớn', d: 'area', rows: 4, max: 600 },
        { k: 'stat_1_value', n: 'Số 1', g: '2020', d: 'text', max: 24 },
        { k: 'stat_1_label', n: 'Nhãn số 1', g: 'Hành trình khởi nguồn', d: 'text', max: 60 },
        { k: 'stat_2_value', n: 'Số 2', g: '10K+', d: 'text', max: 24 },
        { k: 'stat_2_label', n: 'Nhãn số 2', g: 'Căn hộ trong mạng lưới', d: 'text', max: 60 },
        { k: 'stat_3_value', n: 'Số 3', g: '300+', d: 'text', max: 24 },
        { k: 'stat_3_label', n: 'Nhãn số 3', g: 'Quy mô đội ngũ', d: 'text', max: 60 },
        { k: 'stat_4_value', n: 'Số 4', g: '01', d: 'text', max: 24 },
        { k: 'stat_4_label', n: 'Nhãn số 4', g: 'Hệ sinh thái Unite', d: 'text', max: 60 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'profile', ten: 'Về Koko Linh', nhom: 'Câu chuyện',
      moTa: 'Giới thiệu bản thân bên cạnh ảnh ghép.',
      fields: [
        { k: 'profile_eyebrow', n: 'Nhãn nhỏ', g: 'Về Koko Linh', d: 'text', max: 60 },
        { k: 'profile_title_1', n: 'Tiêu đề dòng 1', g: 'Nữ lãnh đạo trẻ', d: 'text', max: 80 },
        { k: 'profile_title_2', n: 'Tiêu đề dòng 2', g: 'trực tiếp xây dựng hệ thống.', d: 'text', max: 120 },
        { k: 'profile_p1', n: 'Đoạn 1', g: 'Mô tả ngắn về phong cách lãnh đạo', d: 'area', rows: 4, max: 700 },
        { k: 'profile_p2', n: 'Đoạn 2', g: 'Hành trình từ 2020 đến nay', d: 'area', rows: 4, max: 700 },
        { k: 'profile_p3', n: 'Đoạn 3', g: 'Điểm khác biệt', d: 'area', rows: 3, max: 700 },
        { k: 'profile_name', n: 'Chữ ký', g: 'Trương Cẩm Linh', d: 'text', max: 60 },
        { k: 'profile_role', n: 'Chức danh dưới chữ ký', g: 'Tổng Giám Đốc · Unite Group', d: 'text', max: 80 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'operator', ten: 'The Operator', nhom: 'Câu chuyện',
      moTa: 'Câu hỏi lớn về tư duy vận hành.',
      fields: [
        { k: 'operator_eyebrow', n: 'Nhãn nhỏ', g: 'The Operator', d: 'text', max: 40 },
        { k: 'operator_title_1', n: 'Tiêu đề dòng 1', g: 'Vision', d: 'text', max: 40 },
        { k: 'operator_title_2', n: 'Tiêu đề dòng 2', g: 'needs', d: 'text', max: 40 },
        { k: 'operator_title_3', n: 'Tiêu đề dòng 3', g: 'execution.', d: 'text', max: 40 },
        { k: 'operator_p', n: 'Đoạn giải thích', d: 'area', rows: 4, max: 700 },
        { k: 'operator_note_1_t', n: 'Ghi chú 1 — tiêu đề', g: 'System', d: 'text', max: 40 },
        { k: 'operator_note_1_d', n: 'Ghi chú 1 — mô tả', g: 'Chuẩn hóa những gì cần lặp lại.', d: 'text', max: 120 },
        { k: 'operator_note_2_t', n: 'Ghi chú 2 — tiêu đề', g: 'People', d: 'text', max: 40 },
        { k: 'operator_note_2_d', n: 'Ghi chú 2 — mô tả', g: 'Tạo môi trường để người khác lớn lên.', d: 'text', max: 120 },
        { k: 'operator_note_3_t', n: 'Ghi chú 3 — tiêu đề', g: 'Scale', d: 'text', max: 40 },
        { k: 'operator_note_3_d', n: 'Ghi chú 3 — mô tả', g: 'Tăng trưởng nhưng không đánh mất chất lượng.', d: 'text', max: 120 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'how-she-builds', ten: 'How She Builds', nhom: 'Câu chuyện',
      moTa: 'Ba nguyên tắc làm việc: Vision, People, Execution.',
      fields: [
        { k: 'how_eyebrow', n: 'Nhãn nhỏ', g: 'How She Builds', d: 'text', max: 40 },
        { k: 'how_title_1', n: 'Tiêu đề dòng 1', g: 'Vision.', d: 'text', max: 40 },
        { k: 'how_title_2', n: 'Tiêu đề dòng 2', g: 'People.', d: 'text', max: 40 },
        { k: 'how_title_3', n: 'Tiêu đề dòng 3', g: 'Execution.', d: 'text', max: 40 },
        { k: 'how_p', n: 'Đoạn dẫn', d: 'area', rows: 4, max: 700 },
        { k: 'build_1_title', n: 'Thẻ 1 — tiêu đề', g: 'Vision', d: 'text', max: 60 },
        { k: 'build_1_p', n: 'Thẻ 1 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'build_2_title', n: 'Thẻ 2 — tiêu đề', g: 'People', d: 'text', max: 60 },
        { k: 'build_2_p', n: 'Thẻ 2 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'build_3_title', n: 'Thẻ 3 — tiêu đề', g: 'Execution', d: 'text', max: 60 },
        { k: 'build_3_p', n: 'Thẻ 3 — mô tả', d: 'area', rows: 4, max: 700 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'journey', ten: 'Hành trình', nhom: 'Hành trình',
      moTa: 'Dải chuyển động ngang: 2020 → 2021 → 2023 → Hiện tại.',
      fields: [
        { k: 'journey_eyebrow', n: 'Nhãn nhỏ', g: 'Hành Trình Kiến Tạo', d: 'text', max: 60 },
        { k: 'journey_title_1', n: 'Tiêu đề dòng 1', g: 'The', d: 'text', max: 40 },
        { k: 'journey_title_2', n: 'Tiêu đề dòng 2', g: 'Journey.', d: 'text', max: 40 },
        { k: 'journey_1_year', n: 'Mốc 1 — năm', g: '2020', d: 'text', max: 20 },
        { k: 'journey_1_title', n: 'Mốc 1 — tiêu đề', g: 'Viên gạch đầu tiên.', d: 'text', max: 120 },
        { k: 'journey_1_p', n: 'Mốc 1 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'journey_2_year', n: 'Mốc 2 — năm', g: '2021', d: 'text', max: 20 },
        { k: 'journey_2_title', n: 'Mốc 2 — tiêu đề', g: 'Unite Group chính thức.', d: 'text', max: 120 },
        { k: 'journey_2_p', n: 'Mốc 2 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'journey_3_year', n: 'Mốc 3 — năm', g: '2023', d: 'text', max: 20 },
        { k: 'journey_3_title', n: 'Mốc 3 — tiêu đề', g: 'Mở rộng & xây đội ngũ.', d: 'text', max: 120 },
        { k: 'journey_3_p', n: 'Mốc 3 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'journey_4_year', n: 'Mốc 4 — năm', g: 'NOW', d: 'text', max: 20 },
        { k: 'journey_4_title', n: 'Mốc 4 — tiêu đề', g: 'Một tầm vóc mới.', d: 'text', max: 120 },
        { k: 'journey_4_p', n: 'Mốc 4 — mô tả', d: 'area', rows: 4, max: 700 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'unite', ten: 'Case study — Unite Group', nhom: 'Unite Group',
      moTa: 'Phần lớn nhất: tiêu đề, số liệu và sáu thẻ nội dung.',
      fields: [
        { k: 'case_eyebrow', n: 'Nhãn nhỏ', g: 'Largest Operating Proof', d: 'text', max: 60 },
        { k: 'case_title_1', n: 'Tiêu đề dòng 1', g: 'UNITE', d: 'text', max: 40 },
        { k: 'case_title_2', n: 'Tiêu đề dòng 2', g: 'GROUP.', d: 'text', max: 40 },
        { k: 'case_p', n: 'Đoạn dẫn', d: 'area', rows: 3, max: 700 },
        { k: 'case_1_tag', n: 'Thẻ 1 — nhãn', g: 'Core Business', d: 'text', max: 60 },
        { k: 'case_1_title', n: 'Thẻ 1 — tiêu đề', g: 'Bất động sản cho thuê', d: 'text', max: 120 },
        { k: 'case_1_p', n: 'Thẻ 1 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'case_2_tag', n: 'Thẻ 2 — nhãn', g: 'Operating Scale', d: 'text', max: 60 },
        { k: 'case_2_value', n: 'Thẻ 2 — số lớn', g: '10K+', d: 'text', max: 24 },
        { k: 'case_2_p', n: 'Thẻ 2 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'case_3_tag', n: 'Thẻ 3 — nhãn', g: 'People System', d: 'text', max: 60 },
        { k: 'case_3_title', n: 'Thẻ 3 — tiêu đề', g: '300+ People', d: 'text', max: 120 },
        { k: 'case_3_p', n: 'Thẻ 3 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'case_4_tag', n: 'Thẻ 4 — nhãn', g: 'Strategic Partnership', d: 'text', max: 60 },
        { k: 'case_4_title', n: 'Thẻ 4 — tiêu đề', g: 'Batdongsan.com.vn', d: 'text', max: 120 },
        { k: 'case_4_p', n: 'Thẻ 4 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'case_5_tag', n: 'Thẻ 5 — nhãn', g: 'New Chapter', d: 'text', max: 60 },
        { k: 'case_5_title', n: 'Thẻ 5 — tiêu đề', g: 'UN1TE ONE', d: 'text', max: 120 },
        { k: 'case_5_p', n: 'Thẻ 5 — mô tả', d: 'area', rows: 4, max: 700 },
        { k: 'case_6_tag', n: 'Thẻ 6 — nhãn', g: 'Culture as Infrastructure', d: 'text', max: 60 },
        { k: 'case_6_title', n: 'Thẻ 6 — tiêu đề', g: 'Câu dài về văn hóa tổ chức', d: 'text', max: 300 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'people', ten: 'People Leadership', nhom: 'Bền vững',
      moTa: 'Phần nói về việc xây dựng đội ngũ.',
      fields: [
        { k: 'people_eyebrow', n: 'Nhãn nhỏ', g: 'People Leadership', d: 'text', max: 60 },
        { k: 'people_title_1', n: 'Tiêu đề dòng 1', g: 'Growth', d: 'text', max: 40 },
        { k: 'people_title_2', n: 'Tiêu đề dòng 2', g: 'through', d: 'text', max: 40 },
        { k: 'people_title_3', n: 'Tiêu đề dòng 3', g: 'people.', d: 'text', max: 40 },
        { k: 'people_quote', n: 'Câu trích dẫn', g: '“Một tổ chức chỉ thật sự lớn lên khi...”', d: 'area', rows: 3, max: 500 },
        { k: 'people_p', n: 'Đoạn giải thích', d: 'area', rows: 4, max: 700 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'point-of-view', ten: 'Point of View', nhom: 'Bền vững',
      moTa: 'Bốn niềm tin cá nhân. Nền giấy sáng, chữ dùng màu nâu hổ phách.',
      fields: [
        { k: 'pov_eyebrow', n: 'Nhãn nhỏ', g: 'Point of View', d: 'text', max: 40 },
        { k: 'pov_title_1', n: 'Tiêu đề dòng 1', g: 'WHAT', d: 'text', max: 40 },
        { k: 'pov_title_2', n: 'Tiêu đề dòng 2', g: 'I BELIEVE.', d: 'text', max: 60 },
        { k: 'pov_p', n: 'Đoạn dẫn', d: 'area', rows: 3, max: 700 },
        { k: 'pov_1', n: 'Niềm tin 1', d: 'area', rows: 2, max: 400 },
        { k: 'pov_2', n: 'Niềm tin 2', d: 'area', rows: 2, max: 400 },
        { k: 'pov_3', n: 'Niềm tin 3', d: 'area', rows: 2, max: 400 },
        { k: 'pov_4', n: 'Niềm tin 4', d: 'area', rows: 2, max: 400 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'beyond-office', ten: 'Beyond The Office', nhom: 'Bền vững',
      moTa: 'Khoảnh khắc đời thường. Ảnh nền là ảnh chụp ngoài phố.',
      fields: [
        { k: 'life_eyebrow', n: 'Nhãn nhỏ', g: 'Beyond The Office', d: 'text', max: 60 },
        { k: 'life_title_1', n: 'Tiêu đề dòng 1', g: 'The human', d: 'text', max: 60 },
        { k: 'life_title_2', n: 'Tiêu đề dòng 2', g: 'side.', d: 'text', max: 60 },
        { k: 'life_p', n: 'Đoạn giải thích', d: 'area', rows: 4, max: 700 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'moments', ten: 'Selected Moments', nhom: 'Bền vững',
      moTa: 'Lưới ảnh 5 tấm. Phần này chỉ sửa được chữ, ảnh sửa ở tab Hình ảnh.',
      fields: [
        { k: 'gallery_eyebrow', n: 'Nhãn nhỏ', g: 'Selected Moments', d: 'text', max: 60 },
        { k: 'gallery_title_1', n: 'Tiêu đề dòng 1', g: 'Work.', d: 'text', max: 40 },
        { k: 'gallery_title_2', n: 'Tiêu đề dòng 2', g: 'Life.', d: 'text', max: 40 },
        { k: 'gallery_title_3', n: 'Tiêu đề dòng 3', g: 'Motion.', d: 'text', max: 40 },
        { k: 'gallery_p', n: 'Đoạn dẫn', d: 'area', rows: 3, max: 700 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'next-chapter', ten: 'The Next Chapter', nhom: 'Bền vững',
      moTa: 'Phần kết trước liên hệ.',
      fields: [
        { k: 'next_eyebrow', n: 'Nhãn nhỏ', g: 'The Next Chapter', d: 'text', max: 60 },
        { k: 'next_title_1', n: 'Tiêu đề dòng 1', g: 'Building', d: 'text', max: 40 },
        { k: 'next_title_2', n: 'Tiêu đề dòng 2', g: 'what people', d: 'text', max: 40 },
        { k: 'next_title_3', n: 'Tiêu đề dòng 3', g: 'can grow with.', d: 'text', max: 60 },
        { k: 'next_quote', n: 'Câu trích dẫn', d: 'area', rows: 3, max: 700 },
        { k: 'next_p', n: 'Đoạn giải thích', d: 'area', rows: 3, max: 700 }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'connect', ten: 'Liên hệ', nhom: 'Kết nối',
      moTa: 'Phần cuối cùng.',
      fields: [
        { k: 'contact_eyebrow', n: 'Nhãn nhỏ', g: 'Partnership · Speaking · Business', d: 'text', max: 120 },
        { k: 'contact_title', n: 'Tiêu đề lớn', g: 'Hãy kết nối.', d: 'text', max: 100 },
        { k: 'contact_p', n: 'Đoạn giải thích', d: 'area', rows: 3, max: 700 },
        { k: 'contact_btn', n: 'Chữ trên nút tròn', g: 'Liên hệ', d: 'text', max: 40 },
        { k: 'footer_tagline', n: 'Dòng giới thiệu ở chân trang', g: 'The Visionary Operator...', d: 'area', rows: 2, max: 400 },
        { k: 'footer_copy', n: 'Dòng bản quyền', g: '© 2026 Koko Linh. All rights reserved.', d: 'text', max: 200 }
      ]
    }

  ]
};

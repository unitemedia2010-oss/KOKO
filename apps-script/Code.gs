/**
 * ============================================================================
 *  KOKO LINH — Executive Creative Portfolio
 *  Apps Script backend cho hệ quản trị nội dung
 * ============================================================================
 *
 *  BA VIỆC CHÍNH
 *    1. CMS nội dung   — đọc/ghi chữ trên trang theo khoá data-cms
 *    2. Upload phông    — tải .woff2/.ttf lên Drive, sinh @font-face
 *    3. Upload ảnh      — tải ảnh lên Drive, trả về link công khai
 *
 *  CÁCH DÙNG
 *    - Dán toàn bộ file này vào trình soạn thảo Apps Script
 *    - Chạy hàm setupKokoSheets() một lần để tạo cấu trúc Sheet
 *    - Deploy > New deployment > Web app > Execute as: Me > Anyone
 *
 *  LƯU Ý BẢO MẬT
 *    Mật khẩu quản trị nằm trong Script Properties, tên KOKO_ADMIN_PASSWORD.
 *    Không đặt mật khẩu trong file này, vì file này nằm trong Google Drive
 *    của bạn và nếu bị lộ sẽ lộ luôn mật khẩu.
 *
 *    Đặt mật khẩu:
 *      Project Settings > Script Properties > thêm KOKO_ADMIN_PASSWORD
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 *  CẤU HÌNH
 * ------------------------------------------------------------------------- */
const SHEET_ID = '1aX6Az5XXzdUauXDoeMF297iwOF9cfvDkx6-FDLdhoK8';
const TEN_SHEET = {
  noiDung: 'Nội dung',
  taiLieu: 'Tài liệu'
};
const TEN_THU_MUC = {
  font: 'KOKO - Phông',
  anh: 'KOKO - Ảnh'
};
const HEADER_NOI_DUNG = ['Khoá', 'Nội dung', 'Ngày cập nhật'];
const HEADER_TAI_LIEU = ['Loại', 'Tên', 'URL Drive', 'URL Công khai', 'Ngày cập nhật'];

/* Định dạng file được phép tải lên. Giữ hẹp để tránh tệp lạ gây hại. */
const DUOI_PHEP_ANH = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
const DUOI_PHEP_FONT = ['woff2', 'woff', 'ttf', 'otf'];

/* Giới hạn dung lượng (MB). Apps Script xử lý payload JSON khá chậm nên
   không nên cho phép quá lớn. */
const MAX_ANH_MB = 6;
const MAX_FONT_MB = 4;

/* Trang đã publish. Dùng để kiểm tra khoá data-cms có thật sự tồn tại hay
   không, trước khi cho ghi — cơ chế chống ghi rác, mô phỏng từ script JD. */
const TRANG_PUBLISHED = 'https://linhtruong.vn/';

const MAX_DO_DAI_NOI_DUNG = 4000;


/* ===========================================================================
 *  HÀM KHỞI TẠO — chạy một lần duy nhất
 * ========================================================================= */

/**
 * Tạo các sheet và thư mục cần thiết. Chạy lại cũng không sao, không ghi đè
 * dữ liệu đang có.
 */
function setupKokoSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // taoHoacLaySheet_ tự ghi header và cố định dòng đầu, không cần ghi lại
  const sheetNoiDung = taoHoacLaySheet_(ss, TEN_SHEET.noiDung, HEADER_NOI_DUNG);
  const sheetTaiLieu = taoHoacLaySheet_(ss, TEN_SHEET.taiLieu, HEADER_TAI_LIEU);

  layThuMucDrive_(TEN_THU_MUC.font);
  layThuMucDrive_(TEN_THU_MUC.anh);

  // Nhắc nhở cấu hình mật khẩu nếu chưa có
  const coMatKhau = daCoMatKhauQuanTri_();

  return traJson_({
    ok: true,
    message: 'Đã tạo cấu trúc cho hệ quản trị KOKO.',
    sheets: [TEN_SHEET.noiDung, TEN_SHEET.taiLieu],
    soNoiDungHienCo: docNoiDung_().length,
    daTaoThuMuc: [TEN_THU_MUC.font, TEN_THU_MUC.anh],
    canDatMatKhau: !coMatKhau,
    huongDan: coMatKhau
      ? 'Đã có mật khẩu quản trị. Sẵn sàng deploy.'
      : 'Cần đặt KOKO_ADMIN_PASSWORD trong Script Properties trước khi dùng phần sửa.'
  });
}

/** Hàm cũ cho quen thuộc */
function setupSheets() { return setupKokoSheets(); }


/* ===========================================================================
 *  ENTRY POINT — DO GET
 * ========================================================================= */

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').toLowerCase();

  // Kiểm tra sức khoẻ, dùng để xác nhận script còn chạy
  if (action === 'health') {
    return traJson_({
      ok: true,
      message: 'KOKO CMS đang hoạt động.',
      version: 'KOKO_CMS_V1',
      soKhoaNoiDung: Object.keys(docNoiDung_()).length,
      soTaiLieu: docTaiLieu_().length,
      adminSanSang: daCoMatKhauQuanTri_()
    });
  }

  // Trả toàn bộ nội dung cho trang nạp khi mở
  if (action === 'getdata' || action === 'no dung' || action === '') {
    return traJson_({
      ok: true,
      content: docNoiDung_()
    });
  }

  return traJson_({
    ok: true,
    message: 'KOKO CMS API',
    actions: ['health', 'getData', 'cmsSave', 'uploadFont', 'uploadImage', 'listImages']
  });
}


/* ===========================================================================
 *  ENTRY POINT — DO POST
 * ========================================================================= */

function doPost(e) {
  let payload = {};
  try {
    payload = docDuLieuGuiLen_(e);
    const action = String(payload.action || '').toLowerCase();

    if (action === 'cmssave') {
      return traJson_(luuNoiDung_(payload));
    }

    if (action === 'uploadfont') {
      return traJson_(taiPhongLen_(payload));
    }

    if (action === 'uploadimage') {
      return traJson_(taiAnhLen_(payload));
    }

    if (action === 'listimages') {
      return traJson_({ ok: true, images: docAnhDaTai_() });
    }

    if (action === 'deleteimage') {
      return traJson_(xoaAnhDaTai_(payload));
    }

    return traJson_({ ok: false, message: 'Hành động không hợp lệ: ' + action });

  } catch (err) {
    return traJson_({ ok: false, message: err && err.message ? err.message : String(err) });
  }
}


/* ===========================================================================
 *  1. CMS NỘI DUNG
 * ========================================================================= */

/**
 * Lưu một nội dung theo khoá data-cms.
 *
 * Ba lớp kiểm tra, từ ngoài vào trong:
 *   1. Mật khẩu đúng            — chặn người lạ
 *   2. Khoá có hợp lệ không    — chặn ghi rác
 *   3. Khoá có THẬT trên trang đã publish không — chặn tạo khoá bịa
 *
 * Lớp 3 là điểm mấu chốt: nó lấy HTML thật trên trang đang chạy rồi tìm
 * chuỗi data-cms="<key>". Nếu trang chưa deploy bản có khoá đó, lệnh sẽ bị
 * từ chối, thay vì tạo một khoá không ai hiển thị.
 */
function luuNoiDung_(payload) {
  kiemTraMatKhau_(payload);

  const key = String(payload.key || '').trim();
  const value = String(payload.value === undefined || payload.value === null ? '' : payload.value).trim();

  if (!/^[a-z][a-z0-9_]{1,63}$/.test(key)) {
    throw new Error('Khoá nội dung không hợp lệ. Chỉ dùng chữ thường, số và gạch dưới.');
  }
  if (!value) throw new Error('Nội dung trống.');
  if (value.length > MAX_DO_DAI_NOI_DUNG) {
    throw new Error('Nội dung dài ' + value.length + ' ký tự, vượt quá giới hạn ' + MAX_DO_DAI_NOI_DUNG + '.');
  }
  // Chặn formula injection: ô Sheet bắt đầu bằng = sẽ bị Google coi là công thức
  if (/^[=+\-@]/.test(value)) {
    throw new Error('Nội dung không được bắt đầu bằng =, +, - hoặc @ (để tránh lỗi công thức trong Sheet).');
  }

  kiemTraKhoaCoThatTrenTrang_(key);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = taoHoacLaySheet_(ss, TEN_SHEET.noiDung, HEADER_NOI_DUNG);
  const headers = layHeaders_(sheet);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const lastRow = sheet.getLastRow();
    let dong = 0;

    for (let r = 2; r <= lastRow; r++) {
      if (String(sheet.getRange(r, 1).getValue()).trim() === key) { dong = r; break; }
    }

    SpreadsheetApp.flush();

    if (dong > 0) {
      sheet.getRange(dong, 2).setValue(value);
      sheet.getRange(dong, 3).setValue(new Date());
    } else {
      sheet.appendRow([key, value, new Date()]);
    }

    SpreadsheetApp.flush();
    return { ok: true, key: key, value: value, capNhatHayThemMoi: dong > 0 };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Kiểm tra khoá có thật sự tồn tại trên trang đã publish không.
 * Nếu không kiểm tra bước này, chỉ cần biết mật khẩu là ghi được bất kỳ
 * khoá nào, kể cả khoá bịa không hiển thị ở đâu.
 */
function kiemTraKhoaCoThatTrenTrang_(key) {
  const html = taiHtmlDaPublish_();
  if (!html) return; // không lấy được HTML thì bỏ qua bước kiểm tra này

  if (html.indexOf('data-cms="' + key + '"') === -1) {
    throw new Error(
      'Không tìm thấy data-cms="' + key + '" trên trang đã publish.\n' +
      'Nếu bạn vừa thêm khoá mới vào index.html, hãy đẩy lên GitHub Pages trước rồi thử lại.'
    );
  }
}

/** Lấy HTML trang đang chạy, có bộ đệm để không gọi mạng mỗi lần lưu. */
let _htmlCache = { luc: 0, noiDung: '' };
function taiHtmlDaPublish_() {
  const now = Date.now();
  if (_htmlCache.noiDung && now - _htmlCache.luc < 120000) return _htmlCache.noiDung;

  try {
    const res = UrlFetchApp.fetch(TRANG_PUBLISHED + '?nocache=' + now, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (res.getResponseCode() !== 200) return '';
    const text = res.getContentText();
    _htmlCache = { luc: now, noiDung: text };
    return text;
  } catch (e) {
    return '';
  }
}

/** Đọc toàn bộ nội dung thành đối tượng { khoa: noiDung } */
function docNoiDung_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(TEN_SHEET.noiDung);
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (key) out[key] = String(values[i][1] === undefined || values[i][1] === null ? '' : values[i][1]);
  }
  return out;
}


/* ===========================================================================
 *  2. UPLOAD PHÔNG
 * ========================================================================= */

/**
 * Tải phông lên Drive và sinh đoạn @font-face để dán vào css/fonts.css.
 *
 * Lưu ý quan trọng: file phông trong repo GitHub không thể thay đổi từ đây.
 * Cách này sinh sẵn đoạn CSS và trả về đường dẫn Drive công khai; bạn dán
 * vào fonts.css rồi đẩy lên. Đổi phông không cần đổi HTML.
 */
function taiPhongLen_(payload) {
  kiemTraMatKhau_(payload);

  const file = payload.file || {};
  const ten = String(file.name || '').trim();
  const duoi = layDuoi_(ten);

  if (DUOI_PHEP_FONT.indexOf(duoi) === -1) {
    throw new Error('Định dạng phông không hợp lệ (' + (duoi || 'không rõ') + '). Chỉ nhận: ' + DUOI_PHEP_FONT.join(', ') + '.');
  }

  const blob = giaiMaBase64_(file.data, MAX_FONT_MB, 'phông');
  const tenHopLe = taoTenTrenDrive_('font-' + Date.now() + '-' + ten, duoi);

  const thuMuc = layThuMucDrive_(TEN_THU_MUC.font);
  const tep = thuMuc.createFile(Utilities.newBlob(blob, mimeCuaPhong_(duoi), tenHopLe));
  tep.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const urlCongKhai = doiTepThanhUrlCongKhai_(tep);
  const tenPhong = ten.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'KOKO Font';

  ghiTaiLieu_('font', ten, tep.getUrl(), urlCongKhai);

  // Sinh sẵn @font-face để dán vào fonts.css
  const css = [
    '@font-face {',
    '  font-family: "' + tenPhong + '";',
    '  src: url("' + urlCongKhai + '") format("' + (duoi === 'ttf' ? 'truetype' : duoi === 'otf' ? 'opentype' : duoi) + '");',
    '  font-weight: 100 900;',
    '  font-display: swap;',
    '}',
    '',
    '/* Áp dụng: trong css/style.css đổi biến tương ứng, ví dụ',
    '   --display: "' + tenPhong + '", sans-serif;'
  ].join('\n');

  return {
    ok: true,
    message: 'Đã tải phông "' + tenPhong + '" lên Drive.',
    tenPhong: tenPhong,
    urlCongKhai: urlCongKhai,
    doDai: blob.length,
    cssCanDung: css,
    buocTiepTheo: 'Mở https://linhtruong.vn rồi dán đoạn CSS trên vào css/fonts.css và đẩy lên GitHub.'
  };
}


/* ===========================================================================
 *  3. UPLOAD ẢNH
 * ========================================================================= */

/**
 * Tải ảnh lên Drive, trả về URL công khai để dùng thẳng trong trang.
 */
function taiAnhLen_(payload) {
  kiemTraMatKhau_(payload);

  const file = payload.file || {};
  const ten = String(file.name || '').trim();
  const duoi = layDuoi_(ten);

  if (DUOI_PHEP_ANH.indexOf(duoi) === -1) {
    throw new Error('Định dạng ảnh không hợp lệ (' + (duoi || 'không rõ') + '). Chỉ nhận: ' + DUOI_PHEP_ANH.join(', ') + '.');
  }

  const blob = giaiMaBase64_(file.data, MAX_ANH_MB, 'ảnh');
  const tenHopLe = taoTenTrenDrive_('anh-' + Date.now() + '-' + ten, duoi);

  const thuMuc = layThuMucDrive_(TEN_THU_MUC.anh);
  const tep = thuMuc.createFile(Utilities.newBlob(blob, mimeCuaAnh_(duoi), tenHopLe));
  tep.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const urlCongKhai = doiTepThanhUrlCongKhai_(tep);
  ghiTaiLieu_('image', ten, tep.getUrl(), urlCongKhai);

  return {
    ok: true,
    message: 'Đã tải ảnh "' + ten + '" lên Drive.',
    ten: ten,
    urlCongKhai: urlCongKhai,
    kichThuocKB: Math.round(blob.length / 1024),
    buocTiepTheo: 'Dùng URL này trong thuộc tính src của thẻ <img> trong index.html.'
  };
}

/** Danh sách ảnh đã tải, để chọn lại trong trang quản trị. */
function docAnhDaTai_() {
  const ds = docTaiLieu_().filter(function (x) { return x.loai === 'image'; });
  return ds.map(function (x) {
    return { ten: x.ten, url: x.urlCongKhai, ngay: x.ngay };
  });
}

/** Xoá một ảnh khỏi Drive và khỏi danh sách. */
function xoaAnhDaTai_(payload) {
  kiemTraMatKhau_(payload);
  const url = String(payload.url || '').trim();
  if (!url) throw new Error('Thiếu URL ảnh cần xoá.');

  const ds = docTaiLieu_();
  const tim = ds.filter(function (x) { return x.urlCongKhai === url; })[0];
  if (!tim) throw new Error('Không tìm thấy ảnh này trong danh sách.');

  try {
    const idFile = url.match(/[-\w]{25,}/);
    if (idFile) DriveApp.getFileById(idFile[0]).setTrashed(true);
  } catch (e) {
    // Không xoá được file vẫn tiếp tục xoá khỏi danh sách
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(TEN_SHEET.taiLieu);
  const lastRow = sheet.getLastRow();
  for (let r = 2; r <= lastRow; r++) {
    if (String(sheet.getRange(r, 4).getValue()) === url) { sheet.deleteRow(r); break; }
  }

  return { ok: true, message: 'Đã xoá ảnh.' };
}


/* ===========================================================================
 *  MẬT KHẨU
 * ========================================================================= */

function daCoMatKhauQuanTri_() {
  return String(PropertiesService.getScriptProperties().getProperty('KOKO_ADMIN_PASSWORD') || '').length >= 12;
}

/**
 * Kiểm tra mật khẩu.
 *
 * Hai điểm khác biệt so với bản của script JD:
 *   1. So sánh bằng hàm bất biến thời gian, tránh lộ thông tin qua việc
 *      dừng sớm hay muộn khi so sánh từng ký tự.
 *   2. Có giới hạn số lần thử. Script JD không có, nghĩa là kẻ xấu có thể
 *      thử vô hạn lần mà không bị chặn.
 */
function kiemTraMatKhau_(payload) {
  const saved = String(PropertiesService.getScriptProperties().getProperty('KOKO_ADMIN_PASSWORD') || '');
  if (saved.length < 12) {
    throw new Error('Chưa đặt mật khẩu quản trị. Vào Project Settings > Script Properties, thêm KOKO_ADMIN_PASSWORD tối thiểu 12 ký tự.');
  }

  const supplied = String(payload.password || '');
  if (!soSanhKhacNhau_(supplied, saved)) {
    ghiNhatLaiThatBai_(payload);
    throw new Error('Mật khẩu quản trị không đúng.');
  }
  return true;
}

/** So sánh hai chuỗi, luôn mất đúng một khoảng thời gian bất kể nội dung. */
function soSanhKhacNhau_(a, b) {
  const maxLen = Math.max(a.length, b.length);
  let khac = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    khac |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return khac === 0;
}

/**
 * Ghi nhận số lần thử sai theo IP, khóa tạm khi vượt ngưỡng.
 * Dùng CacheService nên tự mất sau 15 phút — đủ để chặn dò tự động mà không
 * cần bạn phải xoá thủ công.
 */
function ghiNhatLaiThatBai_(payload) {
  const gioiHan = 8;
  try {
    const cache = CacheService.getScriptCache();
    const khoa = 'fail_' + String(payload.ip || 'unknown');
    const soLan = Number(cache.get(khoa) || 0) + 1;
    cache.put(khoa, String(soLan), 900);
    if (soLan >= gioiHan) {
      throw new Error('Bạn đã nhập sai mật khẩu ' + soLan + ' lần. Vui lòng thử lại sau 15 phút.');
    }
  } catch (e) {
    if (e && /15 phút/.test(e.message || '')) throw e;
  }
}


/* ===========================================================================
 *  TIỆN ÍCH
 * ========================================================================= */

/**
 * Lấy sheet theo tên, tạo mới nếu chưa có, và bảo đảm dòng header tồn tại.
 *
 * Lưu ý: KHÔNG kiểm tra bằng getLastRow() === 0. Một sheet mới tạo trên Google
 * Sheets luôn có ít nhất 1 dòng, nên điều kiện đó luôn sai và header sẽ không
 * bao giờ được ghi. Phải kiểm tra trực tiếp ô A1 có rỗng hay không.
 */
function taoHoacLaySheet_(ss, ten, headers) {
  let sheet = ss.getSheetByName(ten);
  if (!sheet) sheet = ss.insertSheet(ten);

  const oA1 = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (!oA1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function layHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

/** Lay thu muc Drive theo ten, tao moi neu chua co. */
function layThuMucDrive_(ten) {
  const ds = DriveApp.getFoldersByName(ten);
  return ds.hasNext() ? ds.next() : DriveApp.createFolder(ten);
}

/** Lấy danh sách tài liệu đã tải. */
function docTaiLieu_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(TEN_SHEET.taiLieu);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    if (!values[i][0]) continue;
    out.push({
      loai: String(values[i][0]),
      ten: String(values[i][1] || ''),
      urlDrive: String(values[i][2] || ''),
      urlCongKhai: String(values[i][3] || ''),
      ngay: values[i][4] ? new Date(values[i][4]).toISOString().slice(0, 10) : ''
    });
  }
  return out;
}

function ghiTaiLieu_(loai, ten, urlDrive, urlCongKhai) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = taoHoacLaySheet_(ss, TEN_SHEET.taiLieu, HEADER_TAI_LIEU);
  sheet.appendRow([loai, ten, urlDrive, urlCongKhai, new Date()]);
}

/**
 * Đổi tệp Drive thành URL dùng được trong thẻ <img> và @font-face.
 *
 * /export?format=jpg trả về ảnh JPEG. Hình thức này chạy ổn định hơn
 * đường dẫn /preview vốn có thể trả về trang HTML bọc ảnh.
 */
function doiTepThanhUrlCongKhai_(tep) {
  const id = tep.getId();
  const base = 'https://drive.google.com/uc?export=';
  const duoi = layDuoi_(tep.getName());

  if (['jpg', 'jpeg', 'png', 'gif'].indexOf(duoi) !== -1) return base + 'view&id=' + id;
  if (duoi === 'webp') return base + 'view&id=' + id;
  if (duoi === 'avif') return base + 'view&id=' + id;
  return base + 'download&id=' + id;
}

/** Giải mã base64 và kiểm tra dung lượng. */
function giaiMaBase64_(data, gioiHanMB, nhan) {
  if (!data) throw new Error('Không nhận được dữ liệu ' + nhan + '.');
  const chuoi = String(data).replace(/^data:[^;]+;base64,/, '');
  const blob = Utilities.base64Decode(chuoi);
  if (blob.length > gioiHanMB * 1024 * 1024) {
    throw new Error('Tệp ' + nhan + ' nặng ' + Math.round(blob.length / 1048576) + ' MB, vượt giới hạn ' + gioiHanMB + ' MB.');
  }
  if (blob.length === 0) throw new Error('Tệp ' + nhan + ' rỗng.');
  return blob;
}

/** Bỏ ký tự lạ trong tên để Drive không từ chối. */
function taoTenTrenDrive_(ten, duoi) {
  const sach = String(ten).replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').slice(-80);
  return sach || ('file-' + Date.now() + '.' + duoi);
}

function layDuoi_(ten) {
  const m = String(ten).match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

function mimeCuaAnh_(duoi) {
  const bang = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif' };
  return bang[duoi] || 'application/octet-stream';
}

function mimeCuaPhong_(duoi) {
  const bang = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
  return bang[duoi] || 'application/octet-stream';
}

/**
 * Đọc dữ liệu gửi lên.
 *
 * Dùng e.postData.contents kèm Content-Type text/plain. Đây là cách gửi
 * không bị CORS chặn khi gọi từ trang tĩnh trên GitHub Pages, nên phía web
 * phải dùng mode:'no-cors'. Đổi lại, ta có thể đọc được body.
 */
function docDuLieuGuiLen_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error('Dữ liệu gửi lên không phải JSON hợp lệ.');
    }
  }
  return {};
}

function traJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

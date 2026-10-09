/**
 * Mo phong moi truong Apps Script de kiem tra logic cua Code.gs
 * ------------------------------------------------------------------
 * Apps Script khong chay duoc tren may, nen bo phan mo phong lai
 * SpreadsheetApp, DriveApp, CacheService, Utilities... roi chay tung ham.
 *
 * Muc dich: bat loi truoc khi ban dan code nay len Google.
 *
 * Chay: node tools/kiem-tra-apps-script.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ======================================================================
   1. BO KHUNG MO PHONG
   ====================================================================== */
const bang = {};          // id -> { ten, duLieu: [][] }
const thuMuc = {};        // ten -> { tep: [] }
const properties = {};
const cache = {};

function taoSheet(ten, headers) {
  if (!bang[ten]) bang[ten] = { ten, duLieu: [] };
  if (bang[ten].duLieu.length === 0) bang[ten].duLieu.push(headers.slice());
  return bang[ten];
}

/**
 * Đối tượng Sheet mô phỏng đủ các hàm Code.gs dùng tới.
 * Dữ liệu nằm trong bang[ten].duLieu, mỗi hàng là một mảng.
 */
function oHang(ten) {
  const duLieu = () => bang[ten].duLieu;
  const baoDam = (hang) => { while (duLieu().length < hang) duLieu().push([]); };

  const range = (hang, cot, soHang, soCot) => ({
    setValues(v) {
      baoDam(hang);
      for (let i = 0; i < soHang; i++) duLieu()[hang - 1 + i] = v[i].slice();
    },
    getValues() {
      const out = [];
      for (let i = 0; i < soHang; i++) {
        const dong = duLieu()[hang - 1 + i] || [];
        const r = [];
        for (let j = 0; j < soCot; j++) r.push(dong[cot - 1 + j] === undefined ? '' : dong[cot - 1 + j]);
        out.push(r);
      }
      return out;
    },
    setValue(v) { baoDam(hang); duLieu()[hang - 1][cot - 1] = v; },
    getValue() { const d = duLieu()[hang - 1] || []; return d[cot - 1] === undefined ? '' : d[cot - 1]; },
    setNumberFormat() { return this; }
  });

  return {
    ten: ten,
    getLastRow() { return duLieu().length; },
    getLastColumn() {
      let max = 0;
      duLieu().forEach(r => { if (r.length > max) max = r.length; });
      return max || 1;
    },
    getRange(h, c, sh, sc) { return range(h, c, sh || 1, sc || 1); },
    getDataRange() {
      const soHang = Math.max(1, duLieu().length);
      const soCot = this.getLastColumn();
      return range(1, 1, soHang, soCot);
    },
    setFrozenRows() {},
    appendRow(hang) {
      duLieu().push(hang.slice());
      SpreadsheetApp.flush();
    },
    deleteRow(hang) { duLieu().splice(hang - 1, 1); }
  };
}

const SpreadsheetApp = {
  openById(id) {
    return {
      getSheetByName(ten) { return bang[ten] ? oHang(ten) : null; },
      insertSheet(ten) { return oHang(taoSheet(ten, []).ten); }
    };
  }
};

const DriveApp = {
  Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
  Permission: { VIEW: 'VIEW' },
  createFolder(ten) { thuMuc[ten] = thuMuc[ten] || { tep: [] }; return { ten, getFolders: () => [] }; },
  getFoldersByName(ten) {
    if (!thuMuc[ten]) return { hasNext: () => false };
    const f = { ten, createFile: (blob) => {
        const t = { id: 'ID' + Math.random().toString(36).slice(2, 12), name: blob.name,
                    getId: () => t.id, getUrl: () => 'https://drive.google.com/file/d/' + t.id,
                    getName: () => blob.name, setSharing: () => t };
        thuMuc[ten].tep.push(t); return t;
      } };
    return { hasNext: () => true, next: () => f };
  },
  getFileById(id) { return { setTrashed: () => {} }; }
};

const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) => properties[k] || null,
    setProperty: (k, v) => { properties[k] = v; }
  })
};

const CacheService = {
  getScriptCache: () => ({
    get: (k) => cache[k] || null,
    put: (k, v) => { cache[k] = v; }
  })
};

const ContentService = {
  MimeType: { JSON: 'application/json', JAVASCRIPT: 'text/javascript' },
  createTextOutput(s) { return { noiDung: s, setMimeType() { return this; } }; }
};

const Utilities = {
  base64Decode: (s) => Buffer.from(s, 'base64'),
  newBlob: (bytes, mime, name) => ({ bytes, mime, name })
};

const LockService = {
  getScriptLock: () => ({ waitLock() {}, releaseLock() {} })
};

const UrlFetchApp = {
  fetch() { return { getResponseCode: () => 404, getContentText: () => '' }; }
};

const SpreadsheetApp_flush = { flush() {} };
SpreadsheetApp.flush = SpreadsheetApp_flush.flush;

/* ======================================================================
   2. NAP CODE VAO MOI TRUONG
   ====================================================================== */
const maNguon = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');

const sandbox = {
  SpreadsheetApp, DriveApp, PropertiesService, CacheService,
  ContentService, Utilities, LockService, UrlFetchApp,
  console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
  isFinite, parseInt, parseFloat, Buffer
};
vm.createContext(sandbox);
vm.runInContext(maNguon, sandbox, { filename: 'Code.gs' });

/* ======================================================================
   3. CAC BO KIEM TRA
   ====================================================================== */
let pass = 0, fail = 0;
function kiem(ten, ham) {
  try { ham(); console.log('  OK   ' + ten); pass++; }
  catch (e) { console.log('  LOI  ' + ten + '\n        ' + e.message); fail++; }
}
function doiChieu(thucTe, mongDoi, nhan) {
  if (thucTe !== mongDoi) throw new Error((nhan || '') + ' — mong doi "' + mongDoi + '", nhan "' + thucTe + '"');
}
function phaiNém(thucTe, chuoiKy, nhan) {
  try { thucTe(); } catch (e) {
    if (chuoiKy && e.message.indexOf(chuoiKy) === -1) {
      throw new Error((nhan || '') + ' — nem loi sai: "' + e.message + '", mong doi co "' + chuoiKy + '"');
    }
    return;
  }
  throw new Error((nhan || '') + ' — phai nem loi nhung khong nem');
}

/* Lay noi dung JSON tu ket qua traJson_ */
function jsonCua(x) { return JSON.parse(x.noiDung); }

/* Các hàm upload trả về đối tượng thường; phải đi qua doPost mới nhận JSON.
   doPost là hàm duy nhất mà web thật sự gọi. */
function post(action, them) {
  const payload = Object.assign({ action: action, password: MAT_KHAU }, them || {});
  return jsonCua(sandbox.doPost({ postData: { contents: JSON.stringify(payload) } }));
}

const MAT_KHAU = 'matkhauquantri123456';
/* 3 KB: vua du de kiem tra kich thuoc, vua nho de chay nhanh */
const b64Anh = Buffer.alloc(3072, 7).toString('base64');
const b64Font = Buffer.alloc(512, 3).toString('base64');

console.log('\n=== 1. Khoi tao ===');

kiem('setupKokoSheets() tao duoc 2 sheet', () => {
  const r = jsonCua(sandbox.setupKokoSheets());
  doiChieu(r.ok, true, 'ok');
  doiChieu(r.sheets.length, 2, 'so sheet');
  doiChieu(r.canDatMatKhau, true, 'chua co mat khau');
});

kiem('chua co mat khau thi lenh save bi chan', () => {
  phaiNém(() => sandbox.luuNoiDung_({ key: 'hero_kicker', value: 'x', password: MAT_KHAU }),
    'Chưa đặt mật khẩu');
});

console.log('\n=== 2. Xac thuc mat khau ===');

properties.KOKO_ADMIN_PASSWORD = MAT_KHAU;
kiem('mat khau sai bi chan', () => {
  phaiNém(() => sandbox.luuNoiDung_({ key: 'hero_kicker', value: 'x', password: 'sai' }),
    'không đúng');
});

kiem('mat khau dung thi qua kiem tra', () => {
  const r = sandbox.kiemTraMatKhau_({ password: MAT_KHAU });
  doiChieu(r, true, 'ket qua kiem tra');
});

kiem('sau 8 lan sai thi khoa tam thoi', () => {
  for (let i = 0; i < 7; i++) {
    try { sandbox.kiemTraMatKhau_({ password: 'sai' }); } catch (e) { /* mong doi nem loi */ }
  }
  phaiNém(() => sandbox.kiemTraMatKhau_({ password: 'sai' }), '15 phút', 'lan thu 8');
});

kiem('xoa ban ghi that bai de test tiep theo khong bi khoa', () => {
  Object.keys(cache).forEach(k => delete cache[k]);
});

console.log('\n=== 3. Luu noi dung ===');

kiem('key khong hop le bi chan', () => {
  ['XOAHOA', 'co khoang trang', 'co-dau-2', 'a', '123abc', 'co!ky_tu'].forEach(k => {
    phaiNém(() => sandbox.luuNoiDung_({ key: k, value: 'x', password: MAT_KHAU }),
      'Khoá nội dung không hợp lệ', 'key "' + k + '"');
  });
});

kiem('gia tri rong bi chan', () => {
  phaiNém(() => sandbox.luuNoiDung_({ key: 'hero_kicker', value: '   ', password: MAT_KHAU }),
    'Nội dung trống');
});

kiem('gia tri qua dai bi chan', () => {
  phaiNém(() => sandbox.luuNoiDung_({ key: 'hero_kicker', value: 'a'.repeat(4001), password: MAT_KHAU }),
    'vượt quá giới hạn');
});

kiem('formula injection bi chan', () => {
  ['=SUM(A1:A9)', '+1+1', '-1', '@import'].forEach(v => {
    phaiNém(() => sandbox.luuNoiDung_({ key: 'hero_kicker', value: v, password: MAT_KHAU }),
      'tránh lỗi công thức', 'gia tri "' + v + '"');
  });
});

kiem('luu noi dung hop le thanh cong', () => {
  const r = jsonCua(sandbox.doPost({ postData: { contents: JSON.stringify({
    action: 'cmssave', key: 'hero_kicker', value: 'Tổng Giám Đốc · Unite Group', password: MAT_KHAU }) } }));
  doiChieu(r.ok, true, 'ok');
  doiChieu(r.key, 'hero_kicker', 'key');
  doiChieu(r.capNhatHayThemMoi, false, 'lan dau la them moi');
});

kiem('luu lai cung key thi cap nhat khong tao dong moi', () => {
  const r = jsonCua(sandbox.doPost({ postData: { contents: JSON.stringify({
    action: 'cmssave', key: 'hero_kicker', value: 'Chủ tịch', password: MAT_KHAU }) } }));
  doiChieu(r.capNhatHayThemMoi, true, 'phai la cap nhat');
  doiChieu(r.value, 'Chủ tịch', 'gia tri moi');
  doiChieu(jsonCua(sandbox.doGet({ parameter: { action: 'getdata' } })).content.hero_kicker, 'Chủ tịch', 'doc lai');
});

kiem('getdata tra ve dung khong lo thua', () => {
  const r = jsonCua(sandbox.doGet({ parameter: { action: 'getdata' } }));
  doiChieu(r.ok, true, 'ok');
  doiChieu(Object.keys(r.content).length, 1, 'so khoa');
});

kiem('action la bi tu choi', () => {
  const r = jsonCua(sandbox.doPost({ postData: { contents: JSON.stringify({ action: 'xoaHet', password: MAT_KHAU }) } }));
  doiChieu(r.ok, false, 'phai tu choi');
});

console.log('\n=== 4. Upload phong ===');

kiem('dinh dang phong la bi chan', () => {
  ['txt', 'exe', 'js', 'html'].forEach(d => {
    phaiNém(() => sandbox.taiPhongLen_({ password: MAT_KHAU, file: { name: 'x.' + d, data: b64Font } }),
      'Định dạng phông không hợp lệ', 'duoi .' + d);
  });
});

kiem('ten phong khong co duoi bi chan', () => {
  phaiNém(() => sandbox.taiPhongLen_({ password: MAT_KHAU, file: { name: 'khongduoi', data: b64Font } }),
    'Định dạng phông không hợp lệ');
});

kiem('upload woff2 thanh cong, sinh ra duong dan va CSS', () => {
  const r = post('uploadfont', { file: { name: 'Be Vietnam Pro.woff2', data: b64Font } });
  doiChieu(r.ok, true, 'ok');
  doiChieu(r.tenPhong, 'Be Vietnam Pro', 'ten phong');
  if (!/^https:\/\//.test(r.urlCongKhai)) throw new Error('URL cong khai khong hop le: ' + r.urlCongKhai);
  if (r.cssCanDung.indexOf('@font-face') === -1) throw new Error('Chua sinh @font-face');
  if (r.cssCanDung.indexOf('Be Vietnam Pro') === -1) throw new Error('CSS khong chua ten phong');
  if (r.cssCanDung.indexOf('font-display: swap') === -1) throw new Error('Thieu font-display');
});

kiem('duoi .ttf/.otf/.woff cung duoc va sinh CSS dung dinh dang', () => {
  const kyVong = { 'ten.ttf': 'truetype', 'ten.otf': 'opentype', 'ten.woff': 'woff' };
  Object.keys(kyVong).forEach(n => {
    const r = post('uploadfont', { file: { name: n, data: b64Font } });
    doiChieu(r.ok, true, n);
    if (r.cssCanDung.indexOf('format("' + kyVong[n] + '")') === -1) {
      throw new Error(n + ' — CSS phai dung format("' + kyVong[n] + '")');
    }
  });
});

console.log('\n=== 5. Upload anh ===');

kiem('dinh dang anh la bi chan', () => {
  ['svg', 'exe', 'html', 'php'].forEach(d => {
    phaiNém(() => sandbox.taiAnhLen_({ password: MAT_KHAU, file: { name: 'x.' + d, data: b64Anh } }),
      'Định dạng ảnh không hợp lệ', 'duoi .' + d);
  });
});

kiem('upload webp thanh cong', () => {
  const r = post('uploadimage', { file: { name: 'anh chinh.webp', data: b64Anh } });
  doiChieu(r.ok, true, 'ok');
  doiChieu(r.ten, 'anh chinh.webp', 'ten');
  if (!r.urlCongKhai.match(/^https:\/\//)) throw new Error('URL khong hop le');
  // Dung du lieu du lon de kich thuoc lam tron ra > 0
  doiChieu(r.kichThuocKB, 3, 'kich thuoc phai la 3KB');
});

kiem('danh sach anh da tai co du lieu', () => {
  const r = post('listimages');
  doiChieu(r.ok, true, 'ok');
  if (!r.images.length) throw new Error('Khong co anh nao');
  if (!r.images[0].url) throw new Error('anh dau thieu url');
});

kiem('upload anh khong can mat khau thi bi chan', () => {
  phaiNém(() => sandbox.taiAnhLen_({ file: { name: 'x.png', data: b64Anh } }), 'không đúng');
});

kiem('du lieu gui len hong JSON thi tra loi ma khong lam hong trang', () => {
  const r = jsonCua(sandbox.doPost({ postData: { contents: 'day khong phai json' } }));
  doiChieu(r.ok, false, 'phai bao loi');
  if (r.message.indexOf('JSON') === -1) throw new Error('thong bao loi khong ro rang: ' + r.message);
});

console.log('\n=== 6. Kiem tra doGet khong loi ===');

kiem('doGet mac dinh tra ve JSON hop le', () => {
  const r = jsonCua(sandbox.doGet({}));
  doiChieu(r.ok, true, 'ok');
});

kiem('health bao so luong dung', () => {
  const r = jsonCua(sandbox.doGet({ parameter: { action: 'health' } }));
  doiChieu(r.ok, true, 'ok');
  doiChieu(r.adminSanSang, true, 'da co mat khau');
  doiChieu(r.soKhoaNoiDung, 1, 'so khoa noi dung');
});

kiem('action la bi tu choi, khong loi', () => {
  const r = jsonCua(sandbox.doGet({ parameter: { action: 'xyz' } }));
  doiChieu(r.ok, true, 'van tra ve duoc');
});

console.log('\n' + '='.repeat(52));
console.log('  Dat: ' + pass + '   |   Loi: ' + fail);
console.log('='.repeat(52) + '\n');
process.exit(fail === 0 ? 0 : 1);

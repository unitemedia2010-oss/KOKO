/**
 * Kiểm tra phần JSONP mới trong Code.gs
 * ------------------------------------------------------------------
 * Trang admin gọi Apps Script bằng JSONP vì khác origin. Nếu phần này sai,
 * trang quản trị không đăng nhập được dù backend vẫn chạy.
 *
 * Kiểm tra:
 *   - Có callback hợp lệ thì bọc đúng, trả kiểu application/javascript
 *   - Không có callback thì vẫn trả JSON thuần
 *   - Tên callback lạ (chứa dấu ngoặc, ký tự lạ) thì KHÔNG bọc, để tránh
 *     chèn mã tuỳ ý vào phản hồi
 *   - Các action ghi đọc được payload trên URL
 *
 * Chạy: node tools/kiem-tra-jsonp.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---- Mô phỏng Apps Script ---- */
const bang = {}, thuMuc = {}, properties = {}, cache = {};

function taoSheet(t, h) {
  if (!bang[t]) bang[t] = { ten: t, duLieu: [] };
  if (!bang[t].duLieu.length) bang[t].duLieu.push(h.slice());
  return bang[t];
}
function oHang(ten) {
  const d = () => bang[ten].duLieu;
  const bd = (h) => { while (d().length < h) d().push([]); };
  const range = (h, c, sh, sc) => ({
    setValues(v) { bd(h); for (let i = 0; i < sh; i++) d()[h - 1 + i] = v[i].slice(); },
    getValues() {
      const o = [];
      for (let i = 0; i < sh; i++) {
        const r = d()[h - 1 + i] || []; const x = [];
        for (let j = 0; j < sc; j++) x.push(r[c - 1 + j] === undefined ? '' : r[c - 1 + j]);
        o.push(x);
      }
      return o;
    },
    setValue(v) { bd(h); d()[h - 1][c - 1] = v; },
    getValue() { const r = d()[h - 1] || []; return r[c - 1] === undefined ? '' : r[c - 1]; },
    setNumberFormat() { return this; }
  });
  return {
    ten,
    getLastRow() { return d().length; },
    getLastColumn() { let m = 0; d().forEach(r => { if (r.length > m) m = r.length; }); return m || 1; },
    getRange(h, c, sh, sc) { return range(h, c, sh || 1, sc || 1); },
    getDataRange() { return range(1, 1, Math.max(1, d().length), this.getLastColumn()); },
    setFrozenRows() {},
    appendRow(r) { d().push(r.slice()); },
    deleteRow(h) { d().splice(h - 1, 1); }
  };
}

const SpreadsheetApp = {
  openById() {
    return { getSheetByName: t => bang[t] ? oHang(t) : null, insertSheet: t => oHang(taoSheet(t, []).ten) };
  }
};
SpreadsheetApp.flush = () => {};

const DriveApp = {
  Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 },
  createFolder(t) { thuMuc[t] = { tep: [] }; return {}; },
  getFoldersByName(t) {
    if (!thuMuc[t]) return { hasNext: () => false };
    const f = {
      ten: t,
      createFile(b) {
        const x = { id: 'ID' + Math.random().toString(36).slice(2, 11), name: b.name,
          getId: () => x.id, getUrl: () => 'https://drive.google.com/file/d/' + x.id,
          getName: () => b.name, setSharing: () => x };
        thuMuc[t].tep.push(x);
        return x;
      }
    };
    return { hasNext: () => true, next: () => f };
  },
  getFileById() { return { setTrashed() {} }; }
};

const sandbox = {
  SpreadsheetApp, DriveApp,
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => properties[k] || null }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
  ContentService: {
    MimeType: { JSON: 'application/json', JAVASCRIPT: 'text/javascript' },
    createTextOutput(s) { return { noiDung: s, mime: '', setMimeType(m) { this.mime = m; return this; } }; }
  },
  Utilities: { base64Decode: s => Buffer.from(s, 'base64'), newBlob: (b, m, n) => ({ bytes: b, mime: m, name: n }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  UrlFetchApp: { fetch() { return { getResponseCode: () => 404, getContentText: () => '' }; } },
  console, Date, Math, JSON, String, Number, Array, Object, RegExp, Error,
  isFinite, parseInt, parseFloat, Buffer
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'),
  sandbox, { filename: 'Code.gs' });

sandbox.setupKokoSheets();
properties.KOKO_ADMIN_PASSWORD = 'matkhauquantri123456';
const MK = 'matkhauquantri123456';

/* ---- Bộ kiểm tra ---- */
let pass = 0, fail = 0;
function kiem(ten, ham) {
  try { ham(); console.log('  OK   ' + ten); pass++; }
  catch (e) { console.log('  LOI  ' + ten + '\n        ' + e.message); fail++; }
}
function doiChieu(thucTe, mongDoi, nhan) {
  if (thucTe !== mongDoi) throw new Error((nhan || '') + ' — mong doi "' + mongDoi + '", nhan "' + thucTe + '"');
}
function goi(prm, postData) {
  const e = { parameter: prm || {} };
  if (postData) e.postData = { contents: JSON.stringify(postData) };
  return sandbox.doGet(e);
}

console.log('\n=== 1. traKiemTra_ — boc JSONP ===');

kiem('co callback hop le: boc dung va tra application/javascript', () => {
  const r = goi({ action: 'getdata', callback: '__kokoCb123' });
  doiChieu(r.mime, 'text/javascript', 'mime type');
  if (!r.noiDung.startsWith('__kokoCb123(')) throw new Error('khong boc callback: ' + r.noiDung.slice(0, 50));
  if (!r.noiDung.endsWith(');')) throw new Error('thieu dau ket thuc ");": ' + r.noiDung.slice(-20));
});

kiem('du lieu ben trong JSONP phai parse duoc', () => {
  const r = goi({ action: 'getdata', callback: 'cb' });
  const json = r.noiDung.replace(/^cb\(/, '').replace(/\);$/, '');
  const o = JSON.parse(json);
  doiChieu(o.ok, true, 'ok');
});

kiem('khong co callback: tra JSON thuan', () => {
  const r = goi({ action: 'getdata' });
  doiChieu(r.mime, 'application/json', 'mime type');
  const o = JSON.parse(r.noiDung);
  doiChieu(o.ok, true, 'ok');
});

kiem('callback chua ky tu la: KHONG boc, de tranh inject ma', () => {
  const xau = ['alert(1)', 'a;b', 'a b', 'a-b', '1abc', 'a()', '"><script>', 'a[0]', '', 'x'.repeat(80)];
  xau.forEach(function (cb) {
    const r = goi({ action: 'getdata', callback: cb });
    if (r.mime === 'text/javascript') {
      throw new Error('callback "' + cb.slice(0, 20) + '" da bi chap nhan — nguy hiem');
    }
  });
});

kiem('callback hop le duoc chap nhan', () => {
  ['cb', '_cb', '$cb', '__kokoCb', 'a1', 'myFunc_1', 'window.cb'].forEach(function (cb) {
    const r = goi({ action: 'getdata', callback: cb });
    doiChieu(r.mime, 'text/javascript', 'callback "' + cb + '" phai duoc chap nhan');
  });
});

console.log('\n=== 2. doGet xu ly cac action ===');

kiem('health tra ve thong tin khoe', () => {
  const r = goi({ action: 'health', callback: 'cb' });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok');
  doiChieu(o.adminSanSang, true, 'da co mat khau');
  doiChieu(o.hoTroJsonp, true, 'phai bao ho tro JSONP');
});

kiem('action la khong loi, van tra duoc JSONP', () => {
  const r = goi({ action: 'khongTonTai', callback: 'cb' });
  doiChieu(r.mime, 'text/javascript', 'mime');
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'van ok');
});

console.log('\n=== 3. cmsSave qua GET + payload ===');

kiem('payload JSON hop le: luu duoc', () => {
  const r = goi({
    action: 'cmsSave',
    callback: 'cb',
    payload: JSON.stringify({ action: 'cmsSave', key: 'hero_kicker', value: 'Tổng Giám Đốc', password: MK })
  });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok: ' + (o.message || ''));
  doiChieu(o.key, 'hero_kicker', 'key');
});

kiem('mat khau sai: tra loi qua JSONP, khong nem loi', () => {
  const r = goi({
    action: 'cmsSave', callback: 'cb',
    payload: JSON.stringify({ action: 'cmsSave', key: 'hero_kicker', value: 'x', password: 'sai' })
  });
  doiChieu(r.mime, 'text/javascript', 'phai tra JSONP');
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
  if (!o.message || o.message.indexOf('không đúng') === -1) throw new Error('thong bao sai: ' + o.message);
});

kiem('payload hong: tra loi ro rang', () => {
  const r = goi({ action: 'cmsSave', callback: 'cb', payload: '{khong phai json' });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
});

kiem('thieu payload: bao loi cu the', () => {
  const r = goi({ action: 'cmsSave', callback: 'cb' });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
});

console.log('\n=== 3b. action verify (dung cho che do sua truc tiep) ===');

kiem('verify: mat khau dung, kem nhan xacNhan', () => {
  const r = goi({ action: 'verify', callback: 'cb', payload: JSON.stringify({ password: MK }) });
  doiChieu(r.mime, 'text/javascript', 'phai tra JSONP');
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok: ' + (o.message || ''));
  /* Tinh mau: phia trinh duyet chi chap nhan khi co nhan nay.
     Backend cu khong co, no tra thong tin suc khoe cung co ok:true —
     neu khong doi nhan thi moi mat khau deu lot vao duoc. */
  doiChieu(o.xacNhan, true, 'thieu nhan xacNhan');
});

kiem('verify: mat khau sai, tra loi qua JSONP', () => {
  const r = goi({ action: 'verify', callback: 'cb', payload: JSON.stringify({ password: 'sai' }) });
  doiChieu(r.mime, 'text/javascript', 'phai tra JSONP');
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
  if (!o.message || o.message.indexOf('không đúng') === -1) throw new Error('thong bao sai: ' + o.message);
});

kiem('verify: thieu payload, bao loi cu the', () => {
  const r = goi({ action: 'verify', callback: 'cb' });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
});

console.log('\n=== 4. upload qua GET + payload ===');


const b64 = Buffer.alloc(2048, 5).toString('base64');

kiem('uploadImage tra duong dan cong khai', () => {
  const r = goi({
    action: 'uploadImage', callback: 'cb',
    payload: JSON.stringify({ action: 'uploadImage', password: MK, file: { name: 'anh.webp', data: b64 } })
  });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok: ' + (o.message || ''));
  if (!/^https:\/\//.test(o.urlCongKhai)) throw new Error('URL khong hop le');
});

kiem('uploadFont sinh @font-face', () => {
  const r = goi({
    action: 'uploadFont', callback: 'cb',
    payload: JSON.stringify({ action: 'uploadFont', password: MK, file: { name: 'Ten Phong.woff2', data: b64 } })
  });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok');
  if (o.cssCanDung.indexOf('@font-face') === -1) throw new Error('thieu @font-face');
});

kiem('upload sai duoi: tra loi qua JSONP', () => {
  const r = goi({
    action: 'uploadImage', callback: 'cb',
    payload: JSON.stringify({ action: 'uploadImage', password: MK, file: { name: 'x.exe', data: b64 } })
  });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
  if (o.message.indexOf('Định dạng') === -1) throw new Error('thong bao sai: ' + o.message);
});

kiem('listImages tra danh sach', () => {
  const r = goi({ action: 'listImages', callback: 'cb' });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok');
  if (!Array.isArray(o.images)) throw new Error('images phai la mang');
  if (!o.images.length) throw new Error('phai co it nhat 1 anh da tai');
});

kiem('listFonts tra danh sach phong', () => {
  const r = goi({ action: 'listFonts', callback: 'cb' });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, true, 'ok');
  if (!Array.isArray(o.fonts)) throw new Error('fonts phai la mang');
});

console.log('\n=== 5. doPost van dung ===');

kiem('doPost co callback: tra JSONP', () => {
  const r = sandbox.doPost({
    parameter: { callback: 'cb' },
    postData: { contents: JSON.stringify({ action: 'listimages' }) }
  });
  doiChieu(r.mime, 'text/javascript', 'mime');
});

kiem('doPost khong callback: tra JSON thuan', () => {
  const r = sandbox.doPost({
    parameter: {},
    postData: { contents: JSON.stringify({ action: 'listimages' }) }
  });
  doiChieu(r.mime, 'application/json', 'mime');
});

kiem('doPost loi: tra JSONP co message, khong nem', () => {
  const r = sandbox.doPost({
    parameter: { callback: 'cb' },
    postData: { contents: '{hong' }
  });
  const o = JSON.parse(r.noiDung.replace(/^cb\(/, '').replace(/\);$/, ''));
  doiChieu(o.ok, false, 'phai bao loi');
});

console.log('\n' + '='.repeat(52));
console.log('  Dat: ' + pass + '   |   Loi: ' + fail);
console.log('='.repeat(52) + '\n');
process.exit(fail === 0 ? 0 : 1);

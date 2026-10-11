'use strict';
/* Kiểm chứng thật với backend đang chạy trên Google, không dùng giả lập.
   Ghi một giá trị thử, đọc lại, rồi trả về đúng giá trị cũ.
   Phần khôi phục nằm trong finally: dù có lỗi gì cũng không để lại rác. */
const { chromium } = require('playwright');
const MK = '12345678910@';
const BASE = 'https://linhtruong.vn/';
const KHOA = 'profile_title_1';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();

  let pass = 0, fail = 0;
  const kiem = async (ten, fn) => {
    try { await fn(); console.log('  OK   ' + ten); pass++; }
    catch (e) { console.log('  LOI  ' + ten + '\n        ' + e.message); fail++; }
  };
  const hoi = (action, cb) => p.evaluate(({ a, c, duLieu }) => new Promise((xong) => {
    const s = document.createElement('script');
    let url = window.KOKO_CMS.backend + '?action=' + a + '&callback=' + c;
    if (duLieu) url += '&payload=' + encodeURIComponent(JSON.stringify(duLieu));
    window[c] = (dl) => { s.remove(); xong(dl); };
    s.src = url;
    document.head.appendChild(s);
    setTimeout(() => xong({ ok: false, message: 'het gio' }), 20000);
  }), { a: action, c: cb, duLieu: duLieuOf(action) });

  let duLieuCan = null;
  function duLieuOf(a) { return a === 'cmsSave' ? duLieuCan : null; }
  const het = () => Date.now().toString(36).slice(-5);

  console.log('\n=== Backend that tren Google ===');

  let goc = null;
  await kiem('trang that doc duoc noi dung tu Google Sheet', async () => {
    await p.goto(BASE, { waitUntil: 'load' });
    await p.waitForTimeout(3500);
    goc = await p.evaluate(k => {
      const el = document.querySelector('[data-cms="' + k + '"]');
      return el ? el.textContent.trim() : null;
    }, KHOA);
    if (!goc) throw new Error('khong tim thay phan tu tren trang');
    if (!goc.length) throw new Error('chu bi rong');
    console.log('        gia tri hien tai: "' + goc + '"');
  });

  await kiem('mo khoa ?edit bang mat khau that tren Google', async () => {
    await p.goto(BASE + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => ({
      conHop: !!document.querySelector('.ed-login'),
      active: document.documentElement.classList.contains('ed-active'),
      msg: (document.getElementById('edMsg') || {}).textContent || ''
    }));
    if (r.conHop || !r.active) throw new Error('khong vao duoc che do sua: ' + r.msg);
  });

  const THU = 'KIEM TRA ' + Date.now().toString().slice(-6);
  try {
    await kiem('sua roi luu: ghi that vao Google Sheet', async () => {
      await p.evaluate(({ k, v }) => {
        const el = document.querySelector('[data-ed-khoa="' + k + '"]');
        el.click();
        el.textContent = v;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }, { k: KHOA, v: THU });
      await p.waitForTimeout(400);
      await p.click('#edSave');
      await p.waitForTimeout(3500);
      const toast = await p.evaluate(() =>
        Array.from(document.querySelectorAll('.ed-toast')).map(x => x.textContent).join(' | '));
      if (/không lưu được|hết thời gian|Chưa có thay đổi/i.test(toast)) throw new Error(toast.slice(0, 140));
      console.log('        ' + toast.slice(0, 80));
    });

    await kiem('doc lai truc tiep tu backend: gia tri da doi', async () => {
      const r = await hoi('getdata', 'kcA' + het());
      if (!r || r.ok !== true) throw new Error('backend tra loi: ' + JSON.stringify(r).slice(0, 120));
      if (r.content[KHOA] !== THU) throw new Error('Sheet chua ghi. Nhan: ' + JSON.stringify(r.content[KHOA]));
      console.log('        Sheet dang giu: "' + r.content[KHOA] + '"');
    });

    await kiem('trang khach thay noi dung moi, khong can ?edit', async () => {
      const ctx2 = await b.newContext();
      const p2 = await ctx2.newPage();
      await p2.goto(BASE, { waitUntil: 'load' });
      await p2.waitForTimeout(4000);
      const v = await p2.evaluate(k => document.querySelector('[data-cms="' + k + '"]').textContent.trim(), KHOA);
      if (v !== THU) throw new Error('khach thay "' + v + '", mong doi "' + THU + '"');
      await ctx2.close();
    });
  } finally {
    await kiem('tra lai gia tri cua ban', async () => {
      duLieuCan = { action: 'cmsSave', key: KHOA, value: goc, password: MK };
      const r = await hoi('cmsSave', 'kcB' + het());
      if (!r || r.ok !== true) throw new Error('khoi phuc that bai: ' + JSON.stringify(r).slice(0, 120));
      const x = await hoi('getdata', 'kcC' + het());
      if (!x.content || x.content[KHOA] !== goc) throw new Error('CHUA khoi phuc duoc: ' + JSON.stringify(x.content));
      console.log('        da khoi phuc: "' + goc + '"');
    });
  }

  await b.close();
  console.log('\n' + '='.repeat(52));
  console.log('  Dat: ' + pass + '   |   Loi: ' + fail);
  console.log('='.repeat(52) + '\n');
  process.exit(fail === 0 ? 0 : 1);
})();

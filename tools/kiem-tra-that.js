'use strict';
/* Kiểm chứng thật với backend đang chạy trên Google, không dùng giả lập.
   Ghi một giá trị thử, đọc lại, rồi trả về đúng giá trị cũ — không để
   lại rác trong Sheet của bạn. */
const { chromium } = require('playwright');
const MK = '12345678910@';
const BASE = 'https://linhtruong.vn/';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();

  let pass = 0, fail = 0;
  const kiem = async (ten, fn) => {
    try { await fn(); console.log('  OK   ' + ten); pass++; }
    catch (e) { console.log('  LOI  ' + ten + '\n        ' + e.message); fail++; }
  };

  console.log('\n=== Backend that tren Google ===');
  console.log('  ' + await p.evaluate(() => 1).catch(() => 0) + '');

  /* 1. Trang chay that tren domain: co nap duoc noi dung tu Sheet khong? */
  let goc = null;
  await kiem('trang that doc duoc noi dung tu Google Sheet', async () => {
    await p.goto(BASE, { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    goc = await p.evaluate(() => {
      const el = document.querySelector('[data-cms="profile_title_1"]');
      return el ? el.textContent.trim() : null;
    });
    if (!goc) throw new Error('khong tim thay phan tu tren trang');
    if (!goc.length) throw new Error('chu bi rong');
    console.log('        gia tri hien tai: "' + goc + '"');
  });

  /* 2. Login that bang mat khau that */
  await kiem('mo khoa ?edit bang mat khau that tren Google', async () => {
    await p.goto(BASE + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({
      conHop: !!document.querySelector('.ed-login'),
      active: document.documentElement.classList.contains('ed-active'),
      msg: (document.getElementById('edMsg') || {}).textContent || ''
    }));
    if (r.conHop || !r.active) throw new Error('khong vao duoc che do sua: ' + r.msg);
  });

  /* 3. Sua mot chu, luu, va kiem tra no da ghi vao Google Sheet that */
  const THU = 'KIEM TRA ' + Date.now().toString().slice(-6);
  await kiem('sua roi luu: ghi that vao Google Sheet', async () => {
    await p.evaluate((v) => {
      const el = document.querySelector('[data-ed-khoa="profile_title_1"]');
      el.click();
      el.textContent = v;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }, THU);
    await p.waitForTimeout(300);
    await p.click('#edSave');
    await p.waitForTimeout(3000);
    const toast = await p.evaluate(() =>
      Array.from(document.querySelectorAll('.ed-toast')).map(x => x.textContent).join(' | '));
    if (/không lưu được|hết thời gian|Chưa có thay đổi/i.test(toast)) throw new Error(toast.slice(0, 140));
    console.log('        ' + toast.slice(0, 80));
  });

  /* 4. Doc lai truc tiep tu backend, khong qua trinh duyet */
  await kiem('doc lai truc tiep tu backend: gia tri da doi', async () => {
    const cb = 'kcTest' + Date.now().toString().slice(-5);
    const r = await p.evaluate((cbn) => new Promise((xong) => {
      const s = document.createElement('script');
      window[cbn] = (dl) => { s.remove(); xong(dl); };
      s.src = window.KOKO_CMS.backend + '?action=getdata&callback=' + cbn;
      document.head.appendChild(s);
      setTimeout(() => xong({ ok: false, message: 'het gio' }), 15000);
    }), cb);
    if (!r || r.ok !== true) throw new Error('backend tra loi: ' + JSON.stringify(r).slice(0, 120));
    if (r.content.profile_title_1 !== THU) {
      throw new Error('Sheet chua ghi. Nhan: ' + JSON.stringify(r.content.profile_title_1));
    }
    console.log('        Sheet dang giu: "' + r.content.profile_title_1 + '"');
  });

  /* 5. Trang khach (khong phai ?edit) phai thay noi dung do */
  await kiem('trang khach thay noi dung moi, khong can ?edit', async () => {
    const ctx2 = await b.newContext();
    const p2 = await ctx2.newPage();
    await p2.goto(BASE, { waitUntil: 'load' });
    await p2.waitForTimeout(3500);
    const v = await p2.evaluate(() =>
      document.querySelector('[data-cms="profile_title_1"]').textContent.trim());
    if (v !== THU) throw new Error('khach thay "' + v + '", mong doi "' + THU + '"');
    await ctx2.close();
  });

  /* 6. Tra ve dung gia tri cua ban */
  await kiem('tra lai gia tri cua ban', async () => {
    const cb = 'kcBack' + Date.now().toString().slice(-5);
    await p.evaluate(({ cbn, val }) => new Promise((xong, loi) => {
      const s = document.createElement('script');
      window[cbn] = (dl) => { s.remove(); dl && dl.ok ? xong(1) : loi(new Error(dl && dl.message)); };
      s.src = window.KOKO_CMS.backend + '?action=cmsSave&callback=' + cbn +
              '&payload=' + encodeURIComponent(JSON.stringify({
                action: 'cmsSave', key: 'profile_title_1', value: val, password: MK
              }));
      document.head.appendChild(s);
      setTimeout(() => loi(new Error('het gio')), 15000);
    }), { cbn: cb, val: goc });

    const cb2 = 'kcChk' + Date.now().toString().slice(-5);
    const r = await p.evaluate((cbn) => new Promise((xong) => {
      const s = document.createElement('script');
      window[cbn] = (dl) => { s.remove(); xong(dl); };
      s.src = window.KOKO_CMS.backend + '?action=getdata&callback=' + cbn;
      document.head.appendChild(s);
      setTimeout(() => xong({}), 15000);
    }), cb2);
    if (!r.content || r.content.profile_title_1 !== goc) {
      throw new Error('chua tra lai duoc: ' + JSON.stringify(r.content));
    }
    console.log('        da khoi phuc: "' + goc + '"');
  });

  await b.close();
  console.log('\n' + '='.repeat(52));
  console.log('  Dat: ' + pass + '   |   Loi: ' + fail);
  console.log('='.repeat(52) + '\n');
  process.exit(fail === 0 ? 0 : 1);
})();

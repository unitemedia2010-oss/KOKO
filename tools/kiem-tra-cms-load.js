'use strict';
/* Kiểm tra cms-load.js — đưa nội dung từ Google Sheets lên trang thật.
   Đây là thứ quyết định "sửa xong thì khách có thấy không". */
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8080/';

(async () => {
  const browser = await chromium.launch();
  let pass = 0, fail = 0;

  const kiem = async (ten, fn) => {
    try { const r = await fn(); if (r === false) throw new Error('tra ve false'); console.log('  OK   ' + ten); pass++; }
    catch (e) { console.log('  LOI  ' + ten + '\n        ' + e.message); fail++; }
  };
  const doi = (a, b, n) => { if (a !== b) throw new Error((n || '') + ' — mong doi ' + JSON.stringify(b) + ', nhan ' + JSON.stringify(a)); };

  /* --- 1. Trang binh thuong phai lay noi dung tu Sheet --- */
  console.log('\n=== 1. Trang thuong lay noi dung tu Sheet ===');

  await kiem('co noi dung trong Sheet: dan len trang', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const dl = { ok: true, content: { profile_title_1: 'CHU DA SUA', hero_kicker: 'KICKER DA SUA' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({
      t1: document.querySelector('[data-cms="profile_title_1"]').textContent.trim(),
      t2: document.querySelector('[data-cms="hero_kicker"]').textContent.trim()
    }));
    doi(r.t1, 'CHU DA SUA', 'profile_title_1');
    doi(r.t2, 'KICKER DA SUA', 'hero_kicker');
    await ctx.close();
  });

  await kiem('o co phan tu con: giu nguyen, khong pha cau truc', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const dl = { ok: true, content: { contact_btn: 'PHOI HAI THE CON' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const el = document.querySelector('[data-cms="contact_btn"]');
      return { con: el.children.length, chu: el.textContent.trim() };
    });
    doi(r.chu, 'PHOI HAI THE CON', 'phai giu nguyen chu goc, khong ghi de');
    await ctx.close();
  });

  await kiem('gia tri rong: bo qua, khong xoa chu co san', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const dl = { ok: true, content: { profile_title_1: '', hero_kicker: '   ' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => ({
      t: document.querySelector('[data-cms="profile_title_1"]').textContent.trim(),
      dung: document.querySelector('[data-cms="hero_kicker"]').textContent.trim()
    }));
    if (!r.t || !r.dung) throw new Error('chu bi xoa sach: ' + JSON.stringify(r));
    await ctx.close();
  });

  await kiem('khoa khong ton tai tren trang: bo qua, khong bao loi', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const loi = [];
    p.on('pageerror', e => loi.push(e.message));
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const dl = { ok: true, content: { khoa_bi_ban_999: 'x', '"><script>': 'y', profile_title_1: 'OK' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => ({
      ok: document.querySelector('[data-cms="profile_title_1"]').textContent.trim(),
      xem: document.body.innerHTML.indexOf('khoa_bi_ban_999') > -1
    }));
    doi(r.ok, 'OK', 'van phai dan duoc khoa hop le');
    doi(r.xem, false, 'khong duoc do khoa la ra chu');
    if (loi.length) throw new Error('loi trinh duyet: ' + loi.join(' | '));
    await ctx.close();
  });

  await kiem('anh: doi duoc duong dan', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const dl = { ok: true, content: { 'life_photo::src': 'assets/images/hero-street.webp' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() =>
      document.querySelector('[data-cms-img="life_photo"]').getAttribute('src'));
    doi(r, 'assets/images/hero-street.webp', 'duong dan anh');
    await ctx.close();
  });

  /* --- 2. Khong duoc lam trang hong khi mang hong --- */
  console.log('\n=== 2. Khong duoc hong khi mang co van ===');

  await kiem('Apps Script chet: trang van binh thuong', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const loi = [];
    p.on('pageerror', e => loi.push(e.message));
    await p.route('**/script.google.com/**', r => r.abort());
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({
      t: document.querySelector('[data-cms="profile_title_1"]').textContent.trim(),
      coToolbar: !!document.querySelector('.ed-bar')
    }));
    if (!r.t) throw new Error('chu bi mat khi khong co mang');
    doi(r.coToolbar, false, 'khong duoc hien thanh cong cu');
    if (loi.length) throw new Error('loi trinh duyet: ' + loi.join(' | '));
    await ctx.close();
  });

  await kiem('backend tra loi: trang van binh thuong', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const loi = [];
    p.on('pageerror', e => loi.push(e.message));
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '({"ok":false,"message":"loi backend"});' });
    });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => document.querySelector('[data-cms="profile_title_1"]').textContent.trim());
    if (!r) throw new Error('chu bi mat');
    if (loi.length) throw new Error('loi trinh duyet: ' + loi.join(' | '));
    await ctx.close();
  });

  /* --- 3. Bo nho: lan sau khong phai choi mang --- */
  console.log('\n=== 3. Bo nho trinh duyet ===');

  await kiem('lan sau mo trang: dung duoc noi dung da nho, khong choi lai', async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      localStorage.setItem('koko-cms-noidung-v1',
        JSON.stringify({ profile_title_1: 'TU BO NHO' }));
    });
    const p = await ctx.newPage();
    /* Cố tình chặn mạng để chứng minh không cần mạng để lấy nội dung. */
    await p.route('**/script.google.com/**', r => r.abort());
    await p.goto(URL, { waitUntil: 'load' });
    const som = await p.evaluate(() => document.querySelector('[data-cms="profile_title_1"]').textContent.trim());
    doi(som, 'TU BO NHO', 'phai dan ngay tu bo nho, khong can mang');
    await ctx.close();
  });

  await kiem('che do ?edit: cms-load khong chay trung do', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    let goiGetdata = 0;
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const act = (u.searchParams.get('action') || '').toLowerCase();
      if (act === 'getdata') goiGetdata++;
      const dl = act === 'verify'
        ? { ok: true, xacNhan: true }
        : { ok: true, content: { profile_title_1: 'CHUA VAO DUOC' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(1200);

    /* Xem cms-load đã tải và ghi bộ nhớ chưa. Nó phải dừng lại ngay khi
       thấy ?edit, không hề gọi mạng, nên bộ nhớ phải còn trống.
       (Nội dung lúc này chưa được dán vì chưa đăng nhập — đó là việc
       của editor, không phải của cms-load.) */
    const r = await p.evaluate(() => ({
      daNho: localStorage.getItem('koko-cms-noidung-v1'),
      chua: document.querySelector('[data-cms="profile_title_1"]').textContent.trim()
    }));
    doi(r.daNho, null, 'cms-load da chay o che do ?edit');
    doi(goiGetdata, 0, 'khong duoc goi getdata truoc khi dang nhap');
    if (r.chua === 'CHUA VAO DUOC') throw new Error('du lieu lot vao truoc khi dang nhap');
    await ctx.close();
  });

  await browser.close();
  console.log('\n' + '='.repeat(52));
  console.log('  Dat: ' + pass + '   |   Loi: ' + fail);
  console.log('='.repeat(52) + '\n');
  process.exit(fail === 0 ? 0 : 1);
})();

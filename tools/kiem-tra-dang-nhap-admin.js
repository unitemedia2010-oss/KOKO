'use strict';
/* Kiểm tra cổng đăng nhập admin.html
   Mỗi trường hợp dùng một context trình duyệt riêng, vì đăng nhập thành
   công được ghi vào sessionStorage và sẽ làm các trường hợp sau tự vào. */
const { chromium } = require('playwright');
const MK = 'matkhau-dung-123';
const URL = 'http://127.0.0.1:8080/admin.html';

(async () => {
  const browser = await chromium.launch();
  let pass = 0, fail = 0;

  const kiem = async (ten, nhanVaoDuoc, backendCu, matKhau) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const loi = [];
    p.on('pageerror', e => loi.push('PAGEERROR ' + e.message.slice(0, 160)));

    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const act = (u.searchParams.get('action') || '').toLowerCase();
      let pl = {}; const raw = u.searchParams.get('payload');
      if (raw) { try { pl = JSON.parse(raw); } catch (e) {} }
      let dl;
      if (backendCu) {
        /* Backend chưa deploy lại: không có action verify, rơi xuống
           nhánh sức khoẻ, cũng trả ok:true. */
        dl = { ok: true, message: 'KOKO CMS dang hoat dong.', hoTroJsonp: true };
      } else if (act === 'verify') {
        dl = pl.password === MK
          ? { ok: true, xacNhan: true, message: 'Mat khau dung.' }
          : { ok: false, xacNhan: false, message: 'Mật khẩu quản trị không đúng.' };
      } else {
        dl = { ok: true, content: {}, images: [], fonts: [] };
      }
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });

    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#gatePass', matKhau);
    await p.click('#gateBtn');
    await p.waitForTimeout(1400);

    const r = await p.evaluate(() => ({
      appHien: !document.getElementById('app').hidden,
      gateAn: document.getElementById('gate').hidden,
      msg: (document.getElementById('gateMsg') || {}).textContent || ''
    }));

    const loi2 = [];
    if (r.appHien !== nhanVaoDuoc) loi2.push('vua duoc=' + r.appHien + ', mong doi ' + nhanVaoDuoc);
    /* Ô mật khẩu có thuộc tính required nên trình duyệt chặn ngay,
       không có thông báo nào của ứng dụng — vẫn là hành vi đúng. */
    if (!nhanVaoDuoc && matKhau && !r.msg.trim()) loi2.push('khong co thong bao loi');
    loi2.push(...loi);

    if (loi2.length) { console.log('  LOI  ' + ten + '\n        ' + loi2.join('\n        ')); fail++; }
    else { console.log('  OK   ' + ten + (r.msg.trim() ? '  [' + r.msg.trim().slice(0, 60) + ']' : '')); pass++; }

    await ctx.close();
  };

  /* Bổ sung: kiểm tra dạng hàm, cho các ca không theo khuôn đăng nhập. */
  const kiemHam = async (ten, fn) => {
    try {
      const r = await fn();
      if (r === false) throw new Error('tra ve false');
      console.log('  OK   ' + ten); pass++;
    } catch (e) {
      console.log('  LOI  ' + ten + '\n        ' + e.message); fail++;
    }
  };

  await kiem('mat khau dung: vao duoc', true, false, MK);
  await kiem('mat khau sai: bi tu choi', false, false, 'sai-mat-khau');
  await kiem('mat khau rong: bi tu choi', false, false, '');
  await kiem('backend cu (chua deploy): bi tu choi', false, true, 'bat-ky-gi-ca');

  /* --- Lưu phải đúng định dạng mà Code.gs đọc ---
     Code.gs chỉ đọc tham số `payload` dạng JSON cho cmsSave. Trước đây
     admin.js gửi key/value rời nên backend trả "Thiếu dữ liệu (payload)"
     và không lưu gì — mà giao diện vẫn có thể tưởng đã lưu. */
  await kiemHam('luu dung dinh dang payload, khong gui key/value rời', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const nhan = [];
    await p.route('**/script.google.com/**', r => {
      const u = new global.URL(r.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      const act = (u.searchParams.get('action') || '').toLowerCase();
      const raw = u.searchParams.get('payload');
      let pl = {}; if (raw) { try { pl = JSON.parse(raw); } catch (e) { pl = { HONG: raw }; } }

      if (act === 'cmssave') {
        nhan.push({
          coKeyRieng: u.searchParams.has('key'),
          coValueRieng: u.searchParams.has('value'),
          khoaTrongPayload: pl.key,
          coMatKhau: !!(pl.password)
        });
        /* Mô phỏng Code.gs thật: không có payload thì từ chối. */
        return r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
          body: cb + '(' + JSON.stringify(raw
            ? { ok: true, key: pl.key }
            : { ok: false, message: 'Thiếu dữ liệu (payload) cho cmsSave.' }) + ');' });
      }
      const dl = act === 'verify' ? { ok: true, xacNhan: true }
                                  : { ok: true, content: { profile_title_1: 'Nữ lãnh đạo' } };
      r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                  body: cb + '(' + JSON.stringify(dl) + ');' });
    });

    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.fill('#gatePass', MK);
    await p.click('#gateBtn');
    await p.waitForTimeout(1500);

    const daVao = await p.evaluate(() => !document.getElementById('app').hidden);
    if (!daVao) throw new Error('khong vao duoc trang quan tri');

    const truoc = nhan.length;
    await p.evaluate(() => {
      const el = document.querySelector('#fields [data-khoa]');
      if (!el) return;
      el.value = 'CHU THU NGHIEM LUU';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await p.click('#saveSection');
    await p.waitForTimeout(2500);

    if (nhan.length === truoc) throw new Error('khong co yeu cau luu nao duoc gui');
    const x = nhan[0];
    if (x.coKeyRieng || x.coValueRieng) throw new Error('van gui key/value rieng — backend se tu choi');
    if (!x.khoaTrongPayload) throw new Error('payload khong co khoa');
    if (!x.coMatKhau) throw new Error('payload khong co mat khau');
    await ctx.close();
    return true;
  });

  console.log('\n  Dat: ' + pass + ' | Loi: ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();

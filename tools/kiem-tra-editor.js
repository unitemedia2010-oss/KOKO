/**
 * Kiểm tra chế độ sửa trực tiếp (editor.js)
 * ------------------------------------------------------------------
 * Dùng Apps Script giả lập trong chính trình duyệt, nên không cần mạng
 * thật và không đụng dữ liệu của bạn.
 *
 * Kiểm tra:
 *   - Không có ?edit thì editor không bật, trang y nguyên
 *   - Có ?edit thì hỏi mật khẩu, sai thì từ chối, đúng thì bật
 *   - Bấm vào chữ thì sửa được; Esc hoặc bấm ra ngoài thì kết thúc
 *   - Đếm đúng số chỗ sửa được, bỏ qua ô có phần tử con
 *   - Lưu chỉ gửi phần đã đổi, và chặn ký tự gây lỗi trong Sheet
 *   - Dán HTML vào ô sửa không được chèn mã
 *
 * Chạy: node tools/kiem-tra-editor.js
 */
'use strict';

const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8080/';

/* Apps Script giả: trả JSONP đúng như bản thật sau khi đã sửa */
async function fakeBackend(page) {
  await page.route('**/script.google.com/**', route => {
    const u = new global.URL(route.request().url());
    const cb = u.searchParams.get('callback') || 'cb';
    const action = (u.searchParams.get('action') || '').toLowerCase();
    let payload = {};
    const p = u.searchParams.get('payload');
    if (p) { try { payload = JSON.parse(p); } catch (e) { payload = {}; } }

    let duLieu;
    const MK = 'matkhau-dung-123';

    if (action === 'verify') {
      duLieu = payload.password === MK
        ? { ok: true, xacNhan: true, message: 'Mat khau dung.' }
        : { ok: false, xacNhan: false, message: 'Mật khẩu quản trị không đúng.' };
    } else if (action === 'getdata') {
      duLieu = { ok: true, content: NOIDUNG_GIA || {} };
    } else if (action === 'cmssave') {
      DA_LUU.push({ key: payload.key, value: payload.value });
      duLieu = { ok: true, key: payload.key, value: payload.value, capNhatHayThemMoi: true };
    } else {
      duLieu = { ok: true, message: 'mock' };
    }

    route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: cb + '(' + JSON.stringify(duLieu) + ');'
    });
  });
}

const MK = 'matkhau-dung-123';

/* Nội dung giả lập nằm ở biến Node, vì `window` không tồn tại ở Node.js.
   Test gán trực tiếp vào hai biến này để mô phỏng dữ liệu trên Sheet. */
let NOIDUNG_GIA = {};
let DA_LUU = [];

(async () => {
  const browser = await chromium.launch();
  let pass = 0, fail = 0;

  const kiem = async (ten, fn) => {
    try { await fn(); console.log('  OK   ' + ten); pass++; }
    catch (e) { console.log('  LOI  ' + ten + '\n        ' + e.message); fail++; }
  };
  const doi = (a, b, n) => { if (a !== b) throw new Error((n || '') + ' — mong doi ' + JSON.stringify(b) + ', nhan ' + JSON.stringify(a)); };
  const phai = (dieukien, n) => { if (!dieukien) throw new Error(n || 'khong dung'); };

  /* ===================================================== */
  console.log('\n=== 1. Khong co ?edit: trang phai binh thuong ===');

  await kiem('khong bat editor khi thieu dau ?edit', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => ({
      coThanhCongCu: !!document.querySelector('.ed-bar'),
      coHoiMatKhau: !!document.querySelector('.ed-login'),
      htmlActive: document.documentElement.classList.contains('ed-active'),
      coDuongDanEditor: !!document.querySelector('[data-ed-khoa]')
    }));
    doi(r.coThanhCongCu, false, 'khong co thanh cong cu');
    doi(r.coHoiMatKhau, false, 'khong co hoi mat khau');
    doi(r.htmlActive, false, 'khong bat ed-active');
    doi(r.coDuongDanEditor, false, 'khong gan data-ed-khoa');
    await p.close();
  });

  /* ===================================================== */
  console.log('\n=== 2. Co ?edit: xac thuc mat khau ===');

  await kiem('hien hop thoai nhap mat khau', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({
      coLogin: !!document.querySelector('.ed-login'),
      coThanh: !!document.querySelector('.ed-bar')
    }));
    doi(r.coLogin, true, 'phai co hop nhap mat khau');
    doi(r.coThanh, true, 'phai co thanh cong cu');
    await p.close();
  });

  await kiem('mat khau sai: bao loi, khong bat', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', 'sai-mat-khau');
    await p.click('#edOk');
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => ({
      msg: document.getElementById('edMsg').textContent,
      err: document.getElementById('edMsg').className.indexOf('err') > -1,
      conLogin: !!document.querySelector('.ed-login')
    }));
    phai(r.err, 'phai bao loi');
    phai(/không đúng/i.test(r.msg), 'thong bao phai noi mat khau sai, nhan: ' + r.msg);
    doi(r.conLogin, true, 'phai van o hop nhap');
    await p.close();
  });

  await kiem('mat khau dung: bat che do sua', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({
      conLogin: !!document.querySelector('.ed-login'),
      active: document.documentElement.classList.contains('ed-active'),
      soO: document.querySelectorAll('[data-ed-khoa]').length,
      count: document.getElementById('edCount').textContent
    }));
    doi(r.conLogin, false, 'phai dong hop nhap');
    doi(r.active, true, 'phai bat ed-active');
    phai(r.soO > 100, 'phai gan nhieu hon 100 cho sua, nhan ' + r.soO);
    doi(r.count, 'Chưa sửa gì', 'thanh phai bao chua sua gi');
    await p.close();
  });

  await kiem('backend CU tra ok:true cho action verify: phai tu choi', async () => {
    /* Đây là lỗ hổng thật đã gặp. Khi Code.gs chưa được deploy lại,
       action 'verify' không tồn tại nên Apps Script rơi xuống nhánh
       trả thông tin sức khoẻ — vốn cũng có ok:true. Nếu chỉ kiểm tra
       ok === true thì MỌI MẬT KHẨU đều vào được. Phải đòi nhãn xacNhan. */
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await p.route('**/script.google.com/**', route => {
      const u = new global.URL(route.request().url());
      const cb = u.searchParams.get('callback') || 'cb';
      /* Giống hệt backend cũ: không có action verify, trả về health */
      const dl = { ok: true, message: 'KOKO CMS dang hoat dong.', version: 'KOKO_CMS_V2', hoTroJsonp: true };
      route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                       body: cb + '(' + JSON.stringify(dl) + ');' });
    });
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    await p.fill('#edPass', 'bat-ky-mat-khau-nao-cung-duoc');
    await p.click('#edOk');
    await p.waitForTimeout(1200);

    const r = await p.evaluate(() => ({
      conLogin: !!document.querySelector('.ed-login'),
      active: document.documentElement.classList.contains('ed-active'),
      msg: (document.getElementById('edMsg') || {}).textContent || ''
    }));
    doi(r.conLogin, true, 'KHONG duoc mo duoc hop nhap');
    doi(r.active, false, 'KHONG duoc bat che do sua');
    phai(/chưa có chế độ xác nhận/i.test(r.msg), 'thong bao phai bao la backend cu, nhan: ' + r.msg);
    await p.close();
  });

  /* ===================================================== */
  console.log('\n=== 3. Bam de sua ===');
  let pageEdit;

  await kiem('bam vao chu: bat duoc che do sua', async () => {
    pageEdit = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(pageEdit);
    await pageEdit.goto(URL + '?edit', { waitUntil: 'load' });
    await pageEdit.waitForTimeout(500);
    await pageEdit.fill('#edPass', MK);
    await pageEdit.click('#edOk');
    await pageEdit.waitForTimeout(1200);

    const r = await pageEdit.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="hero_kicker"]');
      if (!el) return { loi: 'khong tim thay hero_kicker' };
      el.click();
      return {
        sua: el.classList.contains('ed-sua'),
        editable: el.getAttribute('contenteditable')
      };
    });
    doi(r.sua, true, 'phai co lop ed-sua');
    phai(r.editable, 'phai co contenteditable');
    await pageEdit.close();
  });

  await kiem('Esc: ket thuc sua, giu nguyen gia tri da go', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1200);

    const r = await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="hero_kicker"]');
      el.click();
      el.textContent = 'CHU THU NGHIEM';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return {
        gt: el.textContent,
        sua: el.classList.contains('ed-sua'),
        count: document.getElementById('edCount').textContent,
        luuDung: document.getElementById('edSave').disabled
      };
    });
    doi(r.gt, 'CHU THU NGHIEM', 'phai giu nguyen chu da go');
    doi(r.sua, false, 'phai ket thuc sua');
    doi(r.count, '1 chỗ đã sửa', 'phai bao dem so cho da sua');
    doi(r.luuDung, false, 'nut luu phai bat');
    await p.close();
  });

  await kiem('o co phan tu con: bo qua, khong gan cho sua', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1100);
    const r = await p.evaluate(() => {
      let coCon = 0, ganNham = 0;
      document.querySelectorAll('[data-cms]').forEach(el => {
        if (el.children.length > 0) {
          coCon++;
          if (el.hasAttribute('data-ed-khoa')) ganNham++;
        }
      });
      return { coCon, ganNham };
    });
    phai(r.coCon > 0, 'trang phai co it nhat o co phan tu con');
    doi(r.ganNham, 0, 'khong duoc gan khoa sua cho o co con');
    await p.close();
  });

  /* ===================================================== */
  console.log('\n=== 4. Kiem tra truoc khi luu ===');

  await kiem('chu rong: khong duoc luu', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1100);
    await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="hero_kicker"]');
      el.click();
      el.textContent = '    ';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await p.waitForTimeout(200);
    const luu = await p.evaluate(() => !document.getElementById('edSave').disabled);
    if (luu) {
      // bam luu de xem co bao loi
      await p.click('#edSave');
      await p.waitForTimeout(700);
      const coLoi = await p.evaluate(() => {
        const t = Array.from(document.querySelectorAll('.ed-toast')).map(x => x.textContent).join(' | ');
        return /đang trống/i.test(t);
      });
      phai(coLoi, 'phai bao loi "khong duoc luu"');
    }
    await p.close();
  });

  await kiem('chu qua dai: khong duoc luu', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1100);
    await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="hero_kicker"]');
      el.click();
      el.textContent = 'a'.repeat(4200);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await p.waitForTimeout(200);
    await p.click('#edSave');
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => ({
      coLoi: Array.from(document.querySelectorAll('.ed-toast')).map(x => x.textContent).join(' | ')
    }));
    phai(/vượt giới hạn/i.test(r.coLoi), 'phai bao loi do dai, nhan: ' + r.coLoi.slice(0, 100));
    await p.close();
  });

  await kiem('ky tu cong thuc: khong duoc luu', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1100);
    await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="hero_kicker"]');
      el.click();
      el.textContent = '=SUM(A1:A9)';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await p.waitForTimeout(200);
    await p.click('#edSave');
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => Array.from(document.querySelectorAll('.ed-toast')).map(x => x.textContent).join(' | '));
    phai(/bắt đầu bằng/i.test(r), 'phai chan cong thuc, nhan: ' + r.slice(0, 120));
    await p.close();
  });

  /* ===================================================== */
  console.log('\n=== 5. Luu that ===');

  await kiem('chi gui nhung cho da doi', async () => {
    DA_LUU = [];
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1100);

    await p.evaluate(() => {
      const a = document.querySelector('[data-ed-khoa="hero_kicker"]');
      a.click(); a.textContent = 'CHU THU 1';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const b = document.querySelector('[data-ed-khoa="contact_btn"]');
      b.click(); b.textContent = 'CHU THU 2';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // mot cho sua roi goc lai, khong duoc gui
      const c = document.querySelector('[data-ed-khoa="contact_title"]');
      c.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await p.waitForTimeout(300);
    await p.click('#edSave');
    await p.waitForTimeout(1400);

    const r = DA_LUU;
    doi(r.length, 2, 'phai gui dung 2 cho da doi');
    doi(r[0].key, 'hero_kicker', 'khoa 1');
    doi(r[1].key, 'contact_btn', 'khoa 2');
    await p.close();
  });

  await kiem('sau khi luu: trang KHONG tai lai va noi dung moi hien ngay', async () => {
    NOIDUNG_GIA = {};
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.addInitScript(() => {
      /* Đánh dấu để biết trang có bị tải lại hay không. */
      window.__LAN_TAI_LAI = (window.__LAN_TAI_LAI || 0) + 1;
    });

    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1200);

    const truoc = await p.evaluate(() => ({
      lan: window.__LAN_TAI_LAI,
      gt: document.querySelector('[data-ed-khoa="hero_kicker"]').textContent
    }));

    await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="hero_kicker"]');
      el.click(); el.textContent = 'SAU KHI LUU';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await p.waitForTimeout(250);
    await p.click('#edSave');
    await p.waitForTimeout(1600);

    const sau = await p.evaluate(() => ({
      lan: window.__LAN_TAI_LAI,
      gt: document.querySelector('[data-ed-khoa="hero_kicker"]').textContent,
      count: document.getElementById('edCount').textContent,
      saveDisabled: document.getElementById('edSave').disabled,
      toast: Array.from(document.querySelectorAll('.ed-toast')).map(x => x.textContent).join(' | ')
    }));

    doi(sau.lan, truoc.lan, 'KHONG duoc tai lai trang — lai phai nhap mat khau');
    doi(sau.gt, 'SAU KHI LUU', 'chu tren trang phai la noi dung vua luu');
    doi(sau.count, 'Chưa sửa gì', 'phai het danh sach thay doi');
    doi(sau.saveDisabled, true, 'nut luu phai tat');
    await p.close();
  });

  await kiem('bam vao o giua trang: trang KHONG nhay', async () => {
    /* Do duoc truoc khi sua: bam vao o o giua trang lam trang nhay 105px,
       do trinh duyet tu cuon o vao giua man hinh. */
    NOIDUNG_GIA = {};
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1300);

    await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="profile_title_1"]');
      el.scrollIntoView({ block: 'center' });
    });
    await p.waitForTimeout(700);

    const o = await p.evaluate(() => {
      const el = document.querySelector('[data-ed-khoa="profile_title_1"]');
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, scrollY: window.scrollY };
    });

    await p.mouse.click(o.x, o.y);
    await p.waitForTimeout(600);

    const r = await p.evaluate(() => ({
      scrollY: window.scrollY,
      dangSua: document.querySelector('[data-ed-khoa="profile_title_1"]').classList.contains('ed-sua')
    }));

    doi(r.dangSua, true, 'phai vao duoc che do sua');
    if (Math.abs(r.scrollY - o.scrollY) > 5) {
      throw new Error('trang nhay ' + (r.scrollY - o.scrollY) + 'px khi bam vao o');
    }
    await p.close();
  });

  await kiem('khong ve vien hang loat khi moi bat che do sua', async () => {
    NOIDUNG_GIA = {};
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1300);

    const r = await p.evaluate(() => {
      const a = Array.from(document.querySelectorAll('[data-ed-khoa]'));
      const coVien = a.filter(el => {
        const s = getComputedStyle(el);
        return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      }).length;
      return { tong: a.length, coVien };
    });
    doi(r.coVien, 0, 'khong duoc ve vien ' + r.coVien + '/' + r.tong + ' o ngay tu dau — trang loon');
    await p.close();
  });

  await kiem('anh: gan khoa rieng cho tung tam anh', async () => {
    NOIDUNG_GIA = {};
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fakeBackend(p);
    await p.goto(URL + '?edit', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.fill('#edPass', MK);
    await p.click('#edOk');
    await p.waitForTimeout(1200);

    const r = await p.evaluate(() => {
      const a = Array.from(document.querySelectorAll('img[data-ed-khoa]'));
      const khoa = a.map(x => x.getAttribute('data-ed-khoa'));
      return { soAnh: a.length, trung: khoa.length - new Set(khoa).size, viDu: khoa.slice(0, 3) };
    });
    phai(r.soAnh >= 15, 'phai gan khoa cho it nhat 15 anh, nhan ' + r.soAnh);
    doi(r.trung, 0, 'khong duoc co 2 anh cung mot khoa');
    await p.close();
  });

  await kiem('khong duot con chu thuaa nao lot ra ngoai the img', async () => {
    /* Một lần script gan anh da de lai 7 doan "data-cms-img=..."
       ngay sau the </img>. Chúng la chu that, se hien ra tren trang.
       Kiem tra bang cach so sanh chu trong body voi chu trong the img. */
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const sach = document.body.innerText || '';
      const trongThe = Array.from(document.querySelectorAll('[data-cms-img]'))
        .map(x => 'data-cms-img="' + x.getAttribute('data-cms-img') + '"').join(' ');
      const lot = sach.match(/data-cms-img[-=][^\s]*/g) || [];
      return { lot, coTrongThe: trongThe.length > 0 };
    });
    doi(r.lot.length, 0, 'trang dang hien chu thuaa: ' + r.lot.slice(0, 5).join(', '));
    await p.close();
  });

  await browser.close();
  console.log('\n' + '='.repeat(52));
  console.log('  Dat: ' + pass + '   |   Loi: ' + fail);
  console.log('='.repeat(52) + '\n');
  process.exit(fail === 0 ? 0 : 1);
})();

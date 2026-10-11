/* ==========================================================================
   cms-load.js — đưa nội dung đã sửa trong quản trị lên trang thật
   --------------------------------------------------------------------------
   VÌ SAO CẦN FILE NÀY
     Trước đây, nội dung sửa trong Google Sheets chỉ nằm trong Sheet.
     Trang web tĩnh không đọc Sheet nên khách vẫn thấy chữ cũ trong
     index.html — sửa xong như như không. File này là chỗ nối hai bên.

   CÁCH HOẠT ĐỘNG
     1. Khi vào trang: lấy nội dung đã lưu trong bộ nhớ trình duyệt, dán
        vào trang ngay. Không chờ mạng, nên gần như không thấy trễ.
     2. Song song, hỏi Apps Script lại nội dung mới nhất.
     3. Nếu khác, dán lại và cập nhật bộ nhớ cho lần sau.

   AN TOÀN
     - Hỏng mạng, Apps Script chết, quá thời gian: trang vẫn hiện bình
       thường bằng chữ có sẵn trong HTML. Không có lỗi nào hiện ra.
     - Không bật khi URL có ?edit, vì chế độ sửa tại chỗ tự lo.
     - Chỉ dán khi giá trị khác rỗng, để chỗ nào chưa sửa thì giữ nguyên.
     - Không đụng tới ô có phần tử con, vì ghi đè sẽ phá hạng mục chữ.
   ========================================================================== */
(function () {
  'use strict';

  /* Một chỗ duy nhất chứa URL backend cho cả trang lẫn chế độ sửa,
     để không bao giờ phải sửa hai file khác nhau cho cùng một URL. */
  window.KOKO_CMS = {
    backend: 'https://script.google.com/macros/s/AKfycbzH8v1LJ4JdAC-1yvjULiJ4dwSxXp4BL_r7GLeic2G_P0QrQU8q3OAZVR1j9Yn3qPJx/exec'
  };

  if (/[?&]edit\b/.test(location.search)) return;   /* chế độ sửa tự lo */

  var KHOA = 'koko-cms-noidung-v1';
  var HET = 4000;                                  /* giây, đủ rồi */

  /* ---------- Dán nội dung lên trang ---------- */

  /* Lập danh sách khoá -> phần tử, đúng một lần.
     Không dùng querySelector('[data-cms="' + khoa + '"]') vì khoá lấy từ
     Sheet có thể chứa ký tự lạ (dấu nháy, ngoặc) — một khoá sai làm
     querySelector ném lỗi và HỎNG LUÔN phần còn lại của trang.
     Duyệt phần tử có sẵn thì không bao giờ lỗi, và nhanh hơn nhiều. */
  function lapChiMuc() {
    var m = Object.create(null);
    var i, el, k;
    var chu = document.querySelectorAll('[data-cms]');
    for (i = 0; i < chu.length; i++) {
      el = chu[i];
      k = el.getAttribute('data-cms');
      /* Ô có thẻ con: ghi đè sẽ phá hạng mục chữ, nên bỏ qua. */
      if (!k || el.children.length || m[k]) continue;
      m[k] = el;
    }
    var anh = document.querySelectorAll('[data-cms-img]');
    for (i = 0; i < anh.length; i++) {
      k = anh[i].getAttribute('data-cms-img');
      if (k && !m[k + '::src']) m[k + '::src'] = anh[i];
    }
    return m;
  }

  function dan(a) {
    if (!a || typeof a !== 'object') return 0;
    var m = lapChiMuc();
    var daD = 0;

    for (var k in a) {
      var gt = a[k];
      if (typeof gt !== 'string') continue;
      var nd = gt.replace(/\s+/g, ' ').trim();
      if (!nd) continue;                 /* rỗng hoặc toàn khoảng trắng: giữ nguyên chữ có sẵn */

      var el = m[k];
      if (!el) continue;                 /* khoá không có trên trang: bỏ qua */

      if (k.slice(-5) === '::src') {
        if (el.getAttribute('src') !== nd) { el.setAttribute('src', nd); daD++; }
      } else if (el.textContent !== nd) {
        el.textContent = nd;
        daD++;
      }
    }
    return daD;
  }

  /* ---------- Bộ nhớ trình duyệt ----------
     Ghi khi có nội dung mới, và khi trang quản trị vừa lưu, để lần
     xem trang kế tiếp không phải chờ mạng. */
  function docNho() {
    try { var s = localStorage.getItem(KHOA); return s ? JSON.parse(s) : null; }
    catch (e) { return null; }
  }
  function ghiNho(dl) {
    try { localStorage.setItem(KHOA, JSON.stringify(dl)); } catch (e) { /* im lặng */ }
  }

  /* Cho trang quản trị và chế độ sửa gọi sau khi lưu, để lần mở trang
     kế tiếp thấy ngay nội dung mới mà không phải chờ mạng. */
  window.kokoNhoCMS = ghiNho;

  /* ---------- Hỏi Apps Script ---------- */
  function hoi() {
    return new Promise(function (xong, loi) {
      var cb = '__kokoCms' + Math.random().toString(36).slice(2, 11);
      var s = document.createElement('script');
      var het = setTimeout(function () { don(); loi(new Error('het gio')); }, HET);
      function don() { clearTimeout(het); if (s.parentNode) s.parentNode.removeChild(s); delete window[cb]; }

      window[cb] = function (dl) { don(); dl && dl.ok ? xong(dl.content || {}) : loi(new Error('sai du lieu')); };
      s.onerror = function () { don(); loi(new Error('khong goi duoc')); };
      s.src = window.KOKO_CMS.backend + '?action=getdata&callback=' + cb;
      document.head.appendChild(s);
    });
  }

  function batDau() {
    /* 1. Dán bản trong bộ nhớ — không chờ mạng */
    var nho = docNho();
    if (nho && dan(nho)) {
      window.dispatchEvent(new Event('koko:content'));   /* co lại chữ cho vừa */
    }

    /* 2. Hỏi lại cho chắc */
    hoi().then(function (moi) {
      if (!moi || !Object.keys(moi).length) return;
      ghiNho(moi);
      if (dan(moi)) window.dispatchEvent(new Event('koko:content'));
    }).catch(function () {
      /* Không sao: trang vẫn hiện bằng chữ có sẵn trong HTML. */
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', batDau);
  } else {
    batDau();
  }
})();

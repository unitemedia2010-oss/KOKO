/* ==========================================================================
   app.js — KOKO LINH portfolio
   --------------------------------------------------------------------------
   Trách nhiệm:
     1. Đổi theme sáng/tối, có hiệu ứng lan màu
     2. Menu mobile
     3. Hiệu ứng xuất hiện khi cuộn (có dự phòng nếu GSAP không tải được)
     4. Cuộn ngang section Journey, đường dẫn dành riêng cho ảnh chính
     5. Ánh sáng bám theo con trỏ trên nút kính lỏng
     6. Nút liên hệ đổi màu khi rê chuột

   NGUYÊN TẮC SỐ 1: nội dung phải luôn hiện được.
   Mọi hiệu ứng đều bọc trong điều kiện "nếu thư viện có mặt". Nếu CDN chết
   hoặc người dùng chặn script, trang vẫn đọc và dùng được bình thường.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Bật cờ js-ready NGAY TRONG THẺ <HEAD> (xem inline script ở index.html).
     CSS chỉ ẩn nội dung hiệu ứng khi thấy cờ này, nên nếu file này ném lỗi
     trước khi mở hiệu ứng, nội dung vẫn hiện bình thường. */

  /* =====================================================================
     1. THEME
     ===================================================================== */
  (function initTheme() {
    var toggle = document.getElementById('themeToggle');
    var stored = null;
    try { stored = localStorage.getItem('koko-theme'); } catch (e) { /* chế độ riêng tư */ }
    if (stored === 'light' || stored === 'dark') root.dataset.theme = stored;

    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';

      /* Hiệu ứng lan màu: một vòng tròn to màu nền mới bung ra từ đúng nút
         đang bấm. Dùng clip-path nên không cần đo kích thước phần tử. */
      if (!reduceMotion.matches && typeof document.startViewTransition !== 'function') {
        var r = toggle.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var far = Math.hypot(
          Math.max(cx, innerWidth - cx),
          Math.max(cy, innerHeight - cy)
        );

        var veil = document.createElement('div');
        veil.setAttribute('aria-hidden', 'true');
        veil.style.cssText = [
          'position:fixed', 'inset:0', 'z-index:200', 'pointer-events:none',
          'background:' + (next === 'dark' ? '#090909' : '#f5f1eb'),
          'clip-path:circle(0px at ' + cx + 'px ' + cy + 'px)',
          'transition:clip-path .58s cubic-bezier(.65,0,.35,1)'
        ].join(';');
        document.body.appendChild(veil);

        /* ép trình duyệt nhận lệnh vẽ lại trước khi bung vòng tròn */
        requestAnimationFrame(function () {
          veil.style.clipPath = 'circle(' + far + 'px at ' + cx + 'px ' + cy + 'px)';
        });
        setTimeout(function () {
          veil.remove();
        }, 640);
      }

      root.dataset.theme = next;
      try { localStorage.setItem('koko-theme', next); } catch (e) { /* bỏ qua */ }

      /* thông báo cho shader.js và text-fit.js biết màu đã đổi */
      window.dispatchEvent(new CustomEvent('koko:theme', { detail: { theme: next } }));
    });
  })();

  /* =====================================================================
     2. THANH TIẾN TRÌNH
     ===================================================================== */
  (function initProgress() {
    var bar = document.getElementById('progress');
    if (!bar) return;
    var ticking = false;
    function update() {
      var max = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* =====================================================================
     3. MENU MOBILE
     ===================================================================== */
  (function initMobileMenu() {
    var btn = document.getElementById('menuToggle');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    var links = menu.querySelectorAll('a');

    function open() {
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      root.classList.add('menu-open');
      /* hiện các mục lệch nhịp */
      links.forEach(function (a, i) {
        a.style.transitionDelay = (60 + i * 55) + 'ms';
      });
      var first = links[0];
      if (first) setTimeout(function () { first.focus(); }, 220);
    }

    function close(restoreFocus) {
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      root.classList.remove('menu-open');
      links.forEach(function (a) { a.style.transitionDelay = ''; });
      if (restoreFocus) btn.focus();
    }

    btn.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) close(true);
      else open();
    });

    /* Bấm mục nào thì đóng menu, để trang cuộn tới đúng chỗ */
    links.forEach(function (a) {
      a.addEventListener('click', function () { close(false); });
    });

    /* Bấm ra ngoài vùng menu thì đóng */
    menu.addEventListener('click', function (e) {
      if (e.target === menu) close(true);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) close(true);
    });

    /* Quay lại màn hình lớn thì đóng menu, tránh bị bỏ quên ở trạng thái mở */
    window.matchMedia('(min-width: 981px)').addEventListener('change', function (e) {
      if (e.matches) close(false);
    });
  })();

  /* =====================================================================
     4. ĐÁNH DẤU MỤC ĐANG XEM
     ===================================================================== */
  (function initActiveLink() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = links.map(function (a) {
      var id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return null;
      var el = document.querySelector(id);
      if (!el) return null;
      map[id] = a;
      return el;
    }).filter(Boolean);

    if (!sections.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map['#' + e.target.id];
        if (a) a.classList.toggle('is-active', e.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  })();

  /* =====================================================================
     5. ÁNH SÁNG BÁM THEO CON TRỎ TRÊN NÚT KÍNH LỎNG
     ===================================================================== */
  (function initLiquid() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    var buttons = document.querySelectorAll('.liquid, .contact-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  })();

  /* =====================================================================
     6. HIỆU ỨNG XUẤT HIỆN KHI CUỘN
     ===================================================================== */
  (function initReveal() {
    var items = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    var staggerKids = document.querySelectorAll('[data-stagger] > *');
    if (!items.length && !staggerKids.length) return;

    /* Người dùng bảo giảm chuyển động: hiện hết, khỏi chuyển động.
         CSS đã ép hiện bằng !important nên không cần làm gì thêm. */
    if (reduceMotion.matches) return;

    var hasGsap = !!(window.gsap && window.ScrollTrigger);
    var hasIo = 'IntersectionObserver' in window;

    /* KHÔNG bật cờ reveal-armed nếu không có công cụ nào để mở lại nội dung.
         Nếu thiếu cả hai, cứ để nội dung hiện — mất hiệu ứng còn hơn trắng trang. */
    if (!hasGsap && !hasIo) return;

    /* Nguyên tắc: JS chỉ BẬT/TẮT class is-in. Việc hiển thị do CSS đảm
       nhiệm, nên không bao giờ có tình trạng hiệu ứng đã chạy xong mà trang
       vẫn ẩn — đây chính là lỗi xảy ra khi để GSAP tự ghi inline style. */

    /* Bật cờ NGAY TRƯỚC khi gắn trình theo dõi. Từ thời điểm này CSS mới bắt
       đầu ẩn nội dung, và mọi đường bật lại đều đã sẵn sàng chạy được. */
    root.classList.add('reveal-armed');

    if (hasGsap) {
      window.gsap.registerPlugin(window.ScrollTrigger);

      /* Nhịp lệch cho các nhóm card: các phần tử con hiện lên lần lượt thay vì
         tất cả cùng lúc, tạo cảm giác có trật tự. Giá trị của thuộc tính
         data-stagger là độ trễ mỗi phần tử, tính bằng giây. */
      Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (group) {
        var kids = Array.prototype.slice.call(group.children);
        if (!kids.length) return;
        var step = parseFloat(group.getAttribute('data-stagger')) || 0.09;
        kids.forEach(function (kid, i) {
          window.ScrollTrigger.create({
            trigger: group,
            start: 'top 86%',
            once: true,
            onEnter: function () {
              /* Đặt trễ bằng transition-delay thay vì tween: đơn giản và chắc chắn */
              kid.style.transitionDelay = (i * step).toFixed(3) + 's';
              kid.classList.add('is-in');
            }
          });
        });
        group.classList.add('is-in');
      });

      /* Các phần tử reveal lẻ không nằm trong nhóm nào */
      Array.prototype.forEach.call(items, function (el) {
        if (el.closest('[data-stagger]')) return;
        window.ScrollTrigger.create({
          trigger: el,
          start: 'top 86%',
          once: true,
          onEnter: function () { el.classList.add('is-in'); }
        });
      });

    } else {
      /* Dự phòng: GSAP không tải được -> dùng IntersectionObserver.
         Áp dụng cho cả phần tử lẻ lẫn con của nhóm stagger. */
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

      Array.prototype.forEach.call(items, function (el) { io.observe(el); });
      Array.prototype.forEach.call(staggerKids, function (el) { io.observe(el); });
    }
  })();

  /* =====================================================================
     7. CUỘN NGANG SECTION JOURNEY
     ===================================================================== */
  (function initJourney() {
    var track = document.getElementById('journeyTrack');
    if (!track || !window.gsap || !window.ScrollTrigger) return;
    if (reduceMotion.matches) return;

    /* Chỉ chạy trên desktop; mobile đã chuyển sang bố cục dọc bằng CSS.
       Cú pháp đúng của matchMedia là .add(conditions, callback). */
    window.gsap.matchMedia().add('(min-width: 981px)', function () {
      var getAmount = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      window.gsap.to(track, {
        x: function () { return -getAmount(); },
        ease: 'none',
        scrollTrigger: {
          trigger: '#journey',
          start: 'top top',
          end: function () { return '+=' + getAmount(); },
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
    });
  })();

  /* =====================================================================
     8. ẢNH CHÍNH TRÔI NHẸ THEO CUỘN
     ===================================================================== */
  (function initParallax() {
    if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) return;
    /* #beyond-office khong con anh lop — anh nen do da co san mot nguoi,
       dat them anh len se thanh hai nguoi chong nhau. */
    [['#operator', '.operator-person', -5],
     ['#next-chapter', '.next-figure', -6]].forEach(function (row) {
      var sel = row[0], target = row[1], amt = row[2];
      if (!document.querySelector(sel) || !document.querySelector(target)) return;
      window.gsap.to(target, {
        yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: sel, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });
  })();

  /* =====================================================================
     9. LƯỚI AN TOÀN
     ---------------------------------------------------------------------
     Bất cứ lỗi nào xảy ra SAU khi hiệu ứng đã bắt đầu ẩn nội dung, cũng không
     được để lại phần tử nào ở trạng thái ẩn. Ở mức "mất hiệu ứng" còn hơn
     "trắng trang".
     ===================================================================== */
  window.addEventListener('load', function () {
    setTimeout(function () {
      var hidden = document.querySelectorAll(
        '.reveal:not(.is-in), .reveal-left:not(.is-in), .reveal-right:not(.is-in), [data-stagger] > *:not(.is-in)'
      );
      Array.prototype.forEach.call(hidden, function (el) {
        /* Chỉ mở khi thực sự đang ẩn; phần tử đang chuyển động thì để nguyên */
        if (parseFloat(getComputedStyle(el).opacity) < 0.05) el.classList.add('is-in');
      });
    }, 3000);
  });

  /* Nếu có lỗi JS bất kỳ trong quá trình tải, bỏ cờ ẩn-ngay để trở lại bình thường */
  window.addEventListener('error', function () {
    root.classList.remove('reveal-armed');
  });
})();

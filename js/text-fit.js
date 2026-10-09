/* ==========================================================================
   text-fit.js — tự co tiêu đề theo bề rộng thật của chữ
   --------------------------------------------------------------------------
   VÌ SAO CẦN FILE NÀY
   clamp() chỉ dựa trên chiều rộng khung chứa, không biết chữ dài bao nhiêu.
   Cùng một khung 400px nhưng "TỔNG GIÁM ĐỐC" và "CEO" chiếm độ rộng rất khác,
   nên clamp() có thể để chữ tràn ra ngoài hoặc thu nhỏ quá mức.

   Cách ở đây: đo bề rộng chữ THẬT, rồi nhân dần font-size cho tới khi vừa khít.
   Nhờ vậy tiêu đề luôn nằm gọn trong khung ở mọi kích thước màn hình và mọi
   font — kể cả font bạn tải lên từ CMS.

   CÁCH DÙNG
     <h2 class="fit-line">Tiêu đề dài bất kỳ</h2>

   Ghi chú
   - Chạy lại khi: đổi kích thước cửa sổ, đổi theme, và sau khi font tải xong
     (đây là lý do quan trọng nhất: nếu đo trước khi font có, phép đo sẽ sai).
   ========================================================================== */
(function () {
  'use strict';

  var MIN_RATIO = 0.72;   // không bao giờ co nhỏ hơn 72% cỡ gốc
  var PRECISION = 0.5;    // sai số chấp nhận được, tính bằng px

  /* Chạy sau khi trình duyệt đã vẽ xong khung hình, để không chặn lần vẽ đầu */
  var schedule = function (fn) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
    else setTimeout(fn, 60);
  };

  /**
   * Co một phần tử cho vừa bề rộng khung chứa.
   * @param {HTMLElement} el phần tử có .fit-line
   */
  function fitOne(el) {
    if (!el || !el.isConnected) return;

    /* Không có nội dung hoặc đang bị ẩn thì bỏ qua, tránh đo nhầm */
    if (!el.textContent.trim()) return;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;

    var parent = el.parentElement;
    if (!parent) return;

    /* Chừa 1px mỗi bên để tránh vòng lặp vô hạn do làm tròn số thực */
    var available = parent.clientWidth - 2;
    if (available <= 0) return;

    var baseSize = parseFloat(getComputedStyle(el).fontSize);
    if (!baseSize || !isFinite(baseSize)) return;

    /* Nếu vừa khít rồi thì không cần làm gì — trường hợp phổ biến nhất */
    if (el.scrollWidth <= available + PRECISION) {
      el.style.fontSize = '';
      return;
    }

    var ratio = Math.max(MIN_RATIO, available / el.scrollWidth);

    /* Tìm chính xác hơn bằng tìm nhị phân, tránh chữ vừa khít bị cắt 1px */
    var low = MIN_RATIO;
    var high = 1;
    var best = ratio;
    for (var i = 0; i < 6; i++) {
      var mid = (low + high) / 2;
      el.style.fontSize = (baseSize * mid).toFixed(2) + 'px';
      if (el.scrollWidth <= available + PRECISION) { best = mid; low = mid; }
      else { high = mid; }
    }

    /* best luôn >= MIN_RATIO, kể cả khi chữ quá dài — ưu tiên giữ độ rộng chữ */
    el.style.fontSize = (baseSize * best).toFixed(2) + 'px';
  }

  function fitAll() {
    var nodes = document.querySelectorAll('.fit-line');
    for (var i = 0; i < nodes.length; i++) fitOne(nodes[i]);
  }

  /* ---------------------------------------------------------------------
     Tự chạy lại khi cần
     --------------------------------------------------------------------- */

  /* 1. Khi cửa sổ đổi kích thước — dùng rAF chống chạy dồn */
  var pending = false;
  window.addEventListener('resize', function () {
    if (pending) return;
    pending = true;
    schedule(function () { pending = false; fitAll(); });
  }, { passive: true });

  /* 2. Khi phông tải xong — quan trọng nhất. Trước khi phông có, trình duyệt
        đo bằng font dự phòng, nên kết quả sẽ sai. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { schedule(fitAll); });
  }

  /* 3. Khi theme đổi — bề rộng chữ không đổi, nhưng hình nhắc thì nên co lại
        để giữ nhất quán giữa light và dark. */
  window.addEventListener('koko:theme', function () { schedule(fitAll); });

  /* 4. Khi nội dung bị CMS sửa từ xa */
  window.addEventListener('koko:content', function () { schedule(fitAll); });

  /* Chạy lần đầu, và chạy lại sau khi mọi thứ đã tải xong */
  schedule(fitAll);
  window.addEventListener('load', function () { schedule(fitAll); });

  window.KOKO = window.KOKO || {};
  window.KOKO.fitText = fitAll;
})();

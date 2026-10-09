/* ==========================================================================
   text-fit.js — tự co tiêu đề theo bề rộng thật của chữ
   --------------------------------------------------------------------------
   VÌ SAO CẦN FILE NÀY
   clamp() chỉ dựa trên chiều rộng khung chứa, không biết chữ dài bao nhiêu.
   Cùng một khung 500px nhưng "CHUYÊN VIÊN TƯ VẤN" và "SIDE." chiếm độ rộng
   rất khác, nên clamp() có thể để chữ tràn ra ngoài.

   CÁCH Ở ĐÂY
   Đo bề rộng chữ THẬT, rồi nhân tất cả các dòng của cùng một tiêu đề theo
   MỘT tỉ lệ chung, cho tới khi dòng dài nhất vừa khung.

   ⚠ VÌ SAO PHẢI CHUNG TỈ LỆ
   Bản đầu tiên co TỪNG DÒNG RIÊNG, khiến dòng ngắn bị kéo giãn hết chiều
   ngang. "The human / side." trở thành "THE HUMAN" nhỏ và "SIDE." khổng lồ,
   mất hẳn nhịp thị giác. Tiêu đề nhiều dòng phải giữ nguyên quan hệ cỡ chữ
   giữa các dòng, nên chỉ dòng DÀI NHẤT quyết định tỉ lệ, các dòng còn lại
   đi theo.

   CÁCH DÙNG
     <h2>
       <span class="fit-line">Dòng một</span>
       <span class="fit-line">Dòng hai</span>
     </h2>

   Các dòng được gom theo phần tử cha chung, nên mọi .fit-line cùng một
   <h1>/<h2> sẽ luôn dùng chung tỉ lệ.
   ========================================================================== */
(function () {
  'use strict';

  var MIN_RATIO = 0.72;   // không co nhỏ hơn 72% cỡ thiết kế
  var PRECISION = 0.5;    // sai số chấp nhận được, tính bằng px

  /* Tiêu đề nhiều dòng thường CỐ Ý dùng cỡ khác nhau giữa các dòng, ví dụ
     "The human" (lớn) rồi "side." (nhỏ hơn, lệch xuống). Đó là thiết kế,
     không phải lỗi. Thuộc tính data-fit-scale ghi lại tỉ lệ cỡ chữ mong
     muốn của từng dòng so với dòng gốc:
        data-fit-scale="1"    — cùng cỡ với dòng dài nhất (mặc định)
        data-fit-scale="0.72" — nhỏ hơn có chủ đích
     Khi co, mọi dòng cùng nhân một hệ số, nên giữ nguyên sự khác biệt này.
     Nếu bỏ qua, mọi dòng bị ép về cùng cỡ và nhịp thị giác vỡ. */

  /* Chạy sau khi trình duyệt vẽ xong khung hình, để không chặn lần vẽ đầu */
  var schedule = function (fn) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
    else setTimeout(fn, 60);
  };

  /* Bỏ mọi font-size đã đặt tay, đặt tạm về cỡ thiết kế, trả về bề rộng
     của từng dòng.
     Bắt buộc phải xoá trước khi đo, nếu không sẽ đo trên kết quả của lần
     trước và co chữ ngày một chạy về 0. */
  function doRongGoc(nhom, coGoc, tyLe) {
    var rong = [];
    for (var i = 0; i < nhom.length; i++) {
      nhom[i].style.fontSize = '';
      /* Cỡ thiết kế lấy từ thẻ tiêu đề (cha sâu hơn một cấp) nên phải đặt
         tường minh, vì font-size:inherit không tự nhận giá trị đó. */
      nhom[i].style.fontSize = (coGoc * (tyLe ? tyLe[i] : 1)).toFixed(2) + 'px';
      rong.push(nhom[i].scrollWidth);
      nhom[i].style.fontSize = '';
    }
    return rong;
  }

  /**
   * Lấy cỡ chữ THIẾT KẾ của tiêu đề, không phải cỡ sau khi bị co.
   *
   * Vì sao phải tìm "cha thật": .fit-line dùng font-size:inherit nên lấy cỡ
   * từ cha trực tiếp. Nhưng .contact h2 có class fit-line ngay trên thẻ h2,
   * nên phần tử cha lại là div (16px). Nếu lấy cỡ của cha, ta sẽ co tiêu đề
   * 153px xuống còn 16px. Vì vậy phải dò lên tìm phần tử cha có cỡ chữ lớn
   * — tức là tiêu đề thật sự mang nội dung.
   */
  function coThietKe(nhom) {
    var phanTu = nhom[0];
    while (phanTu && phanTu !== document.body) {
      var tag = phanTu.tagName;
      if (/^H[1-6]$/.test(tag)) {
        var size = parseFloat(getComputedStyle(phanTu).fontSize);
        if (size && isFinite(size)) return size;
      }
      phanTu = phanTu.parentElement;
    }
    /* Không tìm thấy thẻ tiêu đề: lấy cỡ của cha */
    return parseFloat(getComputedStyle(nhom[0]).fontSize);
  }

  /**
   * Co một nhóm dòng (cùng thuộc một tiêu đề) cho vừa khung.
   * @param {HTMLElement[]} nhom các .fit-line dùng chung phần tử cha
   */
  function fitNhom(nhom) {
    if (!nhom || !nhom.length) return;

    var cha = nhom[0].parentElement;
    if (!cha) return;

    /* Bỏ qua nếu tiêu đề đang ẩn — đo lúc đó ra số 0 rồi co nhầm */
    if (!nhom[0].textContent.trim()) return;
    if (nhom[0].offsetParent === null) return;

    /* Khung đo: dùng khả năng chứa thật của khối tiêu đề */
    var khung = cha.getBoundingClientRect();
    var available = Math.min(cha.clientWidth, khung.width) - 2;
    if (available <= 0) return;

    var coGoc = coThietKe(nhom);
    if (!coGoc || !isFinite(coGoc) || coGoc <= 0) return;

    /* Tỉ lệ thiết kế của từng dòng so với cỡ gốc (mặc định là 1) */
    var tyLe = [];
    for (var t = 0; t < nhom.length; t++) {
      var s = parseFloat(nhom[t].getAttribute('data-fit-scale'));
      tyLe.push(isFinite(s) && s > 0 ? s : 1);
    }

    /* Đo bề rộng ở đúng cỡ thiết kế của từng dòng, không phải cỡ hiện tại */
    var rongGoc = doRongGoc(nhom, coGoc, tyLe);

    /* Dòng vừa khung nhất quyết định cả khối co bao nhiêu */
    var daiNhat = 0;
    for (var i = 0; i < rongGoc.length; i++) {
      if (rongGoc[i] > daiNhat) daiNhat = rongGoc[i];
    }

    /* Vừa khít rồi thì giữ nguyên cỡ thiết kế — trường hợp phổ biến nhất */
    if (daiNhat <= available + PRECISION) {
      /* Vẫn phải áp lại tỉ lệ thiết kế cho các dòng nhỏ hơn có chủ đích */
      for (var z = 0; z < nhom.length; z++) {
        if (tyLe[z] !== 1) nhom[z].style.fontSize = (coGoc * tyLe[z]).toFixed(2) + 'px';
      }
      return;
    }

    /* Tìm chính xác bằng tìm nhị phân */
    var low = MIN_RATIO;
    var high = 1;
    var heSo = available / daiNhat;

    for (var lan = 0; lan < 8; lan++) {
      var mid = (low + high) / 2;
      for (var k = 0; k < nhom.length; k++) {
        nhom[k].style.fontSize = (coGoc * tyLe[k] * mid).toFixed(2) + 'px';
      }
      var rongHienTai = 0;
      for (var j = 0; j < nhom.length; j++) {
        if (nhom[j].scrollWidth > rongHienTai) rongHienTai = nhom[j].scrollWidth;
      }
      if (rongHienTai <= available + PRECISION) { heSo = mid; low = mid; }
      else { high = mid; }
    }

    /* Chặn dưới MIN_RATIO: chữ quá dài thì ưu tiên giữ khả năng đọc
       thay vì thu nhỏ tới mức không ai đọc nổi. Khung còn chặn tràn ngang. */
    if (heSo < MIN_RATIO) heSo = MIN_RATIO;

    /* Mọi dòng nhân CÙNG một hệ số, nên sự khác biệt cỡ chữ có chủ đích
       được giữ nguyên — đây là điều bản co-đồng-loạt-trước đây làm mất. */
    for (var m = 0; m < nhom.length; m++) {
      nhom[m].style.fontSize = (coGoc * tyLe[m] * heSo).toFixed(2) + 'px';
    }
  }

  /** Gom các .fit-line theo phần tử cha, rồi co từng nhóm. */
  function fitAll() {
    var tatCa = document.querySelectorAll('.fit-line');
    var nhom = [];
    var index = [];

    for (var i = 0; i < tatCa.length; i++) {
      var cha = tatCa[i].parentElement;
      if (!cha) continue;
      var viTri = index.indexOf(cha);
      if (viTri === -1) {
        index.push(cha);
        nhom.push([tatCa[i]]);
      } else {
        nhom[viTri].push(tatCa[i]);
      }
    }

    for (var j = 0; j < nhom.length; j++) fitNhom(nhom[j]);
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

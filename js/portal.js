/* ==========================================================================
   portal.js — hiệu ứng "cổng mở" cho hero
   --------------------------------------------------------------------------
   Nguyên lý: đọc vị trí cuộn của section hero, quy ra một số từ 0 đến 1,
   rồi dịch hai tấm nền ra, thu ảnh lại, kéo giãn chữ.

   VÌ SAO VIẾT RIÊNG, KHÔNG NHỒI VÀO app.JS
     1. Nếu file này lỗi hoặc không tải được, hero vẫn hiển thị đúng,
        chỉ mất hiệu ứng trượt — vì CSS đặt sẵn vị trí mặc định.
     2. Dễ kiểm tra riêng, dễ tắt.

   TỐI ƯU
     - Dùng requestAnimationFrame và cờ pending: trong lúc cuộn liên tục,
       mỗi khung hình chỉ tính lại đúng một lần.
     - passive:true để không chặn cuộn trên điện thoại.
     - Dùng biến tối thiểu: chỉ ghi style khi giá trị thực sự đổi.
   ========================================================================== */
(function () {
  'use strict';

  var portal = document.getElementById('hero');
  if (!portal) return;

  /* Người dùng bật giảm chuyển động thì đứng yên. CSS đã rút ngắn chiều cao,
     không cần làm gì thêm ở đây. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var image = portal.querySelector('.portal-image');
  var duotone = portal.querySelector('.portal-duotone');
  var panelLeft = portal.querySelector('.portal-panel.left');
  var panelRight = portal.querySelector('.portal-panel.right');
  var word = portal.querySelector('.portal-word');
  var wordInner = portal.querySelector('.portal-word .word');
  var dots = portal.querySelectorAll('.portal-dot');

  if (!panelLeft || !panelRight || !wordInner) return;

  /* Lưu giá trị cũ để không ghi style mỗi khung hình vô nghĩa */
  var cu = { t: -1, tracked: false };

  function calc() {
    var h = portal.offsetHeight;
    var vh = window.innerHeight;
    var quang = h - vh;
    /* Tránh chia cho 0 khi section bằng đúng một màn hình */
    var y = portal.getBoundingClientRect().top;
    var p = quang > 0 ? Math.max(0, Math.min(1, -y / quang)) : 0;

    /* Dồn toàn bộ hiệu ứng vào nửa đầu quãng cuộn, phần sau giữ nguyên
       trạng thái mở hoàn toàn. con số 2.1 là độ sớm muốn có. */
    var t = Math.min(1, p * 2.1);

    if (Math.abs(t - cu.t) < 0.0008) return;
    cu.t = t;

    /* Hai tấm nền trượt ra khỏi khung */
    panelLeft.style.transform = 'translateX(' + (-t * 115) + '%)';
    panelRight.style.transform = 'translateX(' + (t * 115) + '%)';

    /* Ảnh thu lại nhẹ, tạo cảm giác đi sâu vào khung hình */
    if (image) image.style.transform = 'scale(' + (1.16 - 0.16 * t) + ')';

    /* Lớp màu hổ phách + teal hiện dần */
    if (duotone) duotone.style.opacity = (0.12 * t).toFixed(3);

    /* Chữ to ra rồi giãn rộng, giống bản mẫu */
    word.style.transform = 'scale(' + (1 + 0.16 * t) + ')';
    wordInner.style.letterSpacing = (0.01 - 0.055 * t).toFixed(4) + 'em';
    wordInner.style.transform = 'translateX(' + (-t * 3.5) + 'vw)';

    /* Hai chấm sáng trôi ra hai hướng */
    if (dots.length === 2) {
      dots[0].style.transform = 'translate(' + (-t * 34) + 'vw,' + (-t * 20) + 'vh)';
      dots[1].style.transform = 'translate(' + (t * 34) + 'vw,' + (t * 20) + 'vh)';
    }
  }

  var pending = false;
  function onScroll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; calc(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    cu.t = -1;          /* ép tính lại vì khung đã đổi */
    onScroll();
  }, { passive: true });

  calc();

  /* Bỏ hiệu ứng khi cuộn khỏi hero, tiết kiệm pin */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) onScroll();
      });
    }, { threshold: 0 }).observe(portal);
  }
})();

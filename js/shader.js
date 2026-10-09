/* ==========================================================================
   shader.js — nền ánh kim chuyển động
   --------------------------------------------------------------------------
   JD dùng Three.js để vẽ shader. Ở đây ta chỉ cần một lớp sáng mềm trôi
   nền, nên Canvas 2D cho kết quả gần tương đương, nhẹ hơn nhiều, và không
   phụ thuộc CDN — điều quan trọng vì một CDN chết là trang trắng chữ.

   Ba lớp sáng chồng nhau tạo cảm giác ánh kim:
     1. Vệt sáng nghiêng lướt chậm (gradient tuyến tính)
     2. Hai quầng sáng lớn, mờ, trôi chậm (radial gradient)
     3. Lớp hạt mờ rất nhẹ để bề mặt không bị phẳng

   RẤT QUAN TRỌNG: độ mờ thấp (0.5 ở dark, 0.3 ở light) để chữ luôn đọc
   được. Đây là nền trang, không phải nhân vật chính.

   Tự tắt khi: tab bị ẩn, cuộn ra khỏi khung nhìn, hoặc người dùng bật
   prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('goldShader');
  if (!canvas || !canvas.getContext) return;

  /* Không vẽ nếu người dùng đã yêu cầu giảm chuyển động */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.remove();
    return;
  }

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var w = 0, h = 0, dpr = 1;
  var running = true;
  var onScreen = true;

  /* Màu lấy từ biến CSS để đổi theme là shader đổi theo */
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    var gold = cs.getPropertyValue('--gold-soft').trim() || '#e8cf9b';
    var wine = cs.getPropertyValue('--wine').trim() || '#ba1126';
    return { gold: gold, wine: wine };
  }
  var colors = readColors();

  /* Dựng hình con ngươi từ chuỗi hex; trả về dạng rgba với alpha cho trước */
  function withAlpha(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return 'rgba(232,207,155,' + alpha + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function resize() {
    /* Giới hạn mật độ điểm ảnh ở 1.5: trên màn hình 3x, vẽ ở độ phân giải
       gốc sẽ tốn pin mà mắt thường không nhận ra khác biệt. */
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    if (!running || !onScreen) return;
    ctx.clearRect(0, 0, w, h);

    /* thời gian tính bằng giây, chuẩn hoá theo giới hạn 120000ms của rAF */
    var time = (t % 120000) / 1000;

    /* --- 1. Vệt sáng nghiêng, lướt rất chậm --- */
    var bandW = w * 1.6;
    var x = ((time * 14) % (w + bandW)) - bandW;
    var skew = w * 0.28;
    var band = ctx.createLinearGradient(x, 0, x + bandW, h);
    band.addColorStop(0.00, 'rgba(0,0,0,0)');
    band.addColorStop(0.42, withAlpha(colors.gold, 0.13));
    band.addColorStop(0.52, withAlpha(colors.gold, 0.07));
    band.addColorStop(0.60, withAlpha(colors.wine, 0.05));
    band.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.transform(1, 0, -skew / h, 1, skew, 0);
    ctx.fillStyle = band;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    ctx.restore();

    /* --- 2. Hai quầng sáng trôi chậm --- */
    var r1 = Math.max(w, h) * 0.55;
    var c1x = w * (0.22 + 0.14 * Math.sin(time * 0.16));
    var c1y = h * (0.28 + 0.11 * Math.cos(time * 0.13));
    var g1 = ctx.createRadialGradient(c1x, c1y, 0, c1x, c1y, r1);
    g1.addColorStop(0, withAlpha(colors.gold, 0.16));
    g1.addColorStop(1, withAlpha(colors.gold, 0));
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    var r2 = Math.max(w, h) * 0.42;
    var c2x = w * (0.78 + 0.12 * Math.cos(time * 0.11));
    var c2y = h * (0.72 + 0.1 * Math.sin(time * 0.14));
    var g2 = ctx.createRadialGradient(c2x, c2y, 0, c2x, c2y, r2);
    g2.addColorStop(0, withAlpha(colors.wine, 0.18));
    g2.addColorStop(1, withAlpha(colors.wine, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    /* --- 3. Lớp hạt mờ ---
       Chừa chỗ nhỏ cho độ dày mực trên mỗi pixel nếu có sẵn; không có thì bỏ,
       để đỡ tốn. */
    if (ctx.fillStyle !== null && w * h < 4200000) {
      ctx.fillStyle = 'rgba(255,255,255,.014)';
      for (var i = 0; i < 34; i++) {
        var gx = (Math.sin(i * 12.9898 + time * 0.2) * 0.5 + 0.5) * w;
        var gy = (Math.cos(i * 78.233 + time * 0.17) * 0.5 + 0.5) * h;
        ctx.fillRect(gx, gy, 1.4, 1.4);
      }
    }

    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------------------
     Quản lý vòng lặp — điểm mấu chốt để không đốt pin
     --------------------------------------------------------------------- */

  /* Tab bị ẩn: dừng hẳn, không vẽ nữa */
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(draw);
  });

  /* Lướt ra khỏi khung nhìn: tạm dừng, quay lại thì vẽ tiếp */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { onScreen = e.isIntersecting; });
    }, { threshold: 0 }).observe(canvas);
  }

  /* Đổi kích thước */
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 180);
  }, { passive: true });

  /* Đổi theme: nạp lại màu rồi vẽ lại ngay khung hình kế tiếp */
  window.addEventListener('koko:theme', function () {
    colors = readColors();
    if (onScreen) draw(performance.now());
  });

  resize();
  requestAnimationFrame(draw);
})();

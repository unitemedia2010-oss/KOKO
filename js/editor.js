/* ==========================================================================
   editor.js — SỬA NỘI DUNG TRỰC TIẾP TRÊN TRANG
   --------------------------------------------------------------------------
   Mở: https://linhtruong.vn/?edit   (thêm chữ "edit" vào cuối đường dẫn)

   CÁCH DÙNG
     1. Mở trang có đuôi ?edit
     2. Nhập mật khẩu
     3. Bấm vào bất kỳ đoạn chữ nào trên trang để sửa
     4. Bấm Ctrl+S hoặc nút Lưu để ghi vào Google Sheets
     5. Trang tải lại, nội dung mới hiện ngay

   VÌ SAO LẠI LÀM THẾ NÀY
     Bảng điều khiển admin.html đủ dùng nhưng không trực quan: phải nhớ
     câu chữ nằm ở ô nào, tự nhìn xem thay đổi có hợp không.
     Sửa tại chỗ thì nhìn thấy ngay trên đúng trang đang sống.

   NGUYÊN TẮC
     - Chỉ bật khi có ?edit trong URL. Không bao giờ tự bật.
     - Cần mật khẩu. Không lưu mật khẩu vào localStorage, chỉ giữ trong
       phiên làm việc.
     - Trước khi lưu, chỉ gửi những ô đã thay đổi.
     - Có thể bỏ một nội dung đã lưu trước đó (khôi phục về chữ gốc
       trong HTML) — cần cho trường hợp sửa nhầm rồi muốn quay lại.
     - Không sửa được nội dung nằm trong phần tử cha có phần tử con,
       vì sửa như vậy sẽ phá cấu trúc.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Điều kiện bật ---------- */
  if (!/[?&]edit\b/.test(location.search)) return;

  /* Cấu hình nằm ngay trong file này chứ không tách ra file riêng, để
     người xem bình thường không phải tải thêm một request nào.
     Đổi URL Apps Script thì sửa ở đây và ở admin-config.js cho khớp. */
  var CFG = {
    backend: 'https://script.google.com/macros/s/AKfycbz82msR9fAC2hObTMzb-9WpLTqahEVAoQfUPfk2N6B6YtFp8PY5Nfk98d4vtJBT44Dl/exec',
    duoiGiuDuongDan: ''      // đường dẫn quay lại sau khi thoát chế độ sửa
  };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---------- 2. Trạng thái ---------- */
  var st = {
    quyen: false,          // đã nhập mật khẩu đúng
    goc: {},              // khoá -> giá trị gốc trong HTML
    daLuu: {},            // khoá -> giá trị đang có trên Sheet
    dangSua: null,        // phần tử đang gõ
    nhap: {},             // khoá -> giá trị đang sửa, chưa lưu
    busy: false
  };

  /* ---------- 3. Gọi Apps Script bằng JSONP ----------
     Trang tĩnh khác origin với script.google.com nên fetch bị chặn CORS.
     JSONP là cách duy nhất đọc được phản hồi mà không cần cấu hình CORS. */
  function goi(action, duLieu) {
    return new Promise(function (resolve, reject) {
      var cb = '__kokoEdit' + Math.random().toString(36).slice(2, 11);
      var s = document.createElement('script');
      var het = setTimeout(function () {
        don(); reject(new Error('Không nhận phản hồi sau 25 giây.'));
      }, 25000);
      function don() { clearTimeout(het); if (s.parentNode) s.parentNode.removeChild(s); delete window[cb]; }

      window[cb] = function (dl) { don(); resolve(dl); };
      s.onerror = function () {
        don();
        reject(new Error('Không gọi được Apps Script. Kiểm tra kết nối mạng.'));
      };
      var url = CFG.backend + '?action=' + encodeURIComponent(action);
      if (duLieu) url += '&payload=' + encodeURIComponent(JSON.stringify(duLieu));
      url += '&callback=' + cb;
      s.src = url;
      document.head.appendChild(s);
    });
  }

  /* ---------- 4. Hộp thoại nhập mật khẩu ---------- */
  function hoiMatKhau() {
    return new Promise(function (resolve) {
      var ve = document.createElement('div');
      ve.className = 'ed-login';
      ve.innerHTML =
        '<div class="ed-login-card" role="dialog" aria-modal="true" aria-label="Đăng nhập để sửa">' +
          '<h2>Chế độ sửa nội dung</h2>' +
          '<p>Nhập mật khẩu quản trị để sửa trực tiếp trên trang.</p>' +
          '<input type="password" id="edPass" placeholder="Mật khẩu" autocomplete="current-password" />' +
          '<div class="ed-login-msg" id="edMsg"></div>' +
          '<div class="ed-login-btns">' +
            '<button class="ed-btn ghost" id="edCancel" type="button">Huỷ</button>' +
            '<button class="ed-btn primary" id="edOk" type="button">Vào chế độ sửa</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ve);

      var input = ve.querySelector('#edPass');
      var msg = ve.querySelector('#edMsg');
      setTimeout(function () { input.focus(); }, 60);

      function dong() { ve.remove(); resolve(null); }

      ve.querySelector('#edCancel').addEventListener('click', dong);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { dong(); }
        if (e.key === 'Enter') xacNhan();
      });

      function xacNhan() {
        var mk = input.value;
        if (!mk) return;
        msg.textContent = 'Đang kiểm tra…';
        msg.className = 'ed-login-msg';
        goi('verify', { password: mk }).then(function (dl) {
          if (dl && dl.ok) {
            ve.remove();
            resolve(mk);
          } else {
            msg.textContent = (dl && dl.message) || 'Mật khẩu không đúng.';
            msg.className = 'ed-login-msg err';
            input.select();
          }
        }).catch(function (e) {
          msg.textContent = e.message;
          msg.className = 'ed-login-msg err';
        });
      }
      ve.querySelector('#edOk').addEventListener('click', xacNhan);
    });
  }

  /* ---------- 5. Giao diện ---------- */
  function themGiaoDien() {
    var css = document.createElement('style');
    css.textContent = CSS;
    document.head.appendChild(css);

    var bar = document.createElement('div');
    bar.className = 'ed-bar';
    /* Chữ dài được bọc trong .ed-dai để ẩn đi trên điện thoại, giúp
       thanh công cụ chỉ còn một hàng nên không che nội dung. */
    bar.innerHTML =
      '<span class="ed-dot"></span>' +
      '<span class="ed-bar-title">Đang sửa nội dung</span>' +
      '<span class="ed-count" id="edCount"></span>' +
      '<span class="ed-bar-sep"></span>' +
      '<button class="ed-btn ghost sm" id="edUndo" type="button" disabled>Bỏ<span class="ed-dai"> thay đổi</span></button>' +
      '<button class="ed-btn ghost sm ed-chi-rong" id="edRevert" type="button" title="Xoá nội dung đã lưu, đưa trang về chữ gốc trong HTML">Khôi phục chữ gốc</button>' +
      '<button class="ed-btn primary sm" id="edSave" type="button" disabled>Lưu<span class="ed-dai"> (Ctrl+S)</span></button>' +
      '<span class="ed-bar-sep"></span>' +
      '<button class="ed-btn ghost sm" id="edExit" type="button">Thoát</button>';
    document.body.appendChild(bar);

    $('#edSave').addEventListener('click', luuTatCa);
    $('#edUndo').addEventListener('click', boThayDoi);
    $('#edRevert').addEventListener('click', khoiPhucGoc);
    $('#edExit').addEventListener('click', function () {
      if (Object.keys(st.nhap).length && !confirm('Bạn còn thay đổi chưa lưu. Thoát và bỏ chúng?')) return;
      var u = location.pathname + (CFG.duoiGiuDuongDan || '');
      location.href = u;
    });

    var ghi = document.createElement('div');
    ghi.className = 'ed-toasts';
    ghi.id = 'edToasts';
    document.body.appendChild(ghi);

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!st.busy) luuTatCa();
      }
      if (e.key === 'Escape' && st.dangSua) ketThucSua();
    });
  }

  function baoLoai(loai, tieuDe, chiTiet) {
    var wrap = $('#edToasts');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'ed-toast ' + loai;
    el.innerHTML = '<b>' + (tieuDe || '') + '</b>' +
      (chiTiet ? '<span>' + chiTiet + '</span>' : '');
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, loai === 'err' ? 7000 : 3600);
    setTimeout(function () { el.remove(); }, loai === 'err' ? 7400 : 4000);
  }

  /* ---------- 6. Chuẩn bị danh sách sửa được ---------- */
  function chuanBi() {
    var danh = $$('[data-cms]');
    var ok = 0, bo = 0;

    danh.forEach(function (el) {
      var khoa = el.getAttribute('data-cms');

      /* Ô có phần tử con: sửa sẽ phá cấu trúc, bỏ qua.
         Ví dụ thẻ <a><span>Chữ</span></a> — sửa thẻ a sẽ nuốt mất span. */
      if (el.children.length > 0) { el.setAttribute('data-ed-skip', 'co-con'); bo++; return; }
      if (el.closest('[data-ed-skip-anc]')) { bo++; return; }

      st.goc[khoa] = el.textContent;
      el.setAttribute('data-ed-khoa', khoa);
      ok++;
    });

    $$('[data-cms-img]').forEach(function (img) {
      var khoa = img.getAttribute('data-cms-img');
      st.goc[khoa + '::src'] = img.getAttribute('src');
      img.setAttribute('data-ed-khoa', khoa + '::src');
      ok++;
    });

    return { ok: ok, bo: bo };
  }

  /* ---------- 7. Bật/tắt chế độ sửa ---------- */
  function bat(duLieuSheet) {
    st.quyen = true;
    st.daLuu = duLieuSheet || {};
    document.body.classList.add('ed-on');

    var r = chuanBi();
    document.documentElement.classList.add('ed-active');

    /* Áp nội dung đã lưu lên trang, để bạn thấy đúng trạng thái
       đang sống chứ không phải chữ gốc trong HTML. */
    var daAp = 0;
    Object.keys(st.daLuu).forEach(function (k) {
      if (k.indexOf('::') > -1) return;                 /* ảnh xử lý riêng */
      var el = document.querySelector('[data-ed-khoa="' + k + '"]');
      if (!el) return;
      if (el.textContent !== st.daLuu[k]) { el.textContent = st.daLuu[k]; daAp++; }
    });
    $$('[data-cms-img]').forEach(function (img) {
      var k = img.getAttribute('data-cms-img');
      if (st.daLuu[k + '::src']) img.setAttribute('src', st.daLuu[k + '::src']);
    });

    /* Chữ vừa thay đổi kích thước, cần co lại cho vừa khung */
    if (window.KOKO && window.KOKO.fitText) setTimeout(function () { window.KOKO.fitText(); }, 80);

    capNhatThanhCong();

    baoLoai('ok', 'Đã bật chế độ sửa',
      'Bấm vào chữ để sửa. Có ' + r.ok + ' chỗ sửa được. ' +
      (daAp ? 'Đã nạp ' + daAp + ' nội dung đã lưu trước đó.' : 'Chưa có nội dung nào được lưu.'));
  }

  /* ---------- 8. Bấm để sửa ---------- */
  function batDauSua(el) {
    if (!st.quyen || st.busy) return;
    if (st.dangSua && st.dangSua !== el) ketThucSua();
    st.dangSua = el;
    el.setAttribute('contenteditable', 'plaintext-only');
    /* contenteditable="plaintext-only" không được Safari hỗ trợ,
       dùng true cho chắc và chặn dán HTML ở sự kiện paste. */
    el.setAttribute('spellcheck', 'false');
    el.classList.add('ed-sua');
    el.focus();

    var phamVi = el.ownerDocument.createRange();
    phamVi.selectNodeContents(el);
    var chon = el.ownerDocument.getSelection();
    chon.removeAllRanges();
    chon.addRange(phamVi);

    el.addEventListener('paste', chanDanHTML);
    el.addEventListener('keydown', phimTrongO);
  }

  function ketThucSua() {
    var el = st.dangSua;
    if (!el) return;
    st.dangSua = null;
    el.removeAttribute('contenteditable');
    el.classList.remove('ed-sua');
    el.removeEventListener('paste', chanDanHTML);
    el.removeEventListener('keydown', phimTrongO);

    var khoa = el.getAttribute('data-ed-khoa');
    if (!khoa) return;

    /* So sánh với bản đang lưu trên Sheet, không phải với chữ gốc trong
       HTML — vì nếu đã lưu rồi thì chữ gốc đã không còn ý nghĩa. */
    var giaTri = el.textContent.replace(/\s+/g, ' ').trim();
    var hienTai = st.daLuu[khoa] !== undefined ? st.daLuu[khoa] : st.goc[khoa];

    if (giaTri === hienTai) delete st.nhap[khoa];
    else st.nhap[khoa] = giaTri;

    capNhatThanhCong();
  }

  /* Bấm vào chữ để sửa; bấm ra ngoài thì kết thúc, không mất gì đã gõ
     vì biến nhập cập nhật liên tục. */
  document.addEventListener('click', function (e) {
    if (!st.quyen || st.busy) return;

    /* Bấm trong thanh công cụ hoặc trong hộp thoại: không đụng vào nội dung */
    if (e.target.closest('.ed-bar') || e.target.closest('.ed-login') || e.target.closest('.ed-toasts')) return;

    var o = e.target.closest('[data-ed-khoa]');
    if (o) {
      if (o.tagName === 'IMG') { suaAnh(o); e.preventDefault(); return; }
      /* Bấm vào ô khác trong lúc đang sửa ô này: kết thúc ô cũ rồi mở ô mới */
      if (st.dangSua && st.dangSua !== o) ketThucSua();
      e.preventDefault();
      batDauSua(o);
      return;
    }

    if (st.dangSua) ketThucSua();
  });

  /* Đổi ảnh: không nhập tên khoá mà chọn tập tin, nhúng ngay để thấy
     trước khi ghi. Chỉ đổi đường dẫn ảnh — không ghi file lên hosting. */
  function suaAnh(img) {
    var khoa = img.getAttribute('data-ed-khoa');
    var cu = img.getAttribute('src');
    var moi = prompt('Đường dẫn ảnh mới cho "' + khoa + '"\n\nVí dụ: assets/images/ten-anh.webp\n\n(Để trống nếu muốn bỏ thay đổi)', cu);
    if (moi === null) return;
    moi = moi.trim();
    if (!moi || moi === cu) return;
    if (!/^https?:\/\//i.test(moi) && !moi.startsWith('/') && !moi.startsWith('assets/')) {
      baoLoai('err', 'Đường dẫn ảnh không hợp lệ', 'Phải bắt đầu bằng https://, / hoặc assets/');
      return;
    }
    img.src = moi;
    st.nhap[khoa] = moi;
    capNhatThanhCong();
    baoLoai('info', 'Đã đổi ảnh — nhớ bấm Lưu', 'Kiểm tra xem ảnh có hiện đúng không rồi mới lưu.');
  }

  function chanDanHTML(e) {
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  }

  function phimTrongO(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ketThucSua(); }
    if (e.key === 'Escape') { e.preventDefault(); ketThucSua(); }
  }

  function capNhatThanhCong() {
    var so = Object.keys(st.nhap).length;
    $('#edSave').disabled = so === 0 || st.busy;
    $('#edUndo').disabled = so === 0 || st.busy;
    $('#edCount').textContent = so > 0 ? so + ' chỗ đã sửa' : 'Chưa sửa gì';
    $$('[data-ed-khoa]').forEach(function (el) {
      el.classList.toggle('ed-doi', st.nhap[el.getAttribute('data-ed-khoa')] !== undefined);
    });
  }

  /* ---------- 9. Lưu ---------- */
  function luuTatCa() {
    if (st.busy) return;
    ketThucSua();

    var ds = Object.keys(st.nhap).filter(function (k) { return st.nhap[k] !== st.daLuu[k]; });
    if (!ds.length) { baoLoai('info', 'Chưa có thay đổi nào để lưu'); return; }

    /* Kiểm tra trước, để không tốn lượt gọi mạng rồi mới báo lỗi */
    for (var i = 0; i < ds.length; i++) {
      var k = ds[i], gt = st.nhap[k];
      if (!gt) { baoLoai('err', 'Không thể lưu: "' + k + '" đang trống'); return; }
      if (gt.length > 4000) { baoLoai('err', '"' + k + '" dài ' + gt.length + ' ký tự, vượt giới hạn 4000'); return; }
      if (/^[=+\-@]/.test(gt)) {
        baoLoai('err', '"' + k + '" bắt đầu bằng = + - hoặc @', 'Google Sheets sẽ hiểu là công thức.');
        return;
      }
    }

    st.busy = true;
    capNhatThanhCong();
    baoLoai('info', 'Đang lưu ' + ds.length + ' chỗ…');

    var mk = st.matKhau;
    var thanhCong = { ok: 0, loi: [] };
    var i2 = 0;

    function tiep() {
      if (i2 >= ds.length) {
        st.busy = false;
        capNhatThanhCong();
        if (thanhCong.ok === ds.length) {
          ds.forEach(function (k) { st.daLuu[k] = st.nhap[k]; });
          st.nhap = {};
          baoLoai('ok', 'Đã lưu ' + thanhCong.ok + ' chỗ vào Google Sheets',
            'Đang tải lại trang để bạn xem kết quả…');
          setTimeout(function () { location.reload(); }, 1100);
        } else {
          baoLoai('err', thanhCong.ok + '/' + ds.length + ' chỗ đã lưu',
            thanhCong.loi[0] || 'Có chỗ không lưu được.');
        }
        return;
      }
      var khoa = ds[i2];
      goi('cmsSave', { action: 'cmsSave', key: khoa, value: st.nhap[khoa], password: mk })
        .then(function (dl) {
          if (dl && dl.ok) thanhCong.ok++;
          else thanhCong.loi.push((dl && dl.message) || ('Không lưu được "' + khoa + '".'));
        })
        .catch(function (e) { thanhCong.loi.push(e.message); })
        .then(function () { i2++; tiep(); });
    }
    tiep();
  }

  function boThayDoi() {
    if (!Object.keys(st.nhap).length) return;
    if (!confirm('Bỏ ' + Object.keys(st.nhap).length + ' thay đổi chưa lưu?')) return;
    st.nhap = {};
    $$('[data-ed-khoa]').forEach(function (el) {
      var k = el.getAttribute('data-ed-khoa');
      var gt = st.daLuu[k] !== undefined ? st.daLuu[k] : st.goc[k];
      if (gt !== undefined) {
        if (k.indexOf('::src') > -1) el.setAttribute('src', gt);
        else el.textContent = gt;
      }
    });
    if (window.KOKO && window.KOKO.fitText) window.KOKO.fitText();
    capNhatThanhCong();
    baoLoai('info', 'Đã bỏ thay đổi chưa lưu');
  }

  /* Xoá nội dung đã lưu trên Sheet, đưa trang về chữ gốc trong HTML.
     Dùng khi sửa nhầm rồi muốn quay lại đúng bản gốc. */
  function khoiPhucGoc() {
    if (!Object.keys(st.daLuu).length) { baoLoai('info', 'Chưa có nội dung nào được lưu, không cần khôi phục'); return; }
    var so = Object.keys(st.daLuu).length;
    if (!confirm('Xoá ' + so + ' nội dung đã lưu trên Google Sheets?\n\nTrang sẽ trở về đúng chữ gốc trong HTML. Việc này không khôi phục được.')) return;

    st.busy = true;
    var xong = 0;
    Object.keys(st.daLuu).forEach(function (khoa) {
      goi('cmsSave', { action: 'cmsSave', key: khoa, value: '', password: st.matKhau, xoa: true })
        .then(function () { xong++; })
        .catch(function () {})
        .then(function () {
          if (xong < so) return;
          st.busy = false;
          baoLoai('ok', 'Đã xoá nội dung đã lưu', 'Đang tải lại trang…');
          setTimeout(function () { location.reload(); }, 1000);
        });
    });
  }

  /* ---------- 10. CSS ---------- */
  var CSS = [
    /* Vòng sáng khi rê vào chỗ sửa được */
    '.ed-active [data-ed-khoa]{cursor:text;outline:1px dashed rgba(232,145,60,.55);outline-offset:4px;',
      'border-radius:2px;transition:background .15s ease,outline-color .15s ease}',
    '.ed-active [data-ed-khoa]:hover{background:rgba(232,145,60,.13);outline-color:var(--amber,#e8913c)}',
    '.ed-active [data-ed-khoa].ed-doi{outline-style:solid;background:rgba(232,145,60,.2)}',
    '.ed-active [data-ed-khoa].ed-sua{outline:2px solid var(--amber,#e8913c);background:rgba(232,145,60,.24);',
      'cursor:text;box-shadow:0 0 0 4px rgba(232,145,60,.14)}',
    '.ed-active [data-ed-khoa]:focus{outline:2px solid var(--amber,#e8913c)}',
    /* Ẩnh thanh điều hướng dạng nổi để không che chữ */
    '.ed-on .desktop-floating-menu,.ed-on .mobile-cta,.ed-on .shader-layer{display:none}',
    /* Chừa chỗ ở đáy trang: thanh công cụ ghim cố định không được che nút */
    '.ed-on{padding-bottom:110px}',
    /* Thanh công cụ */
    '.ed-bar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;',
      'display:flex;align-items:center;gap:10px;padding:10px 14px;',
      'background:#15191d;border:1px solid rgba(237,231,220,.2);border-radius:10px;',
      'box-shadow:0 20px 60px rgba(0,0,0,.5);font:13px/1.4 "Sora",system-ui,sans-serif;color:#ede7dc}',
    '.ed-dot{width:8px;height:8px;border-radius:999px;background:#6cc08a;flex:none;',
      'box-shadow:0 0 10px #6cc08a}',
    '.ed-bar-title{font-weight:600;white-space:nowrap}',
    '.ed-count{font-size:12px;color:#a3aaad;white-space:nowrap}',
    '.ed-bar-sep{width:1px;height:20px;background:rgba(237,231,220,.2);flex:none}',
    '.ed-btn{min-height:32px;padding:6px 13px;border:1px solid transparent;border-radius:5px;',
      'background:transparent;color:inherit;font:inherit;font-size:12px;font-weight:600;cursor:pointer;',
      'white-space:nowrap;transition:background .18s ease,border-color .18s ease,opacity .18s ease}',
    '.ed-btn.sm{min-height:30px;padding:5px 11px;font-size:11.5px}',
    '.ed-btn.primary{background:#e8913c;color:#14181b;border-color:#e8913c}',
    '.ed-btn.primary:hover:not(:disabled){background:#f0a355;border-color:#f0a355}',
    '.ed-btn.ghost{border-color:rgba(237,231,220,.28)}',
    '.ed-btn.ghost:hover:not(:disabled){background:rgba(232,145,60,.12);border-color:#e8913c}',
    '.ed-btn:disabled{opacity:.4;cursor:not-allowed}',
    /* Thông báo: đặt ở góc trên để không đè lên thanh công cụ */
    '.ed-toasts{position:fixed;right:20px;top:76px;z-index:10000;display:grid;gap:9px;justify-items:end;',
      'font:13px/1.5 "Sora",system-ui,sans-serif;pointer-events:none}',
    '.ed-toast{max-width:360px;padding:12px 15px;background:#15191d;border:1px solid rgba(237,231,220,.2);',
      'border-left:3px solid #e8913c;border-radius:5px;box-shadow:0 16px 44px rgba(0,0,0,.45);',
      'color:#ede7dc;animation:edIn .28s cubic-bezier(.2,.7,.2,1);transition:opacity .25s ease,transform .25s ease}',
    '.ed-toast b{display:block;font-weight:600}',
    '.ed-toast span{display:block;margin-top:4px;font-size:12px;color:#a3aaad}',
    '.ed-toast.ok{border-left-color:#6cc08a}.ed-toast.err{border-left-color:#e0566d}.ed-toast.out{opacity:0;transform:translateY(-6px)}',
    '@keyframes edIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}',
    /* Hộp thoại mật khẩu */
    '.ed-login{position:fixed;inset:0;z-index:10001;display:grid;place-items:center;padding:24px;',
      'background:rgba(10,12,14,.86);backdrop-filter:blur(10px);',
      'font:14px/1.6 "Sora",system-ui,sans-serif;color:#ede7dc}',
    '.ed-login-card{width:min(100%,400px);padding:32px 28px;background:#15191d;',
      'border:1px solid rgba(237,231,220,.2);border-radius:8px;box-shadow:0 30px 80px rgba(0,0,0,.5)}',
    '.ed-login-card h2{margin:0 0 8px;font:700 20px/1.25 "Syne",sans-serif}',
    '.ed-login-card p{margin:0 0 20px;color:#a3aaad;font-size:13px}',
    '.ed-login-card input{width:100%;min-height:42px;padding:10px 13px;margin-bottom:12px;',
      'background:#101317;color:inherit;border:1px solid rgba(237,231,220,.2);border-radius:4px;font:inherit}',
    '.ed-login-card input:focus{outline:none;border-color:#e8913c}',
    '.ed-login-msg{min-height:20px;font-size:12.5px;color:#a3aaad}',
    '.ed-login-msg.err{color:#e0566d}',
    '.ed-login-btns{display:flex;gap:10px;justify-content:flex-end}',
    '.ed-login-btns .ed-btn{min-height:40px;padding:9px 18px}',
    /* Nền sáng: trang dùng html[data-theme="light"], KHÔNG dùng prefers-color-scheme,
       nên nếu viết theo media query thì giao diện sẽ không khớp nút bật/tắt trên trang. */
    'html[data-theme="light"] .ed-bar{background:#fff;border-color:rgba(20,24,27,.18);color:#14181b}',
    'html[data-theme="light"] .ed-bar-sep{background:rgba(20,24,27,.18)}',
    'html[data-theme="light"] .ed-count{color:#5c6467}',
    'html[data-theme="light"] .ed-btn.ghost{border-color:rgba(20,24,27,.26)}',
    'html[data-theme="light"] .ed-toast{background:#fff;border-color:rgba(20,24,27,.18);color:#14181b}',
    'html[data-theme="light"] .ed-toast span{color:#5c6467}',
    'html[data-theme="light"] .ed-login{background:rgba(245,241,235,.9)}',
    'html[data-theme="light"] .ed-login-card{background:#fff;border-color:rgba(20,24,27,.18);color:#14181b}',
    'html[data-theme="light"] .ed-login-card p{color:#5c6467}',
    'html[data-theme="light"] .ed-login-card input{background:#fbf8f3;border-color:rgba(20,24,27,.22)}',
    /* Ảnh: bấm để đổi */
    '.ed-active img[data-ed-khoa]{cursor:pointer}',
    '.ed-active img[data-ed-khoa]:hover{outline:2px solid var(--amber,#e8913c);outline-offset:3px}',
    /* Trên điện thoại: rút gọn thanh công cụ cho còn một hàng */
    '@media(max-width:640px){.ed-bar{left:12px;right:12px;bottom:12px;transform:none;flex-wrap:nowrap;gap:6px;padding:8px 10px}',
      '.ed-bar-title,.ed-count,.ed-dai,.ed-chi-rong{display:none}',
      '.ed-on{padding-bottom:96px}',
      '.ed-toasts{left:12px;right:12px;top:70px;justify-items:stretch}.ed-toast{max-width:none}}',
    '@media(prefers-reduced-motion:reduce){.ed-toast{animation:none}}'
  ].join('');

  /* ---------- 11. Khởi động ---------- */
  themGiaoDien();
  hoiMatKhau().then(function (mk) {
    if (!mk) { document.documentElement.classList.remove('ed-active'); return; }
    st.matKhau = mk;
    goi('getdata').then(function (dl) {
      if (!dl || dl.ok !== true) throw new Error((dl && dl.message) || 'Apps Script không phản hồi đúng.');
      bat(dl.content || {});
    }).catch(function (e) {
      baoLoai('err', 'Không đọc được nội dung đã lưu', e.message);
      document.documentElement.classList.remove('ed-active');
    });
  });

})();

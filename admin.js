/* ==========================================================================
   admin.js — logic trang quản trị nội dung KOKO
   --------------------------------------------------------------------------
   Nguyên tắc thiết kế, theo thứ tự ưu tiên:

   1. KHÔNG BAO GIỜ MẤT NỘI DUNG NGƯỜI DÙNG ĐANG GÕ
      Lưu bản nháp vào localStorage liên tục. Đóng tab, máy treo, mất mạng
      đều không mất những gì đã gõ. Chỉ xoá nháp sau khi lưu thành công.

   2. LƯI TỪNG Ô, KHÔNG LƯI CẢ SECTION
      Bấm "Lưu" sẽ chỉ gửi những ô đã thay đổi. Một lần bấm sai không
      ghi đè cả section, và nhanh hơn nhiều.

   3. BÁO RÕ SỰ THẬT
      Khi Apps Script trả lỗi, hiện nguyên văn thông báo của nó, không báo
      chung chung kiểu "Có lỗi xảy ra".

   4. CHẶN MẤT PHIÊN
      Cảnh báo trước khi đóng tab nếu còn thay đổi chưa lưu.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.KOKO_ADMIN_CONFIG;
  if (!CFG) { alert('Không nạp được admin-config.js'); return; }

  /* Tên khoá lưu nháp trong localStorage. Gắn phiên bản để đổi cấu hình
     sau này không đọc lại nháp cũ. */
  var KHOA_DRAFT = 'koko-admin-draft-v1';
  var KHOA_URL = 'koko-admin-backend';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* Trạng thái ứng dụng */
  var state = {
    noidung: {},          // khoa -> gia tri đang lưu trên Sheet
    goc: {},              // ban sao luc mo trang, dung de tim thay doi
    section: null,        // section id dang xem
    tab: 'noiDung',
    busy: false
  };

  /* ==================================================================
     TIỆN ÍCH NHỎ
     ================================================================== */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function thongBao(loai, tieuDe, chiTiet) {
    var wrap = $('#toastWrap');
    var el = document.createElement('div');
    el.className = 'toast ' + loai;
    el.setAttribute('role', loai === 'err' ? 'alert' : 'status');
    var dau = loai === 'ok' ? '✓' : loai === 'err' ? '!' : 'i';
    el.innerHTML = '<span class="ico" aria-hidden="true">' + dau + '</span><div>' +
      esc(tieuDe) + (chiTiet ? '<div style="margin-top:5px;color:var(--muted);font-size:12px">' + esc(chiTiet) + '</div>' : '') +
      '</div>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add('hiding');
      setTimeout(function () { el.remove(); }, 260);
    }, loai === 'err' ? 7000 : 3800);
  }

  function layNhap() {
    var el = $('#gatePass');
    return el ? el.value : '';
  }

  /* Bộ đệm yêu cầu: Google Apps Script giới hạn số lần gọi trong một
     khoảng thời gian ngắn. Chuyển section liên tục có thể vượt. */
  var goiGanNhat = { bay: -1, dem: 0 };
  function choPhepGoi() {
    var gioiHan = 12;                     /* tối đa 12 lần / 60 giây */
    var bay = Math.floor(Date.now() / 60000);
    if (goiGanNhat.bay !== bay) { goiGanNhat.bay = bay; goiGanNhat.dem = 0; }
    goiGanNhat.dem++;
    if (goiGanNhat.dem > gioiHan) return false;
    return true;
  }

  /* ==================================================================
     GỌI APPS SCRIPT
     ==================================================================
     Dùng fetch với mode:'no-cors' và Content-Type text/plain.
     Đây là cách duy nhất để gọi từ trang tĩnh trên GitHub Pages mà không
     cần cấu hình CORS. Đổi lại, không đọc được phản hồi trực tiếp —
     nên hai action trả về JSON (health, getdata) sẽ bị chặn CORS.

     Vì vậy:
       - Đọc dữ liệu: dùng JSONP. Apps Script hỗ trợ qua tham số callback
         và trả về application/javascript, tránh được kiểm tra CORS.
       - Ghi dữ liệu: dùng no-cors, không đọc phản hồi. Xác nhận thành công
         bằng cách đọc lại dữ liệu sau khi ghi.
     ================================================================== */

  function docJSONP(action, duLieu) {
    return new Promise(function (resolve, reject) {
      var cbName = '__kokoCb' + Math.random().toString(36).slice(2, 11);
      var url = CFG.backend + '?action=' + encodeURIComponent(action);
      /* Dữ liệu gửi kèm phải nằm trong chuỗi truy vấn, không nằm trong
         thân yêu cầu: JSONP chỉ chấp nhận GET. */
      if (duLieu) url += '&payload=' + encodeURIComponent(JSON.stringify(duLieu));
      url += '&callback=' + cbName;
      var s = document.createElement('script');

      var het = setTimeout(function () {
        xoaScript(); delete window[cbName];
        reject(new Error('Không nhận được phản hồi sau 25 giây. Kiểm tra kết nối mạng.'));
      }, 25000);

      function xoaScript() { clearTimeout(het); if (s.parentNode) s.parentNode.removeChild(s); }

      window[cbName] = function (duLieu) {
        xoaScript(); delete window[cbName];
        resolve(duLieu);
      };
      s.onerror = function () {
        xoaScript(); delete window[cbName];
        reject(new Error('Không tải được Apps Script. Kiểm tra URL hoặc quyền truy cập.'));
      };
      s.src = url;
      document.head.appendChild(s);
    });
  }

  function ghi(action, duLieu) {
    return new Promise(function (resolve, reject) {
      var het = setTimeout(function () {
        reject(new Error('Gửi quá 30 giây không nhận phản hồi.'));
      }, 30000);

      fetch(CFG.backend, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(duLieu)
      }).then(function () {
        clearTimeout(het);
        resolve({ ok: true });
      }).catch(function (err) {
        clearTimeout(het);
        reject(new Error('Không gửi được tới Apps Script: ' + (err && err.message ? err.message : err)));
      });
    });
  }

  /* Ghi bằng JSONP để đọc được thông báo lỗi từ Apps Script.
     Dùng cho mọi thao tác thay đổi dữ liệu. */
  function docJSONPPost(payload, tenAction) {
    return new Promise(function (resolve, reject) {
      var cbName = '__kokoUp' + Math.random().toString(36).slice(2, 11);
      var s = document.createElement('script');
      var het = setTimeout(function () {
        donSach(); reject(new Error('Không nhận phản hồi sau 45 giây.'));
      }, 45000);
      function donSach() { clearTimeout(het); if (s.parentNode) s.parentNode.removeChild(s); delete window[cbName]; }

      window[cbName] = function (dl) { donSach(); resolve(dl); };
      s.onerror = function () {
        donSach();
        reject(new Error('Không tải được Apps Script. Kiểm tra quyền truy cập deployment.'));
      };
      s.src = CFG.backend +
        '?action=' + encodeURIComponent(tenAction) +
        '&payload=' + encodeURIComponent(JSON.stringify(payload)) +
        '&callback=' + cbName;
      document.head.appendChild(s);
    });
  }

  /* ==================================================================
     NHÁP — bảo vệ nội dung đang gõ
     ================================================================== */

  function docNhap() {
    try { return JSON.parse(localStorage.getItem(KHOA_DRAFT) || '{}'); }
    catch (e) { return {}; }
  }
  function luuNhap() {
    var n = {};
    $$('#fields [data-khoa]').forEach(function (el) {
      var g = state.goc[el.getAttribute('data-khoa')];
      if (el.value !== (g === undefined ? '' : g)) n[el.getAttribute('data-khoa')] = el.value;
    });
    try {
      if (Object.keys(n).length) localStorage.setItem(KHOA_DRAFT, JSON.stringify(n));
      else localStorage.removeItem(KHOA_DRAFT);
    } catch (e) { /* chế độ riêng tư */ }
    return n;
  }
  function xoaNhap() {
    try { localStorage.removeItem(KHOA_DRAFT); } catch (e) { /* bỏ qua */ }
  }
  function kiemTraNhap() {
    var n = docNhap();
    return Object.keys(n).length ? n : null;
  }

  /* ==================================================================
     ĐĂNG NHẬP
     ================================================================== */

  function batDau(matKhau) {
    $('#gateMsg').textContent = 'Đang kiểm tra…';
    $('#gateMsg').className = 'gate-msg';

    if (!choPhepGoi()) {
      $('#gateMsg').textContent = 'Bạn vừa thao tác quá nhiều. Chờ một chút rồi thử lại.';
      $('#gateMsg').className = 'gate-msg err';
      return;
    }

    /* Gọi 'verify' chứ không gọi 'getdata'.
       'getdata' không cần mật khẩu nên gọi nó ở bước đăng nhập là vô
       nghĩa — mọi mật khẩu đều qua được. Phải là 'verify'.
       Và phải đòi đúng nhãn xacNhan, vì backend chưa deploy lại sẽ trả
       về thông tin sức khoẻ cũng có ok:true. */
    docJSONP('verify', { password: matKhau }).then(function (xacNhan) {
      if (!(xacNhan && xacNhan.ok === true && xacNhan.xacNhan === true)) {
        if (xacNhan && xacNhan.xacNhan === false) {
          throw new Error(xacNhan.message || 'Mật khẩu quản trị không đúng.');
        }
        throw new Error('Apps Script chưa có chế độ xác nhận. ' +
          'Xem lại Bước 4 trong docs/huong-dan-cai-dat-cms.md — có thể bạn chưa deploy lại Code.gs.');
      }

      return docJSONP('getdata');
    }).then(function (duLieu) {
      if (!duLieu || duLieu.ok !== true) {
        throw new Error((duLieu && duLieu.message) || 'Apps Script không trả về dữ liệu đúng.');
      }
      state.noidung = duLieu.content || {};
      state.goc = {};
      for (var k in state.noidung) state.goc[k] = state.noidung[k];

      try {
        sessionStorage.setItem('koko-admin-ok', '1');
        /* Chỉ giữ trong phiên, đóng trình duyệt là mất. */
        sessionStorage.setItem('koko-admin-pass', matKhau);
      } catch (e) { /* bỏ qua */ }

      $('#gate').hidden = true;
      $('#app').hidden = false;
      $('#gatePass').dataset.backend = CFG.backend;

      var coNhap = kiemTraNhap();
      if (coNhap) {
        thongBao('info', 'Đã khôi phục nội dung bạn đang gõ dở',
                 'Có ' + Object.keys(coNhap).length + ' ô chưa lưu từ lần trước.');
      }

      veThanhBen();
      chuyenSection(CFG.sections[0].id);
      taiTaiLieu();
    }).catch(function (err) {
      $('#gateMsg').textContent = err.message || String(err);
      $('#gateMsg').className = 'gate-msg err';
    });
  }

  /* ==================================================================
     THANH BÊN
     ================================================================== */

  function veThanhBen() {
    var html = '';

    CFG.nhom.forEach(function (nhom) {
      var sec = CFG.sections.filter(function (s) { return s.nhom === nhom.id; });
      if (!sec.length) return;
      html += '<div class="nav-group"><h4>' + esc(nhom.id) + '</h4>';
      sec.forEach(function (s) {
        html += '<button class="nav-item" data-sec="' + esc(s.id) + '" type="button">' +
                '<span>' + esc(s.ten) + '</span>' +
                '<span class="count" data-count="' + esc(s.id) + '"></span></button>';
      });
      html += '</div>';
    });

    html += '<div class="nav-group"><h4>Công cụ</h4>' +
      '<button class="nav-tool" data-tab="phong" type="button">' +
        '<span class="ico" aria-hidden="true">A</span><span>Phông chữ</span></button>' +
      '<button class="nav-tool" data-tab="anh" type="button">' +
        '<span class="ico" aria-hidden="true">▣</span><span>Hình ảnh</span></button>' +
      '</div>';

    $('#sideNav').innerHTML = html;

    $$('#sideNav .nav-item').forEach(function (b) {
      b.addEventListener('click', function () { chuyenSection(b.getAttribute('data-sec')); });
    });
    $$('#sideNav .nav-tool').forEach(function (b) {
      b.addEventListener('click', function () { chuyenTab(b.getAttribute('data-tab')); });
    });

    capNhatDauCham();
  }

  /* Đánh dấu section có thay đổi chưa lưu, để không bỏ sót khi chuyển màn hình */
  function capNhatDauCham() {
    var nhap = docNhap();
    $$('#sideNav .nav-item').forEach(function (b) {
      var id = b.getAttribute('data-sec');
      var sec = CFG.sections.filter(function (s) { return s.id === id; })[0];
      var co = false;
      if (sec) sec.fields.forEach(function (f) { if (nhap[f.k] !== undefined) co = true; });
      var dot = b.querySelector('.dot-mark');
      if (co && !dot) {
        var s = document.createElement('span');
        s.className = 'dot-mark';
        b.appendChild(s);
        var c = b.querySelector('.count'); if (c) c.textContent = '';
      } else if (!co && dot) {
        dot.remove();
      }
    });
  }

  /* ==================================================================
     CHUYỂN SECTION / TAB
     ================================================================== */

  function chuyenTab(tab) {
    state.tab = tab;
    $('#paneNoiDung').hidden = tab !== 'noiDung';
    $('#panePhong').hidden = tab !== 'phong';
    $('#paneAnh').hidden = tab !== 'anh';

    $$('#sideNav .nav-item').forEach(function (b) { b.classList.toggle('active', tab === 'noiDung' && b.getAttribute('data-sec') === state.section); });
    $$('#sideNav .nav-tool').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
  }

  function chuyenSection(id) {
    /* Lưu nháp trước khi rời section */
    if (state.section) luuNhap();

    var sec = CFG.sections.filter(function (s) { return s.id === id; })[0];
    if (!sec) return;

    state.section = id;
    chuyenTab('noiDung');

    $('#secTen').textContent = sec.ten;
    $('#secMoTa').textContent = sec.moTa || '';
    $('#xemSection').href = 'index.html#' + sec.id;
    $('#xemSection').target = '_blank';

    var nhap = docNhap();
    var html = '';

    sec.fields.forEach(function (f) {
      /* Ưu tiên bản nháp chưa lưu, sau đó mới tới dữ liệu trên Sheet,
         cuối cùng là chữ đang có sẵn trong trang. */
      var tri = nhap[f.k] !== undefined ? nhap[f.k]
              : state.noidung[f.k] !== undefined ? state.noidung[f.k]
              : '';
      var daDoi = state.goc[f.k] !== undefined && tri !== state.goc[f.k];

      html += '<div class="field' + (daDoi ? ' changed' : '') + '" data-field="' + esc(f.k) + '">' +
        '<div class="field-head">' +
          '<label class="field-label" for="f_' + esc(f.k) + '">' + esc(f.n) + '</label>' +
          '<span class="field-count" data-count-for="' + esc(f.k) + '"></span>' +
        '</div>';

      if (f.d === 'area') {
        html += '<textarea id="f_' + esc(f.k) + '" data-khoa="' + esc(f.k) + '" rows="' + (f.rows || 3) + '"' +
          (f.max ? ' data-max="' + f.max + '"' : '') + '>' + esc(tri) + '</textarea>';
      } else {
        html += '<input type="text" id="f_' + esc(f.k) + '" data-khoa="' + esc(f.k) + '"' +
          (f.max ? ' data-max="' + f.max + '"' : '') + ' value="' + esc(tri) + '" />';
      }

      if (f.g) html += '<p class="field-hint">' + esc(f.g) + '</p>';
      html += '<span class="field-key">' + esc(f.k) + '</span>';
      html += '</div>';
    });

    $('#fields').innerHTML = html;

    $$('#fields [data-khoa]').forEach(function (el) {
      el.addEventListener('input', function () { onNhap(el); });
      el.addEventListener('blur', function () { luuNhap(); capNhatDauCham(); });
      demKyTu(el);
    });

    capNhatTrangThai();
    capNhatDauCham();
  }

  function onNhap(el) {
    var khoa = el.getAttribute('data-khoa');
    var field = el.closest('.field');
    var daDoi = el.value !== (state.goc[khoa] === undefined ? '' : state.goc[khoa]);
    field.classList.toggle('changed', daDoi);
    demKyTu(el);
    luuNhap();
    capNhatTrangThai();
    capNhatDauCham();
  }

  function demKyTu(el) {
    var max = parseInt(el.getAttribute('data-max') || '0', 10);
    if (!max) return;
    var span = document.querySelector('[data-count-for="' + CSS.escape(el.getAttribute('data-khoa')) + '"]');
    if (!span) return;
    var n = el.value.length;
    span.textContent = n + '/' + max;
    span.classList.toggle('over', n > max);
  }

  function capNhatTrangThai() {
    var soDoi = $$('#fields .field.changed').length;
    var el = $('#saveState');
    if (soDoi > 0) {
      el.textContent = soDoi + ' ô chưa lưu';
      el.className = 'save-state dirty';
    } else {
      el.textContent = 'Đã lưu hết';
      el.className = 'save-state ok';
    }
    $('#dirtyNote').textContent = soDoi > 0 ? soDoi + ' ô đã thay đổi trong section này.' : '';
    $('#saveSection').disabled = soDoi === 0 || state.busy;
    $('#resetSection').disabled = soDoi === 0 || state.busy;
  }

  /* ==================================================================
     LƯU
     ================================================================== */

  function luuSection() {
    if (state.busy) return;

    /* Gom những ô thực sự đổi, kèm cảnh báo vượt độ dài cho trước,
       để không mất công gửi rồi mới báo lỗi. */
    var thayDoi = [];
    $$('#fields .field.changed').forEach(function (field) {
      var khoa = field.getAttribute('data-field');
      var el = field.querySelector('[data-khoa]');
      var max = parseInt(el.getAttribute('data-max') || '0', 10);
      var gt = el.value.trim();

      if (!gt) {
        thongBao('err', 'Không thể lưu: "' + (field.querySelector('.field-label').textContent) + '" đang trống');
        return;
      }
      if (max && el.value.length > max) {
        thongBao('err', 'Quá giới hạn độ dài: "' + (field.querySelector('.field-label').textContent) + '"',
                 el.value.length + ' ký tự, tối đa ' + max + '.');
        return;
      }
      /* Chặn ngay ở phía trình duyệt để không tốn một lượt gọi mạng */
      if (/^[=+\-@]/.test(gt)) {
        thongBao('err', 'Nội dung không được bắt đầu bằng =, +, - hoặc @',
                 'Đây là ký tự mà Google Sheets hiểu là công thức.');
        return;
      }
      thayDoi.push({ k: khoa, v: el.value });
    });

    if (!thayDoi.length) { thongBao('info', 'Chưa có ô nào thay đổi'); return; }

    var matKhau = layNhap();
    state.busy = true;
    capNhatTrangThai();

    var ketQua = { ok: 0, loi: [] };
    var chayTiep = function (i) {
      if (i >= thayDoi.length) {
        state.busy = false;
        if (ketQua.ok === thayDoi.length) {
          thayDoi.forEach(function (t) { state.noidung[t.k] = t.v; state.goc[t.k] = t.v; });
          xoaNhap();
          $$('#fields .field').forEach(function (f) { f.classList.remove('changed'); });
          capNhatDauCham();
          capNhatTrangThai();
          thongBao('ok', 'Đã lưu ' + ketQua.ok + ' ô vào Google Sheets',
                   'Trang sẽ hiện nội dung mới sau khi tải lại. Nhớ bấm "Áp dụng" nếu đang ở bước cuối.');
          $$('#fields [data-khoa]').forEach(function (el) { demKyTu(el); });
        } else {
          capNhatTrangThai();
          thongBao('err', ketQua.ok + '/' + thayDoi.length + ' ô đã lưu',
                   ketQua.loi[0] || 'Có ô không lưu được.');
        }
        return;
      }
      var t = thayDoi[i];

      /* Dùng JSONP cho thao tác ghi, để ĐỌC ĐƯỢC thông báo lỗi từ Apps Script.
         Gửi bằng fetch no-cors sẽ không đọc được phản hồi. */
      var cbName = '__kokoSave' + Math.random().toString(36).slice(2, 11);
      var s = document.createElement('script');
      var het = setTimeout(function () {
        ketQua.loi.push('Ô "' + t.k + '" hết thời gian chờ.');
        donSach();
        chayTiep(i + 1);
      }, 25000);
      function donSach() { clearTimeout(het); if (s.parentNode) s.parentNode.removeChild(s); delete window[cbName]; }

      window[cbName] = function (dl) {
        donSach();
        if (dl && dl.ok) ketQua.ok++;
        else ketQua.loi.push((dl && dl.message) || ('Không lưu được "' + t.k + '".'));
        chayTiep(i + 1);
      };
      s.onerror = function () {
        donSach();
        ketQua.loi.push('Không gọi được Apps Script cho "' + t.k + '".');
        chayTiep(i + 1);
      };
      s.src = CFG.backend +
        '?action=cmsSave' +
        '&key=' + encodeURIComponent(t.k) +
        '&value=' + encodeURIComponent(t.v) +
        '&password=' + encodeURIComponent(matKhau) +
        '&callback=' + cbName;
      document.head.appendChild(s);
    };

    chayTiep(0);
  }

  function hoanTac() {
    var nhap = docNhap();
    var ids = Object.keys(nhap);
    ids.forEach(function (k) { delete nhap[k]; });
    try { localStorage.setItem(KHOA_DRAFT, JSON.stringify(nhap)); } catch (e) { /* bỏ qua */ }
    chuyenSection(state.section);
    thongBao('info', 'Đã hoàn tác ' + ids.length + ' thay đổi chưa lưu');
  }

  /* ==================================================================
     PHÔNG VÀ ẢNH
     ================================================================== */

  function docTep(thanhTin) {
    return new Promise(function (resolve, reject) {
      var f = thanhTin.files && thanhTin.files[0];
      if (!f) { reject(new Error('Chưa chọn tệp.')); return; }

      /* Báo ngay nếu vượt giới hạn, khỏi đọc tệp vô ích */
      var gioiHan = thanhTin.id === 'fontFile' ? 4 * 1024 * 1024 : 6 * 1024 * 1024;
      if (f.size > gioiHan) {
        reject(new Error('Tệp nặng ' + (f.size / 1048576).toFixed(1) + ' MB, vượt giới hạn ' +
          (gioiHan / 1048576) + ' MB.'));
        return;
      }

      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Không đọc được tệp.')); };
      fr.onload = function () {
        resolve({ ten: f.name, duLieu: String(fr.result).replace(/^data:[^;]+;base64,/, '') });
      };
      fr.readAsDataURL(f);
    });
  }

  function taiPhong() {
    docTep($('#fontFile')).then(function (t) {
      var matKhau = layNhap();
      state.busy = true;
      thongBao('info', 'Đang tải phông lên Drive…');

      /* Đọc tệp bằng FileReader nên có thể gửi dạng JSONP để đọc được phản hồi */
      return docJSONPPost({ action: 'uploadFont', password: matKhau, file: t }, 'uploadFont');
    }).then(function (dl) {
      state.busy = false;
      if (!dl || !dl.ok) throw new Error((dl && dl.message) || 'Tải phông thất bại.');
      $('#fontResult').hidden = false;
      $('#fontCss').textContent = dl.cssCanDung;
      thongBao('ok', 'Đã tải phông "' + dl.tenPhong + '" lên Drive',
               'Dán đoạn CSS vào css/fonts.css rồi đẩy lên GitHub.');
      taiTaiLieu();
    }).catch(function (err) {
      state.busy = false;
      thongBao('err', 'Không tải được phông', err.message || String(err));
    });
  }

  function taiAnh() {
    docTep($('#imgFile')).then(function (t) {
      state.busy = true;
      thongBao('info', 'Đang tải ảnh lên Drive…');
      return docJSONPPost({ action: 'uploadImage', password: layNhap(), file: t }, 'uploadImage');
    }).then(function (dl) {
      state.busy = false;
      if (!dl || !dl.ok) throw new Error((dl && dl.message) || 'Tải ảnh thất bại.');
      $('#imgPreview').hidden = false;
      $('#imgPreviewEl').src = dl.urlCongKhai;
      $('#imgPreviewEl').alt = t.ten;
      $('#imgUrl').textContent = dl.urlCongKhai;
      thongBao('ok', 'Đã tải "' + dl.ten + '" lên Drive', dl.kichThuocKB + ' KB');
      taiTaiLieu();
    }).catch(function (err) {
      state.busy = false;
      thongBao('err', 'Không tải được ảnh', err.message || String(err));
    });
  }

  function taiTaiLieu() {
    docJSONP('listImages').then(function (dl) {
      veBangPhong();
      veLuoiAnh((dl && dl.images) || []);
    }).catch(function () {
      veLuoiAnh([]);
    });
  }

  function veBangPhong() {
    var tb = $('#fontTable tbody');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="4" style="color:var(--faint);text-align:center;padding:18px">Đang tải…</td></tr>';
  }

  function veLuoiAnh(list) {
    var grid = $('#imgGrid');
    var empty = $('#imgEmpty');
    if (!list.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = list.map(function (a, i) {
      return '<div class="ga-item">' +
        '<img src="' + esc(a.url) + '" alt="' + esc(a.ten) + '" loading="lazy" />' +
        '<div class="ga-meta">' +
          '<p class="ga-name" title="' + esc(a.ten) + '">' + esc(a.ten) + '</p>' +
          '<p class="ga-date">' + esc(a.ngay || '') + '</p>' +
          '<div class="ga-actions">' +
            '<button class="btn ghost sm" data-copy="' + esc(a.url) + '" type="button">Sao chép</button>' +
            '<button class="btn danger sm" data-xoa="' + esc(a.url) + '" data-ten="' + esc(a.ten) + '" type="button">Xoá</button>' +
          '</div>' +
        '</div></div>';
    }).join('');

    $$('#imgGrid [data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        saoChep(b.getAttribute('data-copy'), 'Đã sao chép URL ảnh');
      });
    });
    $$('#imgGrid [data-xoa]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Xoá ảnh "' + b.getAttribute('data-ten') + '" khỏi Drive?\n\nTrang đang dùng ảnh này sẽ mất hình.')) return;
        docJSONPPost({ action: 'deleteImage', password: layNhap(), url: b.getAttribute('data-xoa') }, 'deleteImage')
          .then(function (dl) {
            if (dl && dl.ok) { thongBao('ok', 'Đã xoá ảnh'); taiTaiLieu(); }
            else thongBao('err', 'Không xoá được', (dl && dl.message) || '');
          })
          .catch(function (e) { thongBao('err', 'Không xoá được', e.message); });
      });
    });
  }

  function saoChep(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        thongBao('ok', msg || 'Đã sao chép');
      }).catch(function () { hienHopNhat(text, msg); });
    } else {
      hienHopNhat(text, msg);
    }
  }
  function hienHopNhat(text, msg) {
    var ta = window.prompt('Sao chép nội dung sau:', text);
    if (ta !== null) thongBao('ok', msg || 'Đã sao chép');
  }

  /* ==================================================================
     XUẤT TOÀN BỘ
     ================================================================== */

  function xuatJson() {
    var n = luuNhap();
    var duLieu = {
      xuatLuc: new Date().toISOString(),
      luuY: 'Bản sao lưu nội dung hiện có trong Google Sheets.',
      nộiDung: state.noidung,
      chuaLuu: n
    };
    var blob = new Blob([JSON.stringify(duLieu, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'koko-noi-dung-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    thongBao('ok', 'Đã tải tệp nội dung');
  }

  /* ==================================================================
     GẮN SỰ KIỆN
     ================================================================== */

  $('#gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    batDau(layNhap());
  });

  $('#logoutBtn').addEventListener('click', function () {
    if (Object.keys(docNhap()).length && !confirm('Bạn còn nội dung chưa lưu. Thoát và bỏ chúng?')) return;
    try { sessionStorage.removeItem('koko-admin-ok'); } catch (e) { /* bỏ qua */ }
    location.reload();
  });

  $('#saveSection').addEventListener('click', luuSection);
  $('#resetSection').addEventListener('click', hoanTac);
  $('#exportBtn').addEventListener('click', xuatJson);

  /* Chọn tệp */
  $('#fontFile').addEventListener('change', function () {
    $('#uploadFontBtn').disabled = !this.files || !this.files.length;
  });
  $('#imgFile').addEventListener('change', function () {
    $('#uploadImgBtn').disabled = !this.files || !this.files.length;
  });
  $('#uploadFontBtn').addEventListener('click', taiPhong);
  $('#uploadImgBtn').addEventListener('click', taiAnh);

  /* Kéo thả tệp */
  [['#fontDrop', '#fontFile'], ['#imgDrop', '#imgFile']].forEach(function (p) {
    var vung = $(p[0]), input = $(p[1]);
    ['dragenter', 'dragover'].forEach(function (ev) {
      vung.addEventListener(ev, function (e) { e.preventDefault(); vung.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      vung.addEventListener(ev, function (e) { e.preventDefault(); vung.classList.remove('over'); });
    });
    vung.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });

  $('#copyFontCss').addEventListener('click', function () {
    saoChep($('#fontCss').textContent, 'Đã sao chép đoạn CSS');
  });
  $('#copyImgUrl').addEventListener('click', function () {
    saoChep($('#imgUrl').textContent, 'Đã sao chép URL ảnh');
  });

  /* Ctrl+S chặn lại, vì người dùng quen bấm lưu trình duyệt */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!$('#app').hidden && state.tab === 'noiDung') luuSection();
    }
    /* Cmd+Enter cũng lưu, tiện khi đang gõ ô đa dòng */
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!$('#app').hidden && state.tab === 'noiDung') luuSection();
    }
  });

  /* Cảnh báo trước khi đóng tab khi còn chưa lưu */
  window.addEventListener('beforeunload', function (e) {
    if (Object.keys(docNhap()).length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ==================================================================
     MỞ ĐẦU
     ================================================================== */
  $('#gatePass').focus();

  /* Đã đăng nhập ở tab trước và nhớ mật khẩu trong phiên → vào thẳng.
     Mật khẩu nằm trong sessionStorage, tự xoá khi đóng trình duyệt. */
  try {
    if (sessionStorage.getItem('koko-admin-ok') === '1') {
      var nhapDa = sessionStorage.getItem('koko-admin-pass');
      if (nhapDa) {
        $('#gatePass').value = nhapDa;
        batDau(nhapDa);
      }
    }
  } catch (e) { /* bỏ qua */ }
})();

# Cài đặt hệ quản trị nội dung cho KOKO

Hướng dẫn này dẫn từ con số 0 đến khi bạn sửa được chữ ngay trên trang —
không cần sửa code.

---

## Hai cách sửa, chọn cách nào tùy việc

| | Sửa tại chỗ trên trang | Bảng điều khiển |
|---|---|---|
| Mở bằng | thêm `?edit` vào cuối đường dẫn | `/admin.html` |
| Nhìn thấy thay đổi | ngay tại chỗ vừa gõ | phải tự nhớ |
| Sửa chữ | ✅ bấm vào chữ là gõ | ✅ |
| Đổi ảnh | ✅ bấm vào ảnh, dán đường dẫn | ✅ |
| Tải phông lên | ❌ | ✅ |
| Xem tất cả chỗ sửa cùng lúc | ❌ | ✅ |

Cách nhanh nhất hằng ngày là **sửa tại chỗ**. Dùng bảng điều khiển khi cần
tải phông hoặc muốn thấy toàn bộ nội dung một lượt.

---

## Vì sao phông vẫn phải sửa tay?

Nói thẳng để bạn không bất ngờ: website trên **GitHub Pages là trang tĩnh**.
Không có máy chủ nào chạy thường trực để nhận lệnh sửa. Dù có Apps Script,
nó cũng không tự đẩy code lên GitHub.

| Việc | Ai làm | Mất bao lâu |
|---|---|---|
| Sửa **chữ** trên trang | Bạn, ngay trên trang | Vài giây |
| Đổi **ảnh** | Bạn, ngay trên trang (dán đường dẫn) | Vài giây |
| Thêm **phông** mới | Bạn, dán CSS rồi đẩy lên GitHub | 2–3 phút |

---

## Bước 1 — Dán code backend

1. Mở https://script.google.com và đăng nhập bằng `unitemedia2010@gmail.com`
2. Mở dự án Apps Script đã tạo (Script ID `1hauocu5ujxr37ZJCW21BTtVvJ4XB63Ncvm9SrbVaUxvMABCzD5vnfzKr`)
3. Xoá toàn bộ nội dung sẵn có trong `Code.gs`
4. Mở file `apps-script/Code.gs` trong thư mục dự án, copy toàn bộ, dán vào

Kiểm tra xem đúng chưa: dòng đầu phải là
`const SHEET_ID = '1aX6Az5XXzdUauXDoeMF297iwOF9cfvDkx6-FDLdhoK8';`

---

## Bước 2 — Đặt mật khẩu quản trị

Ở bên trái màn hình, bấm **Project Settings** (hình bánh răng), cuộn xuống
mục **Script Properties**, bấm **Add script property**:

| Name | Value |
|---|---|
| `KOKO_ADMIN_PASSWORD` | mật khẩu của bạn, **tối thiểu 12 ký tự** |

Bấm **Save script properties**.

> Mật khẩu phải dài và khó đoán. Đây là thứ duy nhất đứng giữa trang chính
> thương hiệu của bạn và kẻ muốn thay đổi nội dung trên đó.

---

## Bước 3 — Tạo cấu trúc Sheet

Trong trình soạn thảo, chọn hàm `setupKokoSheets` ở thanh chọn hàm phía trên
(rồi bấm **Run** — nút ▶).

Lần chạy đầu Google sẽ yêu cầu uỷ quyền:

1. Bấm **Review permissions**
2. Chọn tài khoản `unitemedia2010@gmail.com`
3. Chọn **Advanced** → **Go to (project name)**
4. Bấm **Allow**

Xong, trong Sheet `1aX6Az5XXzdUauXDoeMF297iwOF9cfvDkx6-FDLdhoK8` sẽ có:

- Sheet **Nội dung** — cột `Khoá`, `Nội dung`, `Ngày cập nhật`
- Sheet **Tài liệu** — danh sách file đã tải lên
- Trong Drive: thư mục **KOKO - Phông** và **KOKO - Ảnh**

---

## Bước 4 — Deploy

1. Bấm **Deploy** → **New deployment**
2. Bấm biểu tượng ⚙️ cạnh **Select type** → chọn **Web app**
3. Điền:
   - **Description**: `KOKO CMS v2`
   - **Execute as**: **Me (unitemedia2010@gmail.com)**
   - **Who has access**: **Anyone**
4. Bấm **Deploy**, chọn phiên bản **New version**, bấm **Done**

Google sẽ hiện cảnh báo "This deployment may be unsafe" — đây là thông báo thường
gặp với mọi Web app, bấm **Authorize / Continue** là được.

**Copy URL `/exec`.** Đó là URL cần đưa vào `admin-config.js` (dòng `backend`)
và `js/editor.js` (biến `CFG.backend`).

### Kiểm tra deploy đã đúng chưa

Mở URL sau, thay `ĐƯỜNG_DẪN_CỦA_BẠN` bằng URL vừa copy:

```
https://script.google.com/macros/s/ĐƯỜNG_DẪN_CỦA_BẠN/exec?action=health&callback=kc
```

Phải hiện ra đúng một dòng bắt đầu bằng `kc(` và trong đó có `"ok":true`.

- Nếu hiện JSON trần không có `kc(` → bản deploy cũ, chưa có phần JSONP.
- Nếu báo lỗi 404 → URL copy thiếu hoặc thừa ký tự.
- Nếu báo `{"ok":false,...}` → xem lại Bước 2.

---

## Bước 5 — Nối URL vào trang quản trị

Mở `admin-config.js`, sửa dòng `backend` cho đúng URL vừa copy.

Mở `js/editor.js`, sửa `CFG.backend` cho giống hệt.

> Hai chỗ này phải giống nhau, nếu không sẽ lúc sửa được lúc không.

---

## Bước 6 — Đẩy lên GitHub Pages

Đây là điều kiện bắt buộc. Backend có một lớp kiểm tra: trước khi lưu, nó
tải trang đang chạy trên `linhtruong.vn` và tìm xem khoá `data-cms` có thật sự
nằm trong HTML không.

Cơ chế này chặn việc ghi rác, nhưng đổi lại **trang phải được đẩy lên trước
thì mới sửa được**. Nếu không có bước này, mọi lệnh sẽ báo:

> Không tìm thấy data-cms="..." trên trang đã publish.

```bash
cd D:/Downloads/KOKO
git add .
git commit -m "Thêm chế độ sửa trực tiếp trên trang"
git push origin main
```

Chờ khoảng 1–2 phút, GitHub Pages dựng lại xong.

---

## Dùng chế độ sửa tại chỗ

Mở `https://linhtruong.vn/?edit`

1. Nhập mật khẩu
2. Bấm vào bất kỳ đoạn chữ nào — viền nét gạch hiện ra là chỗ sửa được
3. Gõ thay đổi, bấm **Esc** khi xong một chỗ
4. Bấm **Lưu** (hoặc `Ctrl+S`)

Chỗ nào sửa rồi mà chưa lưu sẽ có viền đặc. Bấm **Bỏ thay đổi** để quay lại.

Trang tải lại và nội dung trong Sheet hiện ra — nghĩa là **sửa xong là khách
thấy ngay**, không cần đẩy GitHub.

### Đổi ảnh ngay trên trang

Bấm vào ảnh, dán đường dẫn mới:

```
assets/images/ten-anh.webp
```

Nhớ bấm **Lưu**. Đường dẫn phải trỏ tới ảnh thật — tải ảnh lên trước ở tab
**Hình ảnh** của bảng điều khiển, rồi dán URL trả về.

### Sửa nhầm rồi muốn quay lại

**Khôi phục chữ gốc** xoá toàn bộ nội dung đang lưu trên Sheet, đưa trang về
đúng chữ viết trong `index.html`. Không khôi phục được, nên bấm khi chắc chắn.

### Nếu quên mật khẩu

Không có đường vòng. Vào https://script.google.com → dự án → **Project
Settings** → **Script Properties**, xem hoặc đặt lại `KOKO_ADMIN_PASSWORD`.
Không cần deploy lại.

---

## Dùng bảng điều khiển

Mở `/admin.html`, nhập mật khẩu.

### Sửa chữ

Chọn section ở cột bên trái, bấm vào chữ muốn đổi, sửa trong ô bên phải.
Bấm **Lưu section này**. `Ctrl+S` cũng lưu.

**Xuất toàn bộ (JSON)** — tải một bản sao toàn bộ nội dung về máy, nên giữ
lại sau mỗi lần sửa lớn.

### Tải phông lên

Tab **Phông chữ** → chọn tệp `.woff2` (khuyến nghị) → bấm **Tải lên**.

Script trả về một đoạn CSS đã sẵn. Bấm **Sao chép CSS**, dán vào `css/fonts.css`,
rồi đổi biến tương ứng trong `css/style.css`:

```css
--display: "Tên Phông Mới", sans-serif;   /* tiêu đề lớn */
--serif:   "Tên Phông Mới", Georgia, serif; /* câu văn */
--sans:    "Tên Phông Mới", sans-serif;      /* chữ chữa */
```

Đẩy lên là xong. Phông có hiệu lực ở toàn trang, không phải sửa từng chỗ.

### Tải ảnh lên

Tab **Hình ảnh** → chọn tệp → **Tải lên** → bấm **Sao chép URL**.

Nên dùng `.webp` để nhẹ nhất. Giới hạn 6 MB.

---

## Giải quyết sự cố

**"Không tải được Apps Script"**
URL sai, hoặc deployment chưa đặt quyền **Anyone`. Kiểm tra lại Bước 4 và 5.

**Kiểm tra URL nhanh nhất**
Mở `URL_CUA_BAN?action=health&callback=kc`. Phải thấy `kc({...})`.

**Báo "Chưa đặt mật khẩu quản trị"**
Chưa làm Bước 2, hoặc tên thuộc tính gõ sai chính tả.

**Báo "Không tìm thấy data-cms trên trang đã publish"**
Chưa làm Bước 6, hoặc khoá đó chưa có trong `index.html`.

**Báo "Bạn đã nhập sai mật khẩu 8 lần"**
Khóa tạm 15 phút, tự mở lại. Không phải lỗi hỏng gì.

**Upload ảnh báo "vượt giới hạn 6 MB"**
Nén lại bằng https://squoosh.app cho nhẹ hơn nhiều.

**Chế độ `?edit` không mở ra**
Kiểm tra URL có đúng là `?edit` không, và `js/editor.js` còn trên hosting.

---

## Giới hận cần biết

- **Phông phải sửa tay trong repo.** Apps Script không có quyền ghi vào
  GitHub. Đây là giới hạn của trang tĩnh, không phải lỗi.
- **Nội dung trong Sheet là bản chính.** Xoá dòng trong Sheet là xoá nội dung.
- **Mật khẩu nằm trong Script Properties**, không nằm trong file code. Đừng bao
  giờ dán mật khẩu thẳng vào `Code.gs`.
- **Đổi mật khẩu** chỉ cần sửa Script Properties, không phải deploy lại.
- **Chỗ sửa tại chỗ bỏ qua ô có phần tử con** (ví dụ thẻ `<a>` bọc `<span>`).
  Ô đó sửa ở bảng điều khiển.

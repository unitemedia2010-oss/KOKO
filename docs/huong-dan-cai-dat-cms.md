# Cài đặt hệ quản trị nội dung cho KOKO

Hướng dẫn này dẫn từ con số 0 đến khi bạn sửa được chữ, đổi được phông và
thay được ảnh trên trang — mà không cần sửa code.

---

## Vì sao trang còn phải sửa tay?

Nói thẳng để bạn không bất ngờ: website trên **GitHub Pages là trang tĩnh**.
Không có máy chủ nào chạy thường trực để nhận lệnh sửa. Dù có Apps Script,
 nó cũng không tự đẩy code lên GitHub.

Nên chia là hai phần:

| Việc | Ai làm | Mất bao lâu |
|---|---|---|
| Lưu nội dung vào Sheet | Apps Script, tức thì | Vài giây |
| Đưa nội dung lên trang | Bạn, bấm **Áp dụng** | Khoảng 1–2 phút |

Trang quản trị sẽ hiện nút **Áp dụng**. Bấm một lần là xong, không cần mở
GitHub, không cần build, không cần chạy lệnh.

---

## Bước 1 — Dán code backend

1. Mở https://script.google.com và đăng nhập bằng `unitemedia2010@gmail.com`
2. Bấm **New project**
3. Xoá toàn bộ nội dung sẵn có trong `Code.gs`
4. Mở file `apps-script/Code.gs` trong thư mục dự án, copy toàn bộ, dán vào

Kiểm tra xem đúng chưa: dòng đầu phải là `const SHEET_ID = '1aX6Az5XXzdUauXDoeMF297iwOF9cfvDkx6-FDLdhoK8';`

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
   - **Description**: `KOKO CMS v1`
   - **Execute as**: **Me (unitemedia2010@gmail.com)**
   - **Who has access**: **Anyone**
4. Bấm **Deploy**, chọn phiên bản **New version**, bấm **Done**

Google sẽ hiện cảnh báo "This deployment may be unsafe" — đây là thông báo thường
gặp với mọi Web app, bấm **Authorize / Continue** là được.

**Copy URL `/exec` và dán vào trang quản trị.**

---

## Bước 5 — Mở trang quản trị

Mở `admin.html` trong thư mục dự án. Nhập mật khẩu, dán URL vừa copy, bấm
**Kết nối**.

---

## Bước 6 — Deploy lần đầu lên GitHub Pages

Đây là điều kiện bắt buộc. Backend có một lớp kiểm tra: trước khi lưu, nó
tải trang đang chạy trên `linhtruong.vn` và tìm xem khoá `data-cms` có thật sự
nằm trong HTML không.

Cơ chế này chặn việc ghi rác, nhưng đổi lại **trang phải được đẩy lên trước
thì mới sửa được**. Nếu không có bước này, mọi lệnh sẽ báo:

> Không tìm thấy data-cms="..." trên trang đã publish.

Cách đẩy:

```bash
cd D:/Downloads/KOKO
git add .
git commit -m "Thêm hệ quản trị nội dung"
git push origin main
```

Chờ khoảng 1–2 phút, GitHub Pages dựng lại xong. Mở `linhtruong.vn` thấy
trang mới là được.

---

## Sau đó dùng thế nào

### Sửa chữ

Chọn section ở cột bên trái, bấm vào chữ muốn đổi, sửa trong ô bên phải.
Mọi chữ trên trang đều sửa được, gồm cả tiêu đề, mô tả, số liệu và nhãn nút.

### Đổi phông

Tab **Phông chữ** → chọn tệp `.woff2` (khuyến nghị) → bấm **Tải lên**.

Script sẽ trả về một đoạn CSS đã sẵn. Copy đoạn đó dán vào `css/fonts.css`,
rồi đổi biến tương ứng trong `css/style.css`:

```css
--display: "Tên Phông Mới", sans-serif;   /* tiêu đề lớn */
--serif:   "Tên Phông Mới", Georgia, serif; /* câu văn */
--sans:    "Tên Phông Mới", sans-serif;      /* chữ chữa */
```

Đẩy lên là xong. Phông có hiệu lực ở toàn trang, không phải sửa từng chỗ.

### Đổi ảnh

Tab **Hình ảnh** → chọn tệp → **Tải lên** → copy URL → dán vào thuộc tính `src`
của thẻ `<img>` cần đổi.

Nên dùng `.webp` để nhẹ nhất. Giới hạn 6 MB.

---

## Giải quyết sự cố

**Trang quản trị báo "Không kết nối được backend"**
URL sai, hoặc deployment chưa đặt quyền **Anyone**. Kiểm tra lại Bước 4.

**Báo "Chưa đặt mật khẩu quản trị"**
Chưa làm Bước 2, hoặc tên thuộc tính gõ sai chính tả.

**Báo "Không tìm thấy data-cms trên trang đã publish"**
Chưa làm Bước 6, hoặc khoá đó chưa có trong `index.html`.

**Báo "Bạn đã nhập sai mật khẩu 8 lần"**
Khóa tạm 15 phút, tự mở lại. Không phải lỗi hỏng gì.

**Upload ảnh báo "vượt giới hạn 6 MB"**
Nén lại bằng https://squoosh.app cho nhẹ hơn nhiều.

**Không thấy nút Áp dụng**
Xem mục *Giới hạn* bên dưới.

---

## Giới hạn cần biết

- **Phông và mã ảnh phải sửa tay trong repo.** Apps Script không có quyền ghi
  vào GitHub. Đây là giới hạn của trang tĩnh, không phải lỗi.
- **Nội dung trong Sheet là bản chính.** Xoá dòng trong Sheet là xoá nội dung.
- **Mật khẩu nằm trong Script Properties**, không nằm trong file code. Đừng bao
  giờ dán mật khẩu thẳng vào `Code.gs`.
- **Đổi mật khẩu** chỉ cần sửa Script Properties, không phải deploy lại.

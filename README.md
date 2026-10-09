# Koko Linh — Executive Creative Portfolio

Trang portfolio cá nhân, chạy trên **GitHub Pages** tại [linhtruong.vn](https://linhtruong.vn).
Không cần bước build nào — sửa file, đẩy lên là xong.

## Cấu trúc

```
index.html          Toàn bộ nội dung trang
css/
  fonts.css         Kho phông. CMS sẽ ghi đè file này khi bạn tải phông mới.
  style.css         Toàn bộ giao diện. Màu và font nằm ở khối :root ở đầu file.
js/
  app.js            Theme, menu, hiệu ứng cuộn, hành trình cuộn ngang
  text-fit.js       Tự co tiêu đề cho vừa khung, đo theo bề rộng chữ thật
  shader.js         Nền ánh kim chuyển động (Canvas 2D, không cần thư viện)
assets/images/      Ảnh WebP
tools/              Script kiểm tra bố cục, chạy cục bộ, không deploy
```

Mỗi đoạn chữ trong `index.html` có thuộc tính `data-cms`, ví dụ
`data-cms="hero_title_1"`. Đó là chỗ để hệ quản trị nội dung ghi đè sau này.
Muốn xem danh sách khoá, tìm trong trang: `data-cms="`.

## Đổi nội dung, màu, phông

| Muốn đổi | Sửa ở đâu |
|---|---|
| Chữ trên trang | `index.html`, sửa trong thẻ có `data-cms` |
| Màu chủ đạo | `css/style.css`, khối `:root` |
| Màu khi bật theme sáng | `css/style.css`, khối `html[data-theme="light"]` |
| Phông chữ | `css/style.css`, ba biến `--serif` `--sans` `--display` |
| Ảnh | thay file trong `assets/images/`, cập nhật đường dẫn trong `index.html` |

Hai biến màu đỏ tách riêng là có chủ đích:
- `--wine` dùng làm **nền** (nút, gradient) — giữ đậm cho có sức nặng
- `--wine-text` dùng làm **chữ** — sáng hơn để đạt chuẩn tương phản WCAG AA

## Kiểm tra trước khi đẩy lên

Bố cục thay đổi rất dễ làm chữ tràn ra ngoài khung ở một kích thước màn hình
lạ mà bạn không có thiết bị để thử. Vì vậy có sẵn hai bộ kiểm tra.

```bash
# Chạy web tại localhost
python -m http.server 8080

# Kiểm tra bố cục ở 8 kích thước màn hình
npm install
node tools/kiem-tra-bo-cuc.js

# Kiểm tra trang có chịu được khi GSAP hoặc toàn bộ JS bị chặn
node tools/kiem-tra-an-toan.js
```

`kiem-tra-bo-cuc.js` phát hiện tràn ngang, chữ bị cắt, nội dung bị ẩn do lỗi
JS, và chữ không đạt tương phản. Chạy script này sau **mỗi** lần sửa giao diện.

## Những quy tắc đã cài, sửa thì dễ vỡ

Ba điều dưới đây từng gây lỗi thật. Đừng bỏ nếu không hiểu vì sao cần.

**1. Cờ `reveal-armed`.** Nội dung hiệu ứng chỉ bị ẩn khi `app.js` bật cờ này,
và cờ chỉ được bật *sau khi* đã xác nhận có công cụ mở lại nội dung. Nếu bật cờ
sớm trong thẻ `<head>`, chỉ cần GSAP bị CDN chặn là **cả trang trắng chữ**.

**2. `text-fit` cần `font-size: inherit`.** Thiếu dòng này, các thẻ `<span>`
bên trong tiêu đề nhận cỡ chữ 16px mặc định thay vì cỡ `clamp()` của tiêu đề
cha, khiến `text-fit` co nhầm và tiêu đề nhỏ đi rất nhiều. Với `h1` còn phải
tách `font-size` ra khỏi shorthand `font:`.

**3. Ảnh nền trong suốt không dùng thuộc tính `width`/`height` trong HTML.**
Chúng đặt kích thước theo chiều cao (`height: 87%`), thuộc tính HTML sẽ ép
chiều rộng thành giá trị cứng và **méo ảnh**. Khung ảnh khác dùng
`object-fit: cover` nên crop chủ ý, không tính là méo.

## Tech

- HTML, CSS, JavaScript thuần — không build, không framework
- GSAP + ScrollTrigger qua CDN cho cuộn ngang section Journey
- Nền shader viết bằng Canvas 2D, không phụ thuộc CDN
- Ảnh WebP tối ưu, có `loading="lazy"`
- Menu trượt trên mobile, hỗ trợ đóng bằng phím Escape
- Tôn trọng `prefers-reduced-motion`: tắt shader, hiện nội dung ngay
- Trang vẫn đọc được đầy đủ nếu GSAP hoặc toàn bộ JavaScript bị chặn
- Chia sẻ mạng xã hội có sẵn thẻ Open Graph và Twitter Card

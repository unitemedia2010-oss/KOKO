"""
cat-nen-anh.py — cắt nền ảnh người, xuất ra WebP nền trong suốt
=========================================================================
MỤC ĐÍCH
    Repo có một số file đặt tên "cutout-*" nhưng thật ra là ảnh CHỤP CÓ BỐI
    CẢNH. Khi đặt lên nền tối của website, khối bối cảnh bị cắt thành hình
    chữ nhật thẳng, lộ viền, trông như "ảnh lớp trên không khớp nền".

    Script này dùng rembg để tách người khỏi nền, cho ra ảnh PNG/WebP có
    kênh alpha thật sự.

CÁCH DÙNG
    # Xem danh sách ảnh nên cắt
    python tools/cat-nen-anh.py --xem

    # Cắt một ảnh, xem trước kết quả
    python tools/cat-nen-anh.py assets/images/cutout-navy-lean.webp

    # Ghi thẳng ra thư mục dùng (chỉ khi đã xem kết quả và thấy ổn)
    python tools/cat-nen-anh.py assets/images/cutout-navy-lean.webp --ghi

LƯU Ý QUAN TRỌNG
    rembg dùng mô hình AI, và mô hình tải về ở lần chạy đầu (~170 MB).
    Kết quả KHÔNG chắc chắn đúng 100%: nền đá có hoa văn và bóng đổ có thể bị
    sót lại thành mảng, hoặc tóc/áo có thể bị cắt mất sắc nét.

    Vì vậy script LUÔN xuất ảnh kết quả ra thư mục khoa/ để xem trước.
    Chỉ dùng --ghi khi bạn đã tự nhìn và đồng ý.
"""
import os
import sys
import glob

# Danh sách ảnh nằm trong section nào, để dễ tra cứu
ANH_TRONG_WEB = {
    'assets/images/cutout-navy-bag.webp':   'section Operator (dung san)',
    'assets/images/cutout-beige.webp':      'section Beyond The Office (dung san)',
    'assets/images/cutout-navy-lean.webp':  'section Next Chapter — SAI, can cat nen',
    'assets/images/cutout-office-angle.webp':'khong dung, khong cat',
    'assets/images/cutout-office-front.webp':'khong dung, khong cat',
}

THU_MUC_KET_QUA = 'khoa/cat-nen'


def tim_anh(duong_dan):
    """Chấp nhận cả tên file lẫn đường dẫn tương đối."""
    if os.path.exists(duong_dan):
        return duong_dan
    for f in glob.glob('assets/images/' + duong_dan):
        return f
    for f in glob.glob('assets/images/*' + duong_dan + '*'):
        return f
    return None


def xem_truoc():
    print('\nANH CO TRONG WEBSITE\n' + '=' * 62)
    for duong, ghi_chu in ANH_TRONG_WEB.items():
        duong = duong.replace('assets/images/', 'assets/images/')
        co = 'OK ' if os.path.exists(duong) else 'THIEU'
        print('  %s %-34s %s' % (co, os.path.basename(duong), ghi_chu))
    print('\nCHAY:\n  python tools/cat-nen-anh.py <ten-anh>')
    print('Vi du:\n  python tools/cat-nen-anh.py cutout-navy-lean\n')
    sys.exit(0)


def cat_nen(duong_vao, ghi_thang = False):
    try:
        from rembg import remove, new_session
    except ImportError:
        print('Chua cai rembg. Chay:\n  pip install rembg onnxruntime pillow')
        sys.exit(1)

    try:
        from PIL import Image
    except ImportError:
        print('Chua cai Pillow. Chay:\n  pip install pillow')
        sys.exit(1)

    if not os.path.exists(THU_MUC_KET_QUA):
        os.makedirs(THU_MUC_KET_QUA)

    duong = tim_anh(duong_vao)
    if not duong:
        print('Khong tim thay anh: %s' % duong_vao)
        sys.exit(1)

    print('Dang nap mo hinh AI (lan dau se tai ~170 MB, can cho) ...')
    # u2net la mo hinh chinh, can bang cho chat luong va kich thuoc
    session = new_session('u2net')

    print('Dang cat nen: %s' % duong)
    with open(duong, 'rb') as f:
        du_lieu = f.read()

    ket_qua = remove(du_lieu, session=session)
    anh = Image.open(__import__('io').BytesIO(ket_qua)).convert('RGBA')

    ten = os.path.splitext(os.path.basename(duong))[0]
    ra_kt = os.path.join(THU_MUC_KET_QUA, ten + '-cutout.png')
    anh.save(ra_kt)
    print('Da luu ban kiem tra: %s (%dx%d)' % (ra_kt, anh.width, anh.height))

    # Anh nen magenta de nhin ro phan con sot
    nen = Image.new('RGBA', anh.size, (255, 0, 255, 255))
    nen.alpha_composite(anh)
    ra_nen = os.path.join(THU_MUC_KET_QUA, ten + '-nen.png')
    nen.convert('RGB').resize((anh.width // 3, anh.height // 3)).save(ra_nen)
    print('Da luu anh nen kiem tra: %s' % ra_nen)

    # Bao cao chat luong
    a = anh.split()[3]
    px = a.load()
    w, h = anh.size

    def vung(x0, y0, x1, y1):
        s = n = 0
        for y in range(y0, y1, 2):
            for x in range(x0, x1, 2):
                s += px[x, y]; n += 1
        return s / n if n else 0

    trong = 0
    for v in a.getdata():
        if v < 16:
            trong += 1

    print('\nKIEM TRA CHAT LUONG')
    print('  4 vien 20px: tren=%.0f duoi=%.0f trai=%.0f phai=%.0f'
          % (vung(0, 0, w, 20), vung(0, h - 20, w, h),
             vung(0, 0, 20, h), vung(w - 20, 0, w, h)))
    print('  Dien tich trong suot: %.1f%%' % (100.0 * trong / (w * h)))
    canh = [vung(0, 0, w, 20), vung(0, h - 20, w, h),
            vung(0, 0, 20, h), vung(w - 20, 0, w, h)]
    if max(canh) > 12:
        print('  [CANH VAN CON NEN] Nen phuc tap, co the con sot.')
        print('    Hay mo file "-nen.png" de xem.')
    else:
        # Khong dung ky tu dac biet: console Windows mac dinh khong ho tro
        print('  [OK] 4 vien deu trong suot, nen da cat sach.')

    if ghi_thang:
        ra_webp = duong.replace('.webp', '-cutout.webp')
        anh.save(ra_webp, 'WEBP', quality=92, method=6)
        print('\nDa ghi vao web: %s' % ra_webp)
        print('Cap nhat index.html: doi duong dan sang file moi.')
    else:
        print('\nCHUA GHI VAO WEBSITE.')
        print('Mo %s xem truoc. Neu o, chay lai voi --ghi' % ra_nen)


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] == '--xem':
        xem_truoc()
    else:
        ghi = '--ghi' in sys.argv
        cat_nen(sys.argv[1], ghi)

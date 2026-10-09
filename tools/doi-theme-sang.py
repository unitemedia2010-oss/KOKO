import io

p = 'css/style.css'
s = io.open(p, encoding='utf-8').read()

CU = """  /* Trên nền sáng, đỏ gốc đã đủ tương phản nên không cần sáng thêm */
  --wine-text: #9c0d1e;

  /* trên nền sáng, gold phải đậm lại mới đủ tương phản */
  --gold: #8a6a22;
  --gold-soft: #a8853f;
  --gold-deep: #6d5319;
  --gold-glow: rgba(138,106,34,.18);
}"""

MOI = """  /* Nen sang: ho phach phai DAm lai moi du tuong phan cho chu nho,
     neu giu nguyen mau tren nen toi thi se qua ngan AA. */
  --amber-text: #a8631f;
  --teal-text: #2f6870;

  --gold: #a8631f;
  --gold-soft: #b57a2e;
  --gold-deep: #8a5418;
  --gold-glow: rgba(168,99,31,.18);
}"""

if CU in s:
    s = s.replace(CU, MOI)
    io.open(p, 'w', encoding='utf-8').write(s)
    print('OK da doi khoi theme sang')
else:
    print('KHONG khop khoi can doi')
    for i, l in enumerate(s.split('\n'), 1):
        if 'gold-glow' in l or 'Trên nền sáng' in l:
            print('  dong', i)

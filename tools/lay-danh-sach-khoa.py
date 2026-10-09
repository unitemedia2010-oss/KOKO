import re, io
s = io.open('index.html', encoding='utf-8').read()
keys = re.findall(r'data-cms="([a-z0-9_]+)"', s)
seen = []
for k in keys:
    if k not in seen: seen.append(k)
print('TONG SO KHOA:', len(seen))
for i in range(0, len(seen), 4):
    print('  '.join(x.ljust(22) for x in seen[i:i+4]))

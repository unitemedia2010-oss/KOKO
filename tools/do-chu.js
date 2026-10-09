const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.fit-line').forEach(el => {
      const cha = el.parentElement;
      const cs = getComputedStyle(cha);
      out.push({
        tieuDe: cha.tagName,
        cls: (typeof cha.className === 'string' ? cha.className : '').split(' ')[0],
        chu: el.textContent.trim().slice(0, 16),
        coHienTai: getComputedStyle(el).fontSize,
        coCha: cs.fontSize,
        inline: el.style.fontSize || '(rong)',
        khungCha: cha.clientWidth,
        rongChu: el.scrollWidth
      });
    });
    return out;
  });
  console.log('tieu de            | chu              | co hien tai | co cha   | khung  | rong chu');
  r.forEach(x => console.log(
    (x.cls + '/' + x.tieuDe).padEnd(19) + '| ' + x.chu.padEnd(17) + '| ' +
    x.coHienTai.padEnd(12) + '| ' + x.coCha.padEnd(9) + '| ' + String(x.khungCha).padEnd(7) + '| ' + x.rongChu));
  await b.close();
})();

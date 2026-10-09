const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
    await p.evaluate(t => {
      document.documentElement.dataset.theme = t;
      window.dispatchEvent(new CustomEvent('koko:theme', { detail: { theme: t } }));
    }, theme);
    await p.waitForTimeout(700);
    for (const [id, ten] of [['#beyond-office','lifestyle'], ['#next-chapter','next'], ['#how-she-builds','how']]) {
      await p.evaluate(sel => {
        const e = document.querySelector(sel);
        window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' });
        ScrollTrigger.update();
      }, id);
      await p.waitForTimeout(500);
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await p.screenshot({ path: `khoa/${ten}-${theme}.png` });
    }
    await p.close();
  }
  await b.close();
  console.log('xong');
})();

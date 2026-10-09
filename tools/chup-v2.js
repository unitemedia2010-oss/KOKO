const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark','light']) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
    await p.evaluate(t => { document.documentElement.dataset.theme = t;
      window.dispatchEvent(new CustomEvent('koko:theme', { detail: { theme: t } })); }, theme);
    await p.waitForTimeout(600);
    for (const [sel, ten] of [['#profile','profile'],['#unite','unite'],['#point-of-view','pov']]) {
      await p.evaluate(s => { const e = document.querySelector(s);
        window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - 80, behavior:'instant' });
        ScrollTrigger.update(); }, sel);
      await p.waitForTimeout(450);
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await p.screenshot({ path: `khoa/v2-${ten}-${theme}.png` });
    }
    await p.close();
  }
  await b.close();
  console.log('xong');
})();

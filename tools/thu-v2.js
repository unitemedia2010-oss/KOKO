const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const loi = [];
  p.on('console', m => { if (m.type() === 'error') loi.push(m.text().slice(0, 140)); });
  p.on('pageerror', e => loi.push('PAGEERROR: ' + e.message.slice(0, 140)));
  p.on('requestfailed', r => loi.push('REQ FAIL: ' + r.url().slice(-70)));

  await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: 'khoa/v2-hero-dau.png' });

  // Cuon giua chung, xem cong mo
  await p.evaluate(() => window.scrollTo(0, window.innerHeight * 1.1));
  await p.waitForTimeout(900);
  await p.screenshot({ path: 'khoa/v2-hero-mo.png' });

  await p.evaluate(() => window.scrollTo(0, window.innerHeight * 2.4));
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'khoa/v2-hero-mo-het.png' });

  console.log('LOI:', loi.length ? loi.join(' | ') : '(khong co)');
  const r = await p.evaluate(() => ({
    heroH: document.querySelector('.portal').offsetHeight,
    anhHien: getComputedStyle(document.querySelector('.portal-image')).display,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1
  }));
  console.log(JSON.stringify(r));
  await b.close();
})();

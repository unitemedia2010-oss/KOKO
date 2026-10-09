const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'khoa/mo-dong.png' });

  await p.click('#menuToggle');
  await p.waitForTimeout(900);
  await p.screenshot({ path: 'khoa/mo-menu.png' });

  // dong menu bang phim Escape
  await p.keyboard.press('Escape');
  await p.waitForTimeout(700);
  const daDong = await p.evaluate(() => !document.getElementById('mobileMenu').classList.contains('is-open'));
  await p.screenshot({ path: 'khoa/da-dong-menu.png' });

  console.log('Escape dong menu:', daDong);
  await b.close();
})();

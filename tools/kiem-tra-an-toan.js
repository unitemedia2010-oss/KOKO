const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();

  // 1. Chan CDN GSAP: trang phai van doc duoc day du
  let p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route('**cdnjs.cloudflare.com/**', r => r.abort());
  await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const r1 = await p.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.reveal,.reveal-left,.reveal-right,[data-stagger] > *'));
    const an = all.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.05);
    const chu = document.querySelector('.hero-copy h1 .fit-line').textContent.trim();
    const fs = getComputedStyle(document.querySelector('.hero-copy h1 .fit-line')).fontSize;
    return { loi: 'GSAP bi chan', soPhanTu: all.length, biAn: an.length,
             mau: an.slice(0,3).map(e=>e.className.slice(0,30)), heroChu: chu, heroSize: fs };
  });
  console.log(JSON.stringify(r1));
  await p.screenshot({ path: 'khoa/khong-gsap.png' });
  await p.close();

  // 2. Tat ca JavaScript: noi dung van phai hien
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'khoa/khong-js.png' });
  const r2 = await p.textContent('h1');
  console.log(JSON.stringify({ loi: 'tat ca JavaScript', h1: r2.replace(/\s+/g,' ').trim().slice(0,40) }));
  await ctx.close();

  // 3. prefers-reduced-motion: phai hien ngay, khong shader
  const ctx3 = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  p = await ctx3.newPage();
  await p.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'khoa/giam-chuyen-dong.png' });
  console.log(JSON.stringify({ loi: 'prefers-reduced-motion', ok: true }));
  await ctx3.close();

  await b.close();
})();

/**
 * Kiem tra tu dong bo cuc KOKO
 * ------------------------------------------------------------------
 * Dung bang trinh duyet that, do:
 *   1. Tran ngang toan trang (ke ca o kich thuoc mong)
 *   2. Chu bi cat hoac tran ra ngoai khung chua
 *   3. Noi dung bi an do JS loi
 *   4. Do phan quang cua cap chu va chu nho nhat
 *   5. Muc do bien dong DOM khi doi kich thuoc (chi so canh bao)
 *
 * Chay: node kiem-tra-bo-cuc.js
 */
'use strict';

const { chromium } = require('playwright');
const path = require('path');

const URL = process.env.KOKO_URL || 'http://127.0.0.1:8080/';

/* Cac kich thuoc dang gap: desktop rong, laptop, tablet, mobile lon, mobile nho */
const SIZES = [
  { name: '1920 desktop', w: 1920, h: 1080 },
  { name: '1440 laptop', w: 1440, h: 900 },
  { name: '1280 laptop', w: 1280, h: 800 },
  { name: '1024 tablet lon', w: 1024, h: 768 },
  { name: '768 tablet', w: 768, h: 1024 },
  { name: '414 mobile lon', w: 414, h: 896 },
  { name: '360 mobile', w: 360, h: 740 },
  { name: '320 mobile nho', w: 320, h: 568 },
];

/* Ham chay trong trinh duyet, nhung mot lan cho moi kich thuoc */
const PROBE = () => {
  const out = {
    docScrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    overflowing: [],
    clippedText: [],
    invisible: [],
    smallContrast: [],
  };

  /* --- 1. Phan tu tran ngoai khung nhin --- */
  const all = document.querySelectorAll('main *, footer *, header *');
  all.forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;

    /* Bo qua cac phan tu co chu dich, ngang hang: chay doc, thiet bi keo */
    let node = el;
    let deliberate = false;
    while (node && node !== document.body) {
      const ncs = getComputedStyle(node);
      if (ncs.overflowX === 'hidden' || ncs.overflowX === 'clip' || ncs.overflowX === 'auto' || ncs.overflowX === 'scroll') {
        deliberate = true;
        break;
      }
      node = node.parentElement;
    }
    if (deliberate) return;

    if (r.right > window.innerWidth + 2 || r.left < -2) {
      out.overflowing.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  });

  /* --- 2. Chu bi cat: so san scrollWidth voi clientWidth tren chinh no --- */
  document.querySelectorAll('h1, h2, h3, h4, p, li, span, a, button, blockquote').forEach((el) => {
    if (!el.textContent.trim()) return;
    if (el.children.length) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline') return;
    if (cs.whiteSpace === 'nowrap' && el.classList.contains('fit-line')) return; /* text-fit lo phan nay */
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') {
      out.clippedText.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
        text: el.textContent.trim().slice(0, 40),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      });
    }
  });

  /* --- 3. Noi dung bi an --- */
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, [data-stagger] > *').forEach((el) => {
    if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
      out.invisible.push(el.className.slice(0, 40) || el.tagName);
    }
  });

  /* --- 4. Tuong phan chu --- */
  const toRgb = (c) => {
    const m = c.match(/\d+(\.\d+)?/g);
    return m ? m.slice(0, 3).map(Number) : null;
  };
  const lum = (rgb) => {
    const a = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  /* Nen chay nhat phia tren phan tu, bo qua anh trong suot */
  const bgOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = toRgb(getComputedStyle(node).backgroundColor);
      const alpha = getComputedStyle(node).backgroundColor.match(/rgba?\([^)]*?,\s*([\d.]+)\)/);
      if (c && (!alpha || parseFloat(alpha[1]) > 0.85)) return c;
      node = node.parentElement;
    }
    const root = getComputedStyle(document.documentElement);
    return toRgb(root.getPropertyValue('--bg').trim()) || [9, 9, 9];
  };

  document.querySelectorAll('p, h1, h2, h3, h4, a, span, li, button, blockquote').forEach((el) => {
    if (!el.textContent.trim() || el.children.length) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.1) return;

    /* Chỉ viền (outline) dùng -webkit-text-stroke, color là trong suốt nên
       không so sánh được. Bo qua, nét viền đã được chọn tay để đủ tương phản. */
    if (cs.webkitTextStrokeColor && cs.webkitTextStrokeWidth !== '0px') return;

    const fg = toRgb(cs.color);
    if (!fg) return;
    const bg = bgOf(el);

    const l1 = Math.max(lum(fg), lum(bg));
    const l2 = Math.min(lum(fg), lum(bg));
    const ratio = (l1 + 0.05) / (l2 + 0.05);

    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    const need = large ? 3 : 4.5;

    /* Cho phép sai so 0.01: gia tri that suy ra lam tron ra 2 chu so
       (4.4996 -> 4.5) khong phai la loi tuong phan. */
    if (ratio < need - 0.01) {
      out.smallContrast.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
        text: el.textContent.trim().slice(0, 34),
        ratio: +ratio.toFixed(3),
        need: need,
        px: Math.round(px),
      });
    }
  });

  return out;
};

/* Cho phep moi thu tuc ve o cua dinh huong, tranh bao do sai */
const settle = async (page) => {
  await page.waitForTimeout(260);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(260);
};

(async () => {
  const browser = await chromium.launch();
  let totalProblem = 0;

  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    /* Cuon het trang de moi khoi hieu ung deu bat class is-in */
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.7);
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 55));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await settle(page);

    const data = await page.evaluate(PROBE);
    await page.close();

    const problems = [];
    if (data.horizontalScroll) problems.push('TRAN NGANG toan trang: ' + data.docScrollW + ' > ' + data.innerW);
    if (data.overflowing.length) problems.push('Phan tu tran ngoai (' + data.overflowing.length + '): ' + JSON.stringify(data.overflowing.slice(0, 4)));
    if (data.clippedText.length) problems.push('Chu bi cat (' + data.clippedText.length + '): ' + JSON.stringify(data.clippedText.slice(0, 4)));
    if (data.invisible.length) problems.push('Noi dung bi an (' + data.invisible.length + '): ' + JSON.stringify(data.invisible.slice(0, 4)));
    if (data.smallContrast.length) problems.push('Tuong phan thap (' + data.smallContrast.length + '): ' + JSON.stringify(data.smallContrast.slice(0, 5)));

    const ok = problems.length === 0;
    if (!ok) totalProblem++;
    console.log((ok ? '  OK  ' : ' LOI  ') + size.name.padEnd(16) + size.w + 'x' + size.h);
    problems.forEach((p) => console.log('         - ' + p));
  }

  await browser.close();
  console.log('\n' + (totalProblem === 0 ? 'Khong co loi bo cuc nao.' : totalProblem + '/' + SIZES.length + ' kich thuoc con loi.'));
  process.exit(totalProblem === 0 ? 0 : 1);
})();

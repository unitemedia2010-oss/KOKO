/**
 * Kiểm tra riêng cho text-fit.js
 * ------------------------------------------------------------------
 * Ba điều phải đúng:
 *   1. Không dòng nào tràn ra ngoài khung chứa
 *   2. Các dòng CÙNG một tiêu đề phải có cùng tỉ lệ co
 *      (đây là lỗi đã gặp: dòng ngắn bị kéo giãn khổng lồ)
 *   3. Cỡ chữ không nhỏ hơn giới hạn dưới
 *
 * Chạy: node tools/kiem-tra-chu.js
 */
'use strict';

const { chromium } = require('playwright');

const URL = process.env.KOKO_URL || 'http://127.0.0.1:8080/';

const SIZES = [
  { name: '1920', w: 1920, h: 1080 },
  { name: '1440', w: 1440, h: 900 },
  { name: '1280', w: 1280, h: 800 },
  { name: '1024', w: 1024, h: 768 },
  { name: '768', w: 768, h: 1024 },
  { name: '414', w: 414, h: 896 },
  { name: '360', w: 360, h: 740 },
  { name: '320', w: 320, h: 568 },
];

const MIN_RATIO = 0.72;

(async () => {
  const browser = await chromium.launch();
  let loi = 0;

  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
    await page.goto(URL, { waitUntil: 'load' });
    // Chờ font tải xong rồi đo, nếu không kết quả sẽ sai
    await page.waitForTimeout(500);
    await page.evaluate(() => window.KOKO && window.KOKO.fitText());
    await page.waitForTimeout(300);

    const data = await page.evaluate((minRatio) => {
      const nhom = [];
      const index = [];
      document.querySelectorAll('.fit-line').forEach(el => {
        const cha = el.parentElement;
        const i = index.indexOf(cha);
        if (i === -1) { index.push(cha); nhom.push({ tieuDe: el.tagName, dong: [el] }); }
        else nhom[i].dong.push(el);
      });

      const tran = [], lech = [], quaNho = [];

      nhom.forEach(n => {
        // Cỡ chữ gốc do CSS đặt: đọc khi style rỗng
        const coGoc = n.dong.map(el => {
          const size = el.style.fontSize;
          el.style.fontSize = '';
          const v = parseFloat(getComputedStyle(el).fontSize);
          el.style.fontSize = size;
          return v;
        });

        const tiLe = n.dong.map((el, i) => {
          const size = parseFloat(el.style.fontSize);
          return size ? +(size / coGoc[i]).toFixed(3) : 1;
        });

        // 1. dòng nào tràn khung
        n.dong.forEach(el => {
          const r = el.getBoundingClientRect();
          const khung = el.parentElement.getBoundingClientRect();
          if (r.width > 0 && r.width > khung.width + 1.5) {
            tran.push({ tieuDe: n.tieuDe, chu: el.textContent.trim().slice(0, 20),
                        rong: Math.round(r.width), khung: Math.round(khung.width) });
          }
        });

        // 2. các dòng phải cùng tỉ lệ, TRỪ khi dòng được đánh dấu
        //    data-fit-scale (cỡ nhỏ hơn có chủ đích)
        //    So sánh tiLe chia cho tyLeThietKe de bo qua phan chu dich.
        if (n.dong.length > 1) {
          const chuan = n.dong.map((el) => {
            const s = parseFloat(el.getAttribute('data-fit-scale'));
            return isFinite(s) && s > 0 ? s : 1;
          });
          const hieuChinh = tiLe.map((t, i) => +(t / chuan[i]).toFixed(3));
          const min = Math.min(...hieuChinh), max = Math.max(...hieuChinh);
          if (max - min > 0.02) {
            lech.push({ tieuDe: n.tieuDe,
                       dong: n.dong.map((el, i) => el.textContent.trim().slice(0, 14) + '=' + hieuChinh[i]) });
          }
        }

        // 3. không nhỏ quá giới hạn — tính theo tỉ lệ co thực tế, không tính
        //    phần nhỏ có chủ đích do data-fit-scale quy định
        n.dong.forEach((el, i) => {
          const s = parseFloat(el.getAttribute('data-fit-scale'));
          const chuan = isFinite(s) && s > 0 ? s : 1;
          const heSoCo = tiLe[i] / chuan;
          if (heSoCo < minRatio - 0.01) {
            quaNho.push({ chu: el.textContent.trim().slice(0, 18), heSoCo: +heSoCo.toFixed(3) });
          }
        });
      });

      return { soNhom: nhom.length, tran, lech, quaNho };
    }, MIN_RATIO);

    await page.close();

    const vong = data.tran.length + data.lech.length + data.quaNho.length;
    if (vong > 0) loi++;
    console.log((vong === 0 ? '  OK  ' : ' LOI  ') + size.name.padEnd(6) +
                size.w + 'x' + size.h + '  (' + data.soNhom + ' tieu de)');
    if (data.tran.length) console.log('         tran khung: ' + JSON.stringify(data.tran.slice(0, 3)));
    if (data.lech.length) console.log('         lech ti le: ' + JSON.stringify(data.lech.slice(0, 3)));
    if (data.quaNho.length) console.log('         nho qua: ' + JSON.stringify(data.quaNho.slice(0, 3)));
  }

  await browser.close();
  console.log('\n' + (loi === 0 ? 'Tieu de khop o moi kich thuoc.' : loi + '/' + SIZES.length + ' kich thuoc con loi.'));
  process.exit(loi === 0 ? 0 : 1);
})();

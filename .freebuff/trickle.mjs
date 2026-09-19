// Trickle downloader for luxeweddings.in gallery originals — one request per 50s,
// no retries (bursts/rate-retries reset the site's throttle). One-shot script.
import { writeFileSync, appendFileSync } from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const REF = 'https://luxeweddings.in/gallery';
const LOG = '.freebuff/trickle.log';

const FILES = [
  'img/slider/about-form.jpg',
  'img/slider/wedding-1.jpg',
  'img/slider/wedding-2.jpg',
  'img/slider/contact-img.jpg',
  'img/gallery/decor-1.jpeg',
  'img/gallery/decor-3.jpeg',
  'img/gallery/decor-4.jpeg',
  'img/gallery/decor-5.jpeg',
  'img/gallery/decor-6.jpg',
  'img/gallery/decor-7.jpeg',
  'img/gallery/moment-1.jpg',
  'img/gallery/moment-2.jpg',
  'img/gallery/wedding-entertainment.jpg',
  'img/gallery/wedding-entertainment-1.jpg',
  'img/wedding.jpg',
];

const nameOf = (f) => f.split('/').pop().replace(/\.jpeg$/i, '.jpg');

writeFileSync(LOG, `trickle started ${new Date().toISOString()}\n`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(f) {
  const name = nameOf(f);
  const res = await fetch(`https://luxeweddings.in/${f}`, {
    headers: { 'User-Agent': UA, Referer: REF, Accept: 'image/*,*/*' },
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.startsWith('image/')) {
    appendFileSync(LOG, `${name} MISS status=${res.status} ct=${ct}\n`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) {
    appendFileSync(LOG, `${name} MISS too-small ${buf.length}B\n`);
    return;
  }
  const { writeFileSync: wf } = await import('fs');
  wf(`public/gallery/${name}`, buf);
  appendFileSync(LOG, `${name} OK ${buf.length}B\n`);
}

for (let i = 0; i < FILES.length; i++) {
  if (i > 0) await sleep(50000);
  try {
    await fetchOne(FILES[i]);
  } catch (e) {
    appendFileSync(LOG, `${nameOf(FILES[i])} ERROR ${e.message}\n`);
  }
}
appendFileSync(LOG, `trickle done ${new Date().toISOString()}\n`);

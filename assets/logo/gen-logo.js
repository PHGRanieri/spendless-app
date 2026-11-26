// Gera os SVGs da logo A ("Broto no $") e renderiza os PNGs com o Chrome headless.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [,, outLogo, outAssets, work] = process.argv;
const F = '#14532D', B = '#16A34A', O = '#DCFCE7', W = '#FFFFFF';
const S = 'M668 392 C 630 340, 560 322, 500 330 C 420 340, 372 392, 380 452 C 390 530, 470 548, 540 566 C 616 586, 680 612, 676 690 C 672 760, 600 798, 520 796 C 440 794, 384 762, 352 710';
const bar = (c) => `<path d="M512 330 V 820" stroke="${c}" stroke-width="64" stroke-linecap="round"/>`;
const stem = (c) => `<path d="M512 330 C 512 270, 512 250, 512 236" stroke="${c}" stroke-width="40" stroke-linecap="round"/>`;
const leafR = (c) => `<path d="M512 250 C 520 170, 600 128, 690 140 C 680 222, 606 262, 512 250 Z" fill="${c}"/>`;
const leafL = (c) => `<path d="M512 262 C 500 200, 440 170, 372 180 C 384 240, 440 272, 512 262 Z" fill="${c}"/>`;
const ess = (c) => `<path d="${S}" fill="none" stroke="${c}" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/>`;
// Glifo centrado no quadro (desce 30px para equilibrar folhas + cifrão).
const glyph = (parts, scale = 1) =>
  `<g transform="translate(512 542) scale(${scale}) translate(-512 -512) translate(0 30)">${parts}</g>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${body}</svg>`;
const tile = `<rect width="1024" height="1024" rx="224" fill="${F}"/>`;
const full = (c = {}) => stem(c.stem ?? B) + leafR(c.r ?? B) + leafL(c.l ?? O) + bar(c.bar ?? W) + ess(c.s ?? W);

const files = {
  // Fonte mestra para uso futuro (marca completa no ladrilho).
  [path.join(outLogo, 'spendless-logo.svg')]: svg(tile + glyph(full())),
  [path.join(outLogo, 'spendless-mark-onlight.svg')]: svg(glyph(full({ bar: F, s: F }))),
};
for (const [f, c] of Object.entries(files)) fs.writeFileSync(f, c);

// Saídas raster: [arquivo, svg, tamanho, transparente]
const shots = [
  [path.join(outAssets, 'icon.png'), svg(`<rect width="1024" height="1024" fill="${F}"/>` + glyph(full())), 1024, false],
  [path.join(outAssets, 'favicon.png'), svg(tile + glyph(full())), 1024, true],
  // Splash nativo = primeiro quadro da animação: ladrilho + cifrão + haste, sem folhas.
  [path.join(outAssets, 'splash-icon.png'), svg(tile + glyph(stem(B) + bar(W) + ess(W))), 1024, true],
  [path.join(outAssets, 'android-icon-background.png'), svg(`<rect width="1024" height="1024" fill="${F}"/>`), 1024, false],
  // Zona segura do ícone adaptativo: ~66% central.
  [path.join(outAssets, 'android-icon-foreground.png'), svg(glyph(full(), 0.7)), 1024, true],
  [path.join(outAssets, 'android-icon-monochrome.png'), svg(glyph(full({ stem: W, r: W, l: W }), 0.7)), 1024, true],
  // Camadas da animação de abertura (mesmo quadro de 1024, empilhadas).
  [path.join(outLogo, 'mark-base.png'), svg(tile + glyph(stem(B) + bar(W) + ess(W))), 1024, true],
  [path.join(outLogo, 'mark-leaf-right.png'), svg(glyph(leafR(B))), 1024, true],
  [path.join(outLogo, 'mark-leaf-left.png'), svg(glyph(leafL(O))), 1024, true],
];
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
shots.forEach(([out, s, size, transparent], i) => {
  const html = path.join(work, `shot${i}.html`);
  fs.writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">${s.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</body></html>`);
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${size},${size}`, `--screenshot=${out}`];
  if (transparent) args.push('--default-background-color=00000000');
  execFileSync(chrome, [...args, 'file:///' + html.split(String.fromCharCode(92)).join('/')], { stdio: 'inherit' });
  console.log('ok', path.basename(out));
});

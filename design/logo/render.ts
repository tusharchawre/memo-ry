// The Memo-ry mark: five rounded waveform bars, tall at the edges and short in the middle (an M you can hear).
// `bun design/logo/render.ts` writes every icon (phone, Mac app, Mac menu bar) from this one definition.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BG = '#000000';
const FG = '#F5F5F5';

/** The glyph in a 1024 box, centred, scaled by `s`. */
export function glyph(s: number, fg = FG): string {
  const w = 84;
  const gap = 48;
  const heights = [560, 380, 200, 380, 560];
  const x0 = (1024 - (heights.length * w + (heights.length - 1) * gap)) / 2;
  const bars = heights.map((h, i) => `<rect x="${x0 + i * (w + gap)}" y="${512 - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="${fg}"/>`).join('');
  return `<g transform="translate(512 512) scale(${s}) translate(-512 -512)">${bars}</g>`;
}

const svg = (body: string, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;

export const files: Record<string, string> = {
  // Phone
  'icon.svg': svg(`<rect width="1024" height="1024" fill="${BG}"/>${glyph(0.92)}`),
  'android-icon-foreground.svg': svg(glyph(0.6)),
  'android-icon-background.svg': svg(`<rect width="1024" height="1024" fill="${BG}"/>`),
  'android-icon-monochrome.svg': svg(glyph(0.6, '#FFFFFF')),
  'splash-icon.svg': svg(glyph(1)),
  // Mac app (Big Sur grid: 824 squircle on a 1024 canvas)
  'mac-icon.svg': svg(
    `<rect x="100" y="100" width="824" height="824" rx="185" fill="${BG}"/><rect x="101" y="101" width="822" height="822" rx="184" fill="none" stroke="#2C2C2E" stroke-width="2"/>${glyph(0.66)}`,
  ),
  // Mac menu bar (template image: black on transparent, macOS tints it)
  'menubar.svg': svg(glyph(1.45, '#000000')),
};

if (import.meta.main) {
  const dir = import.meta.dir;
  const root = join(dir, '..', '..');
  const render = (name: string, out: string, size: number) => {
    const res = Bun.spawnSync(['rsvg-convert', '-w', String(size), '-h', String(size), join(dir, name), '-o', out]);
    if (res.exitCode !== 0) throw new Error(res.stderr.toString());
  };
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), `${body}\n`);

  const images = join(root, 'assets', 'images');
  render('icon.svg', join(images, 'icon.png'), 1024);
  render('android-icon-foreground.svg', join(images, 'android-icon-foreground.png'), 1024);
  render('android-icon-background.svg', join(images, 'android-icon-background.png'), 1024);
  render('android-icon-monochrome.svg', join(images, 'android-icon-monochrome.png'), 1024);
  render('splash-icon.svg', join(images, 'splash-icon.png'), 1024);
  render('icon.svg', join(images, 'favicon.png'), 48);

  const res = join(root, 'mac', 'app', 'Resources');
  mkdirSync(res, { recursive: true });
  const iconset = join(res, 'AppIcon.iconset');
  rmSync(iconset, { recursive: true, force: true });
  mkdirSync(iconset);
  for (const size of [16, 32, 128, 256, 512]) {
    render('mac-icon.svg', join(iconset, `icon_${size}x${size}.png`), size);
    render('mac-icon.svg', join(iconset, `icon_${size}x${size}@2x.png`), size * 2);
  }
  Bun.spawnSync(['iconutil', '-c', 'icns', iconset, '-o', join(res, 'AppIcon.icns')]);
  rmSync(iconset, { recursive: true, force: true });
  render('menubar.svg', join(res, 'menubar.png'), 18);
  render('menubar.svg', join(res, 'menubar@2x.png'), 36);
  console.log('Icons written: assets/images/*, mac/app/Resources/*');
}

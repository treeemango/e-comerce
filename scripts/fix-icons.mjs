import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const publicDir = path.join(process.cwd(), 'public');

const paths = {
  source: path.join(publicDir, 'icon-512.png'),
  icon192: path.join(publicDir, 'icon-192.png'),
  icon512: path.join(publicDir, 'icon-512.png'),
  appleTouch: path.join(publicDir, 'apple-touch-icon.png'),
  favicon: path.join(publicDir, 'favicon.ico'),
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await fileExists(paths.source))) {
    throw new Error(`Missing source icon at ${paths.source}`);
  }

  const input = await fs.readFile(paths.source);

  // Generate real PNG icons (Google accepts PNG for site icons; 192 & 512 are multiples of 48).
  await sharp(input).resize(192, 192, { fit: 'cover' }).png().toFile(paths.icon192);
  await sharp(input).resize(512, 512, { fit: 'cover' }).png().toFile(paths.icon512);

  // Common iOS touch icon size.
  await sharp(input).resize(180, 180, { fit: 'cover' }).png().toFile(paths.appleTouch);

  // Generate a multi-size favicon.ico (16/32/48).
  const faviconPngs = await Promise.all(
    [16, 32, 48].map((size) => sharp(input).resize(size, size, { fit: 'cover' }).png().toBuffer())
  );
  const ico = await pngToIco(faviconPngs);
  await fs.writeFile(paths.favicon, ico);

  console.log('Icon regeneration complete.');
  console.log('- public/favicon.ico (ICO: 16, 32, 48)');
  console.log('- public/icon-192.png (PNG)');
  console.log('- public/icon-512.png (PNG)');
  console.log('- public/apple-touch-icon.png (PNG 180x180)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

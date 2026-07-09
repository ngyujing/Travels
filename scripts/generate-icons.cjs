const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  const iconsSrc = fs.readFileSync(path.join(__dirname, '../icons/icon.svg'), 'utf-8');
  const maskableSrc = fs.readFileSync(path.join(__dirname, '../icons/icon-maskable.svg'), 'utf-8');

  const sizes = [
    { px: 16, name: 'favicon-16.png', src: iconsSrc },
    { px: 32, name: 'favicon-32.png', src: iconsSrc },
    { px: 180, name: 'apple-touch-icon.png', src: iconsSrc },
    { px: 192, name: 'icon-192.png', src: iconsSrc },
    { px: 512, name: 'icon-512.png', src: iconsSrc },
    { px: 192, name: 'maskable-icon-192.png', src: maskableSrc },
    { px: 512, name: 'maskable-icon-512.png', src: maskableSrc },
  ];

  for (const size of sizes) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: size.px, height: size.px });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  ${size.src}
</body>
</html>`;

    await page.setContent(html);
    const outPath = path.join(__dirname, '../icons', size.name);
    await page.screenshot({ path: outPath, omitBackground: false });
    console.log(`✓ Generated ${size.name} (${size.px}×${size.px})`);
    await page.close();
  }

  await browser.close();
  console.log('\nAll icons generated successfully!');
})().catch(e => {
  console.error('Icon generation failed:', e);
  process.exit(1);
});

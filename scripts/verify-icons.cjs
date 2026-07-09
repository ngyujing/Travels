const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Simple HTTP server for serving the repo
function startServer(port = 8080) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(__dirname, '..', url.parse(req.url).pathname);

      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.readFile(path.join(filePath, 'index.html'), (err, data) => {
            if (err) {
              res.writeHead(404);
              res.end('Not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data);
            }
          });
        } else {
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(500);
              res.end('Error');
            } else {
              let contentType = 'application/octet-stream';
              if (filePath.endsWith('.html')) contentType = 'text/html';
              else if (filePath.endsWith('.png')) contentType = 'image/png';
              else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
              else if (filePath.endsWith('.webmanifest')) contentType = 'application/manifest+json';

              res.writeHead(200, { 'Content-Type': contentType });
              res.end(data);
            }
          });
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`✓ Server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}

(async () => {
  const server = await startServer(8080);
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  const htmlFiles = [
    'index.html',
    'sg_bkk_trip_plan.html',
    'sg_muar_moto_plan.html',
    'sg_malaysia_moto_plan.html',
    'sg_okinawa_trip_plan.html',
    'sg_kota_tinggi_motocamp_plan.html'
  ];

  const iconFiles = [
    'icons/favicon-16.png',
    'icons/favicon-32.png',
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-icon-192.png',
    'icons/maskable-icon-512.png'
  ];

  try {
    console.log('\n--- Verifying Icon Files ---');
    for (const icon of iconFiles) {
      const filepath = path.join(__dirname, '..', icon);
      if (fs.existsSync(filepath)) {
        const stat = fs.statSync(filepath);
        console.log(`✓ ${icon} exists (${stat.size} bytes)`);
      } else {
        console.error(`✗ ${icon} NOT FOUND`);
      }
    }

    console.log('\n--- Verifying Manifest ---');
    const manifestPath = path.join(__dirname, '..', 'manifest.webmanifest');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`✓ manifest.webmanifest exists`);
      console.log(`  - Name: ${manifest.name}`);
      console.log(`  - Icons count: ${manifest.icons.length}`);
    } else {
      console.error(`✗ manifest.webmanifest NOT FOUND`);
    }

    console.log('\n--- Verifying HTML Pages ---');
    for (const htmlFile of htmlFiles) {
      const page = await browser.newPage();

      try {
        await page.goto(`http://localhost:8080/${htmlFile}`);

        // Check manifest link
        const manifestLink = await page.$('link[rel="manifest"]');
        if (manifestLink) {
          console.log(`✓ ${htmlFile} has manifest link`);
        } else {
          console.error(`✗ ${htmlFile} MISSING manifest link`);
        }

        // Check apple-touch-icon
        const appleTouchIcon = await page.$('link[rel="apple-touch-icon"]');
        if (appleTouchIcon) {
          console.log(`  ✓ apple-touch-icon present`);
        } else {
          console.error(`  ✗ apple-touch-icon MISSING`);
        }

        // Check theme-color meta
        const themeColorMeta = await page.$('meta[name="theme-color"]');
        if (themeColorMeta) {
          const content = await page.$eval('meta[name="theme-color"]', el => el.getAttribute('content'));
          console.log(`  ✓ theme-color: ${content}`);
        } else {
          console.error(`  ✗ theme-color MISSING`);
        }

        // Check apple-mobile-web-app-title
        const appTitle = await page.$('meta[name="apple-mobile-web-app-title"]');
        if (appTitle) {
          const content = await page.$eval('meta[name="apple-mobile-web-app-title"]', el => el.getAttribute('content'));
          console.log(`  ✓ app-title: ${content}`);
        } else {
          console.error(`  ✗ apple-mobile-web-app-title MISSING`);
        }

        // For index.html, test dynamic theme-color update
        if (htmlFile === 'index.html') {
          console.log(`\n--- Testing Dynamic Theme Color (index.html) ---`);
          const initialThemeColor = await page.$eval('meta[name="theme-color"]', el => el.getAttribute('content'));
          console.log(`✓ Initial theme-color: ${initialThemeColor}`);

          // Click theme toggle
          await page.click('#themeToggle');
          await page.waitForTimeout(100);

          const newThemeColor = await page.$eval('meta[name="theme-color"]', el => el.getAttribute('content'));
          if (newThemeColor !== initialThemeColor) {
            console.log(`✓ Theme-color updated on toggle: ${newThemeColor}`);
          } else {
            console.error(`✗ Theme-color did NOT update on toggle`);
          }
        }

      } catch (e) {
        console.error(`✗ Error loading ${htmlFile}:`, e.message);
      } finally {
        await page.close();
      }
    }

    console.log('\n--- Verification Complete ---');

  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});

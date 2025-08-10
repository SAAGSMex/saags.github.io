import { chromium, devices, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/*
  Visual regression script básico.
  - Lanza servidor estático embebido (sin dependencias externas) usando data URL file:// fallback.
  - Crea capturas para diferentes viewports (móvil, tablet, desktop) y navegadores principales.
  - Compara contra baselines en tests/visual/baselines. Si UPDATE_BASELINE=1 se regeneran.
*/

// ROOT: usar el directorio de trabajo actual (el script se ejecuta desde la raíz del proyecto)
// Evita problemas de rutas duplicadas en Windows (C:\C:\...) al manipular file:// URLs.
const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const BASELINE_DIR = path.join(ROOT, 'tests/visual/baselines');
const OUTPUT_DIR = path.join(ROOT, 'tests/visual/output');
const UPDATE = process.env.UPDATE_BASELINE === '1';
const IS_CI = process.env.CI === 'true';
let createdBaselines = 0;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const scenarios = [
  { name: 'mobile-portrait', viewport: { width: 360, height: 740 }, device: devices['Pixel 7'] },
  { name: 'mobile-landscape', viewport: { width: 740, height: 360 }, device: devices['Pixel 7 landscape'] },
  { name: 'tablet', viewport: { width: 820, height: 1180 }, device: devices['iPad Air'] },
  { name: 'desktop', viewport: { width: 1440, height: 900 } }
];

const requested = (process.env.BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const all = { chromium, firefox, webkit };
const browsers = requested
  .filter(b => all[b])
  .map(name => ({ name, launcher: all[name] }));
if (!browsers.length) {
  console.error('No hay navegadores válidos en BROWSERS. Usa por ejemplo BROWSERS=chromium');
  process.exit(1);
}

function diffImages(baselinePath, currentPath, diffPath) {
  return new Promise((resolve, reject) => {
    const img1 = fs.createReadStream(baselinePath).pipe(new PNG()).on('parsed', done);
    const img2 = fs.createReadStream(currentPath).pipe(new PNG()).on('parsed', done);
    let doneCount = 0;
    function done() {
      doneCount++;
      if (doneCount < 2) return;
      if (img1.width !== img2.width || img1.height !== img2.height) {
        return reject(new Error('Dimensiones distintas entre baseline y captura actual.'));
      }
      const diff = new PNG({ width: img1.width, height: img1.height });
      const mismatches = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.15 });
      diff.pack().pipe(fs.createWriteStream(diffPath)).on('finish', () => {
        resolve({ mismatches });
      });
    }
  });
}

(async () => {
  const results = [];
  for (const b of browsers) {
    let browser;
    try {
      browser = await b.launcher.launch();
    } catch (err) {
      console.warn(`[SKIP] No se pudo lanzar ${b.name}: ${err.message}`);
      continue;
    }
    try {
      for (const sc of scenarios) {
        const context = await browser.newContext({
          viewport: sc.viewport,
          userAgent: sc.device?.userAgent,
          deviceScaleFactor: sc.device?.deviceScaleFactor,
          isMobile: sc.device?.isMobile,
          hasTouch: sc.device?.hasTouch
        });
        const page = await context.newPage();
        await page.goto('file://' + INDEX_PATH);
        // Esperar a que hero y navbar estén renderizados
        await page.waitForSelector('.hero-section h1');
        // Si hay animaciones que puedan variar, reducir movimiento
        await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
        const shotName = `${b.name}_${sc.name}.png`;
        const shotPath = path.join(OUTPUT_DIR, shotName);
        await page.screenshot({ path: shotPath, fullPage: true });
        const baselinePath = path.join(BASELINE_DIR, shotName);
        if (UPDATE || !fs.existsSync(baselinePath)) {
          fs.copyFileSync(shotPath, baselinePath);
          const status = UPDATE ? 'baseline-updated' : 'baseline-created';
          if (!UPDATE) createdBaselines++;
            results.push({ shot: shotName, status });
        } else {
          const diffPath = path.join(OUTPUT_DIR, shotName.replace('.png', '.diff.png'));
            try {
              const { mismatches } = await diffImages(baselinePath, shotPath, diffPath);
              results.push({ shot: shotName, status: mismatches === 0 ? 'ok' : 'diff', mismatches });
            } catch (err) {
              results.push({ shot: shotName, status: 'error', error: err.message });
            }
        }
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ updated: UPDATE, results }, null, 2));
  const diffs = results.filter(r => r.status === 'diff');
  if (IS_CI && createdBaselines > 0) {
    console.error(`\n[CI] Se crearon ${createdBaselines} baseline(s) nuevas. Debes generarlas y comprometerlas antes de que CI pase. Ejecuta: npm run test:visual:update y haz commit de tests/visual/baselines/*.png`);
    process.exitCode = 2;
  } else if (diffs.length) {
    console.error('\nDiferencias visuales detectadas:', diffs.map(d => d.shot));
    process.exitCode = 1;
  } else {
    console.log('\nPruebas visuales completadas sin diferencias críticas.');
  }
})();

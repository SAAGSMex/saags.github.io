import { chromium, devices, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

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
// Construir URL file:// robusta (Windows + Unix) usando pathToFileURL
const INDEX_URL = pathToFileURL(INDEX_PATH).href;
const BASELINE_DIR = path.join(ROOT, 'tests/visual/baselines');
const OUTPUT_DIR = path.join(ROOT, 'tests/visual/output');
const UPDATE = process.env.UPDATE_BASELINE === '1';
const IS_CI = process.env.CI === 'true';
const USER_FULL_PAGE = process.env.FULL_PAGE; // '1' fuerza fullPage, '0' fuerza viewport, undefined -> auto
const MISMATCH_THRESHOLD = process.env.MISMATCH_THRESHOLD ? parseFloat(process.env.MISMATCH_THRESHOLD) : 0.15;
const SCREENSHOT_TIMEOUT = process.env.SCREENSHOT_TIMEOUT ? parseInt(process.env.SCREENSHOT_TIMEOUT,10) : 60000; // ms
const BLOCK_FONTS = process.env.BLOCK_FONTS === '1';
const FORCE_VIEWPORT = process.env.FORCE_VIEWPORT === '1'; // Ignora heurística y fuerza fullPage=false
const FAIL_ON_DIMENSION_MISMATCH = process.env.FAIL_ON_DIMENSION_MISMATCH === '1';
const QUICK_MODE = process.env.QUICK === '1'; // Reutiliza un solo contexto/página y reduce esperas
const QUICK_WAIT_MS = parseInt(process.env.QUICK_WAIT_MS || '300', 10);
const CI_STRICT = process.env.CI_STRICT === '1'; // Falla si existe cualquier error (launch/context/error)
const DISABLE_DEVICE_SCALE = process.env.DISABLE_DEVICE_SCALE === '1'; // Evita deviceScaleFactor / emulación móvil para tamaños estables
let createdBaselines = 0;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const ALL_SCENARIOS = [
  { name: 'mobile-portrait', viewport: { width: 360, height: 740 }, device: devices['Pixel 7'] },
  { name: 'mobile-landscape', viewport: { width: 740, height: 360 }, device: devices['Pixel 7 landscape'] },
  { name: 'tablet', viewport: { width: 820, height: 1180 }, device: devices['iPad Air'] },
  { name: 'desktop', viewport: { width: 1440, height: 900 } }
];
// Escenarios extendidos opcionales (activar con EXTENDED_SCENARIOS=1)
const EXTENDED_PRESETS = [
  { name: 'phone-small', viewport: { width: 320, height: 568 } }, // iPhone SE
  { name: 'phone-medium', viewport: { width: 390, height: 844 } }, // iPhone 12/13
  { name: 'phone-large', viewport: { width: 412, height: 915 } }, // Pixel 7 Pro aprox
  { name: 'phablet', viewport: { width: 430, height: 932 } },
  { name: 'tablet-landscape-small', viewport: { width: 1024, height: 768 } },
  { name: 'hd-1280', viewport: { width: 1280, height: 720 } },
  { name: 'fhd-1920', viewport: { width: 1920, height: 1080 } },
  { name: 'qhd-2560', viewport: { width: 2560, height: 1440 } }
];
let scenarios = ALL_SCENARIOS;
if (process.env.EXTENDED_SCENARIOS === '1') {
  scenarios = [...scenarios, ...EXTENDED_PRESETS];
}
// EXTRA_VIEWPORTS syntax: WIDTHxHEIGHT@name;WIDTHxHEIGHT@name  (name optional)
if (process.env.EXTRA_VIEWPORTS) {
  const extraDefs = process.env.EXTRA_VIEWPORTS.split(';').map(s=>s.trim()).filter(Boolean);
  for (const def of extraDefs) {
    const m = def.match(/^(\d+)x(\d+)(?:@([a-zA-Z0-9_-]+))?$/);
    if (!m) {
      console.warn(`[WARN] EXTRA_VIEWPORTS definición inválida ignorada: ${def}`);
      continue;
    }
    const w = parseInt(m[1],10); const h = parseInt(m[2],10); const name = m[3] || `${w}x${h}`;
    if (scenarios.some(s=>s.name === name)) {
      console.warn(`[WARN] Escenario duplicado ignorado: ${name}`);
      continue;
    }
    scenarios.push({ name, viewport: { width: w, height: h } });
  }
}
if (process.env.SCENARIOS) {
  const wanted = process.env.SCENARIOS.split(',').map(s=>s.trim()).filter(Boolean);
  const map = new Map(ALL_SCENARIOS.map(s=>[s.name,s]));
  const unknown = wanted.filter(w=>!map.has(w));
  if (unknown.length) console.warn(`[WARN] Escenarios desconocidos ignorados: ${unknown.join(', ')}`);
  const filtered = wanted.map(w=>map.get(w)).filter(Boolean);
  if (filtered.length) scenarios = filtered; else console.warn('[WARN] Ningún escenario válido especificado en SCENARIOS, usando todos.');
}

const requested = (process.env.BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const allowed = { chromium: chromium, firefox: firefox, webkit: webkit };
const browsers = [];
const seen = new Set();
const unknown = [];
for (const r of requested) {
  if (seen.has(r)) continue;
  if (allowed[r]) {
    browsers.push({ name: r, launcher: allowed[r] });
    seen.add(r);
  } else if (['bing','edge','msedge'].includes(r)) {
    // Alias para Microsoft Edge (canal estable) usando Chromium con channel=msedge
    if (!seen.has('bing')) {
      browsers.push({ name: 'bing', launcher: chromium, edgeChannel: 'msedge' });
      seen.add('bing');
    }
  } else {
    unknown.push(r);
  }
}
if (unknown.length) console.warn(`[WARN] Navegadores no soportados ignorados: ${unknown.join(', ')} (permitidos: chromium, firefox, webkit, bing/edge)`);
if (!browsers.length) {
  console.error('No hay navegadores válidos en BROWSERS. Usa: chromium,firefox,webkit,bing');
  process.exit(1);
}

console.log(`[INFO] Ejecutando pruebas visuales con navegadores: ${browsers.map(b=>b.name).join(', ')}`);
console.log(`[INFO] URL de prueba: ${INDEX_URL}`);
if (QUICK_MODE) console.log('[INFO] QUICK mode activo: reutilizando contexto único por navegador y waits mínimos.');
if (DISABLE_DEVICE_SCALE) console.log('[INFO] DISABLE_DEVICE_SCALE=1: se omiten deviceScaleFactor/isMobile/hasTouch para evitar variaciones de dimensiones.');
if (process.env.EXTENDED_SCENARIOS === '1') console.log('[INFO] EXTENDED_SCENARIOS=1: usando escenarios extendidos. Total escenarios:', scenarios.length);
if (process.env.EXTRA_VIEWPORTS) console.log('[INFO] EXTRA_VIEWPORTS añadidos. Total escenarios:', scenarios.length);

function diffImages(baselinePath, currentPath, diffPath) {
  return new Promise((resolve, reject) => {
    const img1 = fs.createReadStream(baselinePath).pipe(new PNG()).on('parsed', done);
    const img2 = fs.createReadStream(currentPath).pipe(new PNG()).on('parsed', done);
    let doneCount = 0;
    function done() {
      doneCount++;
      if (doneCount < 2) return;
      const sameSize = img1.width === img2.width && img1.height === img2.height;
      const width = sameSize ? img1.width : Math.min(img1.width, img2.width);
      const height = sameSize ? img1.height : Math.min(img1.height, img2.height);
      const diff = new PNG({ width, height });
      // Si tamaños distintos recortamos la intersección superior izquierda
      const stride1 = img1.width * 4; // RGBA
      const stride2 = img2.width * 4;
      const buf1 = Buffer.alloc(width * height * 4);
      const buf2 = Buffer.alloc(width * height * 4);
      for (let y = 0; y < height; y++) {
        img1.data.copy(buf1, y * width * 4, y * stride1, y * stride1 + width * 4);
        img2.data.copy(buf2, y * width * 4, y * stride2, y * stride2 + width * 4);
      }
      const mismatches = pixelmatch(buf1, buf2, diff.data, width, height, { threshold: MISMATCH_THRESHOLD });
      const dimensionMismatch = !sameSize;
      const statusObj = { mismatches, diffWritten: false, dimensionMismatch, baselineSize: { w: img1.width, h: img1.height }, currentSize: { w: img2.width, h: img2.height } };
      if (mismatches > 0) {
        diff.pack().pipe(fs.createWriteStream(diffPath)).on('finish', () => { statusObj.diffWritten = true; resolve(statusObj); });
      } else {
        resolve(statusObj);
      }
    }
  });
}

(async () => {
  const results = [];
  for (const b of browsers) {
    let browser;
    try {
      const launchOpts = {};
      if (b.edgeChannel) launchOpts.channel = b.edgeChannel; // usar Edge estable
      browser = await b.launcher.launch(launchOpts);
    } catch (err) {
      console.warn(`[SKIP] No se pudo lanzar ${b.name}: ${err.message}`);
      results.push({ browser: b.name, status: 'launch-error', error: err.message });
      continue;
    }
    try {
      if (QUICK_MODE) {
        // Un solo contexto y página reutilizada cambiando viewport
        const context = await browser.newContext({ viewport: scenarios[0].viewport });
        const page = await context.newPage();
        if (BLOCK_FONTS) {
          await context.route('**/*', route => {
            const url = route.request().url();
            if (/\.(woff2?|ttf|otf)$/i.test(url)) return route.abort();
            route.continue();
          });
        }
        await page.goto(INDEX_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.hero-section h1');
        await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
        for (const sc of scenarios) {
          await page.setViewportSize(sc.viewport);
          if (!QUICK_WAIT_MS) {/* noop */} else await page.waitForTimeout(QUICK_WAIT_MS);
          const shotName = `${b.name}_${sc.name}.png`;
          const shotPath = path.join(OUTPUT_DIR, shotName);
          await page.screenshot({ path: shotPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT });
          const baselinePath = path.join(BASELINE_DIR, shotName);
          if (UPDATE || !fs.existsSync(baselinePath)) {
            fs.copyFileSync(shotPath, baselinePath);
            const status = UPDATE ? 'baseline-updated' : 'baseline-created';
            if (!UPDATE) createdBaselines++;
            results.push({ browser: b.name, scenario: sc.name, shot: shotName, status });
            console.log(`[BASELINE ${status}] ${shotName}`);
          } else {
            const diffPath = path.join(OUTPUT_DIR, shotName.replace('.png', '.diff.png'));
            try {
              const { mismatches, diffWritten, dimensionMismatch, baselineSize, currentSize } = await diffImages(baselinePath, shotPath, diffPath);
              let webpDiffPath;
              if (diffWritten) {
                webpDiffPath = diffPath.replace('.png','.webp');
                try {
                  await sharp(diffPath).webp({quality:80}).toFile(webpDiffPath);
                  // Limpieza del PNG original si la conversión tuvo éxito
                  try { fs.unlinkSync(diffPath); } catch(e) { /* ignore unlink errors */ }
                } catch(e){ console.warn('[WARN] WebP diff fail', e.message); }
              }
              let status = mismatches === 0 ? 'ok' : 'diff';
              if (dimensionMismatch) status = status === 'ok' ? 'ok-dimension-crop' : 'diff-dimension-crop';
              const mismatchLog = mismatches ? ` mismatches=${mismatches}` : '';
              const diffLog = diffWritten ? ' (diff saved)' : '';
              const prefix = status.startsWith('diff') ? '[COMPARE diff]' : '[COMPARE ok]';
              console.log(`${prefix} status=${status} ${shotName}${mismatchLog}${diffLog}`);
              results.push({ browser: b.name, scenario: sc.name, shot: shotName, status, mismatches, dimensionMismatch, baselineSize, currentSize, fullPageUsed: false, diffWebp: webpDiffPath? path.basename(webpDiffPath): undefined });
            } catch (err) {
              results.push({ browser: b.name, scenario: sc.name, shot: shotName, status: 'error', error: err.message });
              console.error(`[ERROR] ${shotName}: ${err.message}`);
            }
          }
        }
        await context.close();
      } else {
        for (const sc of scenarios) {
          // Construcción de contexto (modo detallado original optimizado para fidelidad)
          const contextOptions = {
            viewport: sc.viewport,
            userAgent: sc.device?.userAgent
          };
          const autoDisable = sc.name.startsWith('mobile-');
          const disableThisScenario = DISABLE_DEVICE_SCALE || autoDisable;
          if (!disableThisScenario) {
            if (b.name !== 'firefox') { // Firefox parcialmente soporta; mantenemos lógica previa para evitar warning
              if (sc.device?.deviceScaleFactor) contextOptions.deviceScaleFactor = sc.device.deviceScaleFactor;
              if (sc.device?.isMobile) contextOptions.isMobile = sc.device.isMobile;
              if (sc.device?.hasTouch) contextOptions.hasTouch = sc.device.hasTouch;
            }
          } else if (autoDisable && !DISABLE_DEVICE_SCALE) {
            console.log(`[INFO] Auto desactivado device scale/emulación para escenario móvil ${sc.name}`);
          }
          let context;
          try {
            context = await browser.newContext(contextOptions);
          } catch (ctxErr) {
            console.warn(`[SKIP] Falló creación de contexto ${b.name}/${sc.name}: ${ctxErr.message}`);
            results.push({ browser: b.name, scenario: sc.name, status: 'context-error', error: ctxErr.message });
            continue;
          }
          const page = await context.newPage();
          if (BLOCK_FONTS) {
            await context.route('**/*', route => {
              const url = route.request().url();
              if (/\.(woff2?|ttf|otf)$/i.test(url)) return route.abort();
              route.continue();
            });
          }
          await page.goto(INDEX_URL);
          await page.waitForSelector('.hero-section h1');
          await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
          const shotName = `${b.name}_${sc.name}.png`;
          const shotPath = path.join(OUTPUT_DIR, shotName);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForLoadState('networkidle').catch(() => {});
          let fullPage;
          if (FORCE_VIEWPORT) {
            fullPage = false;
          } else if (USER_FULL_PAGE === '1') fullPage = true; else if (USER_FULL_PAGE === '0') fullPage = false; else {
            const baselinePathCandidate = path.join(BASELINE_DIR, `${b.name}_${sc.name}.png`);
            if (fs.existsSync(baselinePathCandidate)) {
              try {
                const meta = PNG.sync.read(fs.readFileSync(baselinePathCandidate));
                fullPage = meta.height > sc.viewport.height;
              } catch { fullPage = false; }
            } else {
              fullPage = false;
            }
          }
          await page.screenshot({ path: shotPath, fullPage, timeout: SCREENSHOT_TIMEOUT });
          const baselinePath = path.join(BASELINE_DIR, shotName);
          if (UPDATE || !fs.existsSync(baselinePath)) {
            fs.copyFileSync(shotPath, baselinePath);
            const status = UPDATE ? 'baseline-updated' : 'baseline-created';
            if (!UPDATE) createdBaselines++;
            results.push({ browser: b.name, scenario: sc.name, shot: shotName, status });
            console.log(`[BASELINE ${status}] ${shotName}`);
          } else {
            const diffPath = path.join(OUTPUT_DIR, shotName.replace('.png', '.diff.png'));
            try {
              const { mismatches, diffWritten, dimensionMismatch, baselineSize, currentSize } = await diffImages(baselinePath, shotPath, diffPath);
              let webpDiffPath;
              if (diffWritten) {
                webpDiffPath = diffPath.replace('.png','.webp');
                try {
                  await sharp(diffPath).webp({quality:80}).toFile(webpDiffPath);
                  try { fs.unlinkSync(diffPath); } catch(e) { /* ignore unlink errors */ }
                } catch(e){ console.warn('[WARN] WebP diff fail', e.message); }
              }
              let status = mismatches === 0 ? 'ok' : 'diff';
              if (dimensionMismatch) status = status === 'ok' ? 'ok-dimension-crop' : 'diff-dimension-crop';
              const metaLog = dimensionMismatch ? ` sizeBaseline=${baselineSize.w}x${baselineSize.h} sizeCurrent=${currentSize.w}x${currentSize.h}` : '';
              const mismatchLog = mismatches ? ` mismatches=${mismatches}` : '';
              const diffLog = diffWritten ? ' (diff saved)' : '';
              const prefix = status.startsWith('diff') ? '[COMPARE diff]' : (status.includes('dimension') ? '[COMPARE warn]' : '[COMPARE ok]');
              console.log(`${prefix} status=${status} ${shotName}${mismatchLog}${metaLog}${diffLog}`);
              results.push({ browser: b.name, scenario: sc.name, shot: shotName, status, mismatches, dimensionMismatch, baselineSize, currentSize, fullPageUsed: !!fullPage, diffWebp: webpDiffPath? path.basename(webpDiffPath): undefined });
            } catch (err) {
              results.push({ browser: b.name, scenario: sc.name, shot: shotName, status: 'error', error: err.message });
              console.error(`[ERROR] ${shotName}: ${err.message}`);
            }
          }
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ updated: UPDATE, threshold: MISMATCH_THRESHOLD, screenshotTimeout: SCREENSHOT_TIMEOUT, blockFonts: BLOCK_FONTS, results, createdBaselines }, null, 2));
  const errorItems = results.filter(r=> r.status && r.status.includes('error'));
  const ciSummary = {
    updated: UPDATE,
    createdBaselines,
    diffCount: results.filter(r=>r.status.startsWith('diff')).length,
    okCount: results.filter(r=>r.status.startsWith('ok')).length,
    errorCount: errorItems.length,
    errorShots: errorItems.map(e=>({browser:e.browser,scenario:e.scenario,status:e.status,error:e.error})),
    dimensionIssues: results.filter(r=>r.dimensionMismatch).length,
    diffs: results.filter(r=>r.status.startsWith('diff')).map(r=>r.shot)
  };
  fs.writeFileSync(path.join(OUTPUT_DIR,'summary-ci.json'), JSON.stringify(ciSummary, null, 2));
  // Reporte HTML sencillo
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Reporte Visual</title>
  <style>body{font-family:Segoe UI,Arial,sans-serif;background:#111;color:#eee;padding:1rem}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #333;padding:6px;vertical-align:top}th{background:#222}tr:nth-child(even){background:#181818}.ok{color:#6cc070}.diff{color:#ff6b6b}.warn{color:#ffb347}.thumbs{display:flex;gap:8px;flex-wrap:wrap}figure{margin:0}figure img{max-width:240px;height:auto;border:1px solid #333;background:#000}</style></head><body>
  <h1>Reporte Visual</h1><p>updated=${UPDATE} threshold=${MISMATCH_THRESHOLD} timeout=${SCREENSHOT_TIMEOUT}ms blockFonts=${BLOCK_FONTS} createdBaselines=${createdBaselines}</p>
  <table><thead><tr><th>Browser</th><th>Scenario</th><th>Status</th><th>Mismatches</th><th>Dimensiones</th><th>Capturas</th></tr></thead><tbody>
  ${results.map(r=>{
    const cls = r.status.startsWith('diff')? 'diff': (r.status.startsWith('ok')? 'ok':'warn');
    if (!r.shot) {
      const msg = r.error ? ('Error: '+r.error) : 'Sin captura';
      return `<tr class="${cls}"><td>${r.browser||''}</td><td>${r.scenario||''}</td><td>${r.status}</td><td colspan="3">${msg}</td></tr>`;
    }
  const diffWebp = r.diffWebp ? r.diffWebp : null;
  return `<tr class="${cls}"><td>${r.browser||''}</td><td>${r.scenario||''}</td><td>${r.status}</td><td>${r.mismatches ?? ''}</td><td>${r.baselineSize? r.baselineSize.w+'x'+r.baselineSize.h+' -> '+(r.currentSize?.w+'x'+r.currentSize?.h): ''}</td><td class="thumbs"><figure><figcaption>Baseline</figcaption><img src="../baselines/${r.shot}"></figure><figure><figcaption>Actual</figcaption><img src="./${r.shot}"></figure>${diffWebp? `<figure><figcaption>Diff</figcaption><img src="./${diffWebp}"></figure>`:''}</td></tr>`;
  }).join('\n')}
  </tbody></table></body></html>`;
  fs.writeFileSync(path.join(OUTPUT_DIR,'report.html'), html);
  const diffs = results.filter(r => r.status && r.status.startsWith('diff'));
  const dimensionIssues = results.filter(r => r.dimensionMismatch);
  const anyErrors = errorItems.length > 0;
  if (IS_CI && createdBaselines > 0) {
    console.error(`\n[CI] Se crearon ${createdBaselines} baseline(s) nuevas. Debes generarlas y comprometerlas antes de que CI pase. Ejecuta: npm run test:visual:update y haz commit de tests/visual/baselines/*.png`);
    process.exitCode = 2;
  } else if (CI_STRICT && anyErrors) {
    console.error(`\n[CI_STRICT] Errores detectados (${errorItems.length}):`, errorItems.map(e=>`${e.status}:${e.browser||''}/${e.scenario||''}`));
    process.exitCode = 1;
  } else if (diffs.length) {
    console.error('\nDiferencias visuales detectadas:', diffs.map(d => d.shot));
    process.exitCode = 1;
  } else if (FAIL_ON_DIMENSION_MISMATCH && dimensionIssues.length) {
    console.error('\nDiferencias de dimensiones detectadas (FAIL_ON_DIMENSION_MISMATCH=1):', dimensionIssues.map(d => d.shot));
    process.exitCode = 1;
  } else {
    console.log('\nPruebas visuales completadas sin diferencias críticas.');
    if (dimensionIssues.length) {
      console.warn(`Advertencia: ${dimensionIssues.length} captura(s) con diferencia de dimensiones (usa FORCE_VIEWPORT=1 para normalizar o regen baselines).`);
    }
  }
})();

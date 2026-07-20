#!/usr/bin/env node
/**
 * Export the full Docsify guide as a PDF,
 * rendered with the same theme/plugins as `docsify serve ./docs`.
 *
 * Usage: node scripts/export-pdf.mjs [outputPath]
 * Example: node scripts/export-pdf.mjs
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const DEFAULT_OUT_PATH = path.join(
  ROOT,
  'docs',
  '_exports',
  'FBCMJ-ESL-Onboarding.pdf'
);
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/local/bin/google-chrome',
].filter(Boolean);

function usage(message) {
  if (message) {
    console.error(message);
  }
  console.error('Usage: node scripts/export-pdf.mjs [outputPath]');
  console.error('Example: node scripts/export-pdf.mjs');
  process.exit(1);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromePath() {
  for (const candidate of CHROME_CANDIDATES) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'Google Chrome not found. Install Chrome or set CHROME_PATH to the binary.'
  );
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

function startDocsify(port) {
  const child = spawn(
    'docsify',
    ['serve', DOCS, '-p', String(port)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        CHOKIDAR_USEPOLLING: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let output = '';
  const onData = (chunk) => {
    output += chunk.toString();
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  let settled = false;
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(
        new Error(
          `Timed out waiting for docsify on port ${port}.\n${output.trim()}`
        )
      );
    }, 20000);

    const check = (chunk) => {
      const text = chunk.toString();
      if (settled) {
        return;
      }
      if (/Listening at/i.test(text) || /Serving /i.test(text)) {
        settled = true;
        clearTimeout(timeout);
        // Brief pause; polling mode avoids the EMFILE watcher crash.
        setTimeout(resolve, 500);
      }
    };

    child.stdout.on('data', check);
    child.stderr.on('data', check);
    child.on('error', (err) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(err);
    });
    child.on('exit', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          `docsify exited early (code ${code}).\n${output.trim()}`
        )
      );
    });
  });

  return { child, ready };
}

async function waitForDocsifyContent(page) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector('.markdown-section');
      if (!root) {
        return false;
      }
      return root.textContent.trim().length > 0;
    },
    { timeout: 30000 }
  );
}

async function prepareFullDocumentForPdf(page) {
  await page.evaluate(() => {
    document.body.classList.add('full-pdf-export');
    const style = document.createElement('style');
    style.textContent = `
      .sidebar, .sidebar-toggle, .github-corner, nav.app-nav { display: none !important; }
      main { margin: 0 !important; }
      .content { left: 0 !important; padding-top: 0 !important; }
      .markdown-section { max-width: 65em; margin: 0 auto; padding: 1.5rem 2rem 2rem !important; }
      .markdown-section h1 { margin-top: 0 !important; }
    `;
    document.head.appendChild(style);
  });
}

async function main() {
  if (process.argv[2] === '--help' || process.argv[2] === '-h') {
    usage();
  }

  const outPath = path.resolve(process.argv[2] || DEFAULT_OUT_PATH);
  await mkdir(path.dirname(outPath), { recursive: true });

  const chromePath = await resolveChromePath();
  const port = await getFreePort();
  const { child: docsify, ready } = startDocsify(port);

  let browser;
  try {
    await ready;
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1600, deviceScaleFactor: 2 });

    const base = `http://127.0.0.1:${port}`;
    // Gate is disabled; navigate straight to the guide content.
    await page.goto(`${base}/#/README`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await waitForDocsifyContent(page);
    await prepareFullDocumentForPdf(page);
    await page.emulateMediaType('screen');

    // Let images / webfonts settle after layout tweaks.
    await page.evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete ||
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
        )
      );
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    });

    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: false,
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.45in',
        bottom: '0.5in',
        left: '0.45in',
      },
    });

    console.log('Exported FBCMJ ESL Onboarding Guide');
    console.log(outPath);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    docsify.kill('SIGTERM');
    // Ensure docsify doesn't linger if it ignores SIGTERM briefly.
    setTimeout(() => {
      try {
        docsify.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, 1000).unref?.();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

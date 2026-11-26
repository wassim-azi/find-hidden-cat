import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`);
}

function killServer(proc) {
  if (!proc || proc.killed) return;
  try {
    if (proc.pid) {
      process.kill(-proc.pid, 'SIGTERM');
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    try {
      proc.kill('SIGKILL');
    } catch {
      // ignore
    }
  }
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLogs = '';
  server.stdout.on('data', (d) => {
    serverLogs += d.toString();
  });
  server.stderr.on('data', (d) => {
    serverLogs += d.toString();
  });

  let browser = null;
  let passed = 0;
  let total = 0;

  const check = (name, condition, detail = '') => {
    total += 1;
    if (condition) {
      passed += 1;
      console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
    } else {
      console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    }
  };

  try {
    await waitForServer(`${BASE}/`, 30_000);

    const specsDir = path.join(__dirname, 'specs');
    const files = (await readdir(specsDir))
      .filter((f) => f.endsWith('.spec.mjs'))
      .sort();

    browser = await chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
    });

    for (const file of files) {
      console.log(`\n=== ${file} ===`);
      const mod = await import(pathToFileURL(path.join(specsDir, file)).href);
      try {
        await mod.default(browser, { check, BASE });
      } catch (err) {
        check(`${file} (uncaught error)`, false, err instanceof Error ? err.message : String(err));
      }
    }
  } catch (err) {
    console.error('E2E runner error:', err);
    if (serverLogs) console.error('Preview server output:\n', serverLogs);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    killServer(server);
  }

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(total > 0 && passed === total ? 0 : 1);
}

main();

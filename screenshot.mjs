import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { executablePath } from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const targetUrl = args[0] || 'http://localhost:3000';
const label    = args[1] || 'screenshot';
const fullPage = args.includes('--full');
const width    = parseInt(args.find(a => a.startsWith('--width='))?.split('=')[1]  || '1440');
const height   = parseInt(args.find(a => a.startsWith('--height='))?.split('=')[1] || '900');

const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: await executablePath(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise(r => setTimeout(r, 800));

const n = fs.readdirSync(outDir).filter(f => f.endsWith('.png')).length + 1;
const outPath = path.join(outDir, `screenshot-${n}-${label}.png`);
await page.screenshot({ path: outPath, fullPage });
console.log(`Saved: ${outPath}`);

await browser.close();

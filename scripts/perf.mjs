// Rough page-load timings against a running app (use after npm run db:seed-scale).
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/perf.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();

await page.goto(BASE + "/login");
await page.fill('input[name="email"]', "admin@ygg.com.au");
await page.fill('input[name="password"]', "yellowgate");
await page.click('main button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 30000 });

const targets = [
  ["Dashboard", "/"],
  ["Accounts (1609 rows)", "/accounts"],
  ["Customers (793 rows)", "/customers"],
  ["Assets (1859 rows)", "/assets"],
  ["Applications (1602 rows)", "/applications"],
  ["Collections (~44 rows)", "/collections"],
  ["Global search 'Komatsu'", "/search?q=Komatsu"],
  ["Global search rego", "/search?q=XT29GH"],
  ["Audit log", "/audit"],
];

for (const [label, path] of targets) {
  const times = [];
  let bytes = 0;
  for (let run = 0; run < 3; run++) {
    const t0 = Date.now();
    const resp = await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 });
    times.push(Date.now() - t0);
    if (run === 2) bytes = (await resp.body()).length;
  }
  console.log(
    `${label.padEnd(28)} cold ${String(times[0]).padStart(6)}ms  warm ${String(Math.min(times[1], times[2])).padStart(6)}ms  html ${(bytes / 1024).toFixed(0).padStart(5)} KB`,
  );
}

// Interactive: filter + sort on the biggest table.
await page.goto(BASE + "/accounts", { waitUntil: "load" });
let t0 = Date.now();
await page.fill('input[type="search"]', "YGG529");
await page.waitForFunction(() => document.body.innerText.includes("of 16"), null, { timeout: 30000 });
console.log(`Accounts filter typing → results  ${Date.now() - t0}ms`);
t0 = Date.now();
await page.click('th:has-text("Balance")');
await page.waitForTimeout(50);
console.log(`Accounts sort by balance          ${Date.now() - t0}ms`);

// A big single-account ledger and a busy customer page.
await page.goto(BASE + "/collections", { waitUntil: "load" });
const firstRow = page.locator("tbody tr").first();
const contract = (await firstRow.locator("td").first().textContent()).trim();
t0 = Date.now();
await firstRow.click();
await page.waitForURL(/\/collections\/\d+$/);
console.log(`Collections board (${contract})   ${Date.now() - t0}ms`);

const accountsResp = await page.request.get(BASE + "/accounts");
console.log(`Accounts full HTML via request: ${((await accountsResp.body()).length / 1024).toFixed(0)} KB`);

await browser.close();

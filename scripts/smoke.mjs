// End-to-end smoke test against a running app with freshly seeded data.
//
//   npm run db:reset && npm run build && npm start   (in one terminal)
//   node scripts/smoke.mjs                           (in another)
//
// Uses Playwright; set CHROMIUM_PATH if Playwright's own browser download
// isn't available (e.g. CHROMIUM_PATH=/opt/pw-browsers/chromium).
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();

// Unauthenticated hit redirects to login
await page.goto(BASE + "/customers");
check("auth redirect", page.url().includes("/login"), page.url());

// Login
await page.fill('input[name="email"]', "admin@ygg.com.au");
await page.fill('input[name="password"]', "yellowgate");
await page.click('main button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 15000 });
check("login → dashboard", true);
const dash = await page.textContent("body");
check("dashboard stats", dash.includes("Active accounts") && dash.includes("In arrears"));

// Customers list
await page.goto(BASE + "/customers");
const cust = await page.textContent("body");
check("customers list", cust.includes("Harbour City Earthmoving") && cust.includes("Export CSV"));

// Customer detail
await page.click("text=Harbour City Earthmoving");
await page.waitForURL(/\/customers\/\d+$/);
const detail = await page.textContent("body");
check(
  "customer detail",
  detail.includes("Director Guarantor") && detail.includes("Insurance") && detail.includes("Audit trail"),
);

// Payment history drilldown
await page.click("text=Payment history");
await page.waitForURL(/\/payments$/);
check("payment history", (await page.textContent("body")).includes("payments received"));

// Loans + read-only ledger
await page.goto(BASE + "/accounts");
const loansTxt = await page.textContent("body");
check("accounts list", loansTxt.includes("YGG515") && loansTxt.includes("Arrears"));
await page.click("text=YGG51591");
await page.waitForURL(/\/accounts\/\d+$/);
const ledger = await page.textContent("body");
check("loan ledger", ledger.includes("Ledger (read-only)") && ledger.includes("RENT") && ledger.includes("Balance"));

// Master asset register
await page.goto(BASE + "/assets");
const assetsTxt = await page.textContent("body");
check("asset register", assetsTxt.includes("Caterpillar") && assetsTxt.includes("Industry"));
await page.selectOption('select:has(option:has-text("Industry: all"))', "Mining");
const filtered = await page.textContent("tbody");
check("industry filter", filtered.includes("Sandvik") && !filtered.includes("Caterpillar"));

// Global search: rego and contract number
await page.goto(BASE + "/search?q=XT29GH");
check("global search rego", (await page.textContent("body")).includes("Kenworth"));
await page.goto(BASE + "/search?q=YGG51594");
check("global search contract", (await page.textContent("body")).includes("Loan"));

// External parties
await page.goto(BASE + "/external-parties");
const partiesTxt = await page.textContent("body");
check("external parties", partiesTxt.includes("COG Aggregation") && partiesTxt.includes("Accredited"));

// Mutation: create a customer (valid ABN) → redirect to detail with audit entry
await page.goto(BASE + "/customers/new");
await page.fill('input[name="name"]', "Smoke Test Transport Pty Ltd");
await page.fill('input[name="abn"]', "51824753556");
await page.fill('input[name="suburb"]', "Penrith");
await page.click('main button[type="submit"]');
await page.waitForURL(/\/customers\/\d+$/, { timeout: 15000 });
const created = await page.textContent("body");
check("create customer", created.includes("Smoke Test Transport"), page.url());
check("audit on create", created.includes("Created") && created.includes("Cooper McRae"));

// Invalid ABN rejected by checksum validation
await page.goto(BASE + "/customers/new");
await page.fill('input[name="name"]', "Bad ABN Co");
await page.fill('input[name="abn"]', "12345678901");
await page.click('main button[type="submit"]');
await page.waitForSelector("text=checksum", { timeout: 10000 });
check("ABN validation", true);

// Applications list + detail
await page.goto(BASE + "/applications");
const appsList = await page.textContent("body");
check("applications list", appsList.includes("APP-2026-") && appsList.includes("In Progress"));
await page.click("text=APP-2026-0010");
await page.waitForURL(/\/applications\/\d+$/);
const appDetail = await page.textContent("body");
check(
  "application detail",
  appDetail.includes("Originations checklist") && appDetail.includes("Deal snapshot"),
);

// Stubbed integration run: Info Agent lookup marks its checklist item done
await page.click("text=Run Info Agent lookup (stub)");
await page.waitForSelector("text=Company status: Registered", { timeout: 15000 });
check("info agent stub run", true);

// Document generation downloads a .docx and records it
const appUrl = page.url();
const docResponse = await page.request.get(appUrl + "/documents/credit-approval");
check(
  "generate CA docx",
  docResponse.ok() &&
    (docResponse.headers()["content-type"] ?? "").includes("wordprocessingml"),
  String(docResponse.status()),
);
await page.reload();
check("CA recorded on application", (await page.textContent("body")).includes("CA-APP-2026-"));

// Convert the approved application into a loan account
await page.goto(BASE + "/applications");
await page.click("text=APP-2026-0011");
await page.waitForURL(/\/applications\/\d+$/);
await page.click('button:has-text("Open loan account")');
await page.waitForURL(/\/accounts\/\d+$/, { timeout: 20000 });
const newLoan = await page.textContent("body");
check("convert to loan", newLoan.includes("YGG51600") && newLoan.includes("Assets on this account"));
check("PMSI registered on convert", newLoan.includes("Atlas Copco"));

// RBAC: operations user doesn't get the Staff admin link
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(BASE + "/login");
await p2.fill('input[name="email"]', "operations@ygg.com.au");
await p2.fill('input[name="password"]', "yellowgate");
await p2.click('main button[type="submit"]');
await p2.waitForURL(BASE + "/");
check("RBAC nav (ops sees no Staff link)", !(await p2.textContent("aside")).includes("Staff"));

// Audit log page as admin
await page.goto(BASE + "/audit");
const audit = await page.textContent("body");
check("audit log page", audit.includes("Audit log") && audit.includes("customer"));

// Logout
await page.click("text=Sign out");
await page.waitForURL(/\/login/);
check("logout", true);

await browser.close();
console.log(results.join("\n"));

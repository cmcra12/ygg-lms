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
check(
  "dashboard stats",
  dash.includes("Total accounts") && dash.includes("Accounts breakdown") && dash.includes("In arrears"),
);
// Insurance notify → HubSpot (stub) marks the row notified
await page.click('button:has-text("Notify")');
await page.waitForSelector("text=Sent ✓", { timeout: 15000 });
check("insurance notify (hubspot stub)", true);

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
  appDetail.includes("Deal snapshot") && appDetail.includes("Business information") && appDetail.includes("Workflows"),
);

// Applicants tab shows the seeded applicant with A&L statement
const appUrlBase = page.url();
await page.goto(appUrlBase + "?tab=applicants");
const applicantsTab = await page.textContent("body");
check(
  "applicants tab",
  applicantsTab.includes("Applicant 1") && applicantsTab.includes("Net worth"),
);

// Stubbed integration run: Info Agent lookup marks its checklist item done
await page.goto(appUrlBase + "?tab=checklist");
await page.click("text=Run Info Agent lookup (stub)");
await page.waitForSelector("text=Company status: Registered", { timeout: 15000 });
check("info agent stub run", true);

// Document generation downloads a .docx and records it
const docResponse = await page.request.get(appUrlBase + "/documents/credit-approval");
check(
  "generate CA docx",
  docResponse.ok() &&
    (docResponse.headers()["content-type"] ?? "").includes("wordprocessingml"),
  String(docResponse.status()),
);
await page.goto(appUrlBase + "?tab=documents");
check("CA recorded on application", (await page.textContent("body")).includes("CA-APP-2026-"));

// Workflows tab: origination workflow with actionable current step
await page.goto(appUrlBase + "?tab=workflows");
const wfTab = await page.textContent("body");
check("workflows tab", wfTab.includes("Origination") && wfTab.includes("Allocated to"));
await page.click('button[title="Action this step"]');
await page.waitForTimeout(1500);
const wfAfter = await page.textContent("body");
check("workflow step actioned", wfAfter.includes("3 of 17 items"));

// Collections: arrears account listed with its workflow
await page.goto(BASE + "/collections");
const collections = await page.textContent("body");
check("collections list", collections.includes("YGG51594") && collections.includes("Collections workflow"));
await page.click("text=YGG51594");
await page.waitForURL(/\/collections\/\d+$/);
const collDetail = await page.textContent("body");
check(
  "collections workflow board",
  collDetail.includes("Arrears identified") && collDetail.includes("Open Payout workflow"),
);
check(
  "arrears breakdown",
  collDetail.includes("Days since first missed invoice") && collDetail.includes("Missed invoices"),
);
// Comments tab: add a comment and see it saved
await page.click('a:has-text("Comments")');
await page.waitForSelector("text=No comments yet");
const commentBox = page.locator("textarea");
await commentBox.click();
await commentBox.pressSequentially("Smoke test collections note.");
await page.click('main button:has-text("Add comment")');
await page.waitForSelector("text=Smoke test collections note.", { timeout: 15000 });
check("collections comments", true);

// Convert the approved application into a loan account
await page.goto(BASE + "/applications");
await page.click("text=APP-2026-0011");
await page.waitForURL(/\/applications\/\d+$/);
await page.click('button:has-text("Open loan account")');
await page.waitForURL(/\/accounts\/\d+$/, { timeout: 20000 });
const newLoan = await page.textContent("body");
check("convert to loan", newLoan.includes("YGG51600") && newLoan.includes("Assets on this account"));
check("PMSI registered on convert", newLoan.includes("Atlas Copco"));

// Searches: run a credit search (company mode) saved to a customer
await page.goto(BASE + "/searches/new?type=equifax_credit");
await page.selectOption('select[name="customerId"]', { label: "Redgum Haulage Pty Ltd" });
await page.fill('input[name="companyName"]', "Redgum Haulage Pty Ltd");
await page.click('main button[type="submit"]');
await page.waitForURL(/\/customers\/\d+$/, { timeout: 15000 });
const custAfterSearch = await page.textContent("body");
check("search saved to customer", custAfterSearch.includes("Search history") && custAfterSearch.includes("Score 720"));
// Land title search: tabbed methods (name / title / address / lot plan / document)
await page.goto(BASE + "/searches/new?type=equifax_title&method=lot_plan");
await page.fill('input[name="lot"]', "12");
await page.fill('input[name="plan"]', "RP600123");
await page.click('main button[type="submit"]');
await page.waitForURL(/\/searches$/, { timeout: 15000 });
const titleHistory = await page.textContent("body");
check("land title lot/plan search", titleHistory.includes("Lot 12 Plan RP600123"));
await page.goto(BASE + "/searches");
const searchHistory = await page.textContent("body");
check("search history page", searchHistory.includes("Credit search") && searchHistory.includes("Redgum Haulage"));

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

// Seed realistic fake Australian data so every screen is demoable.
// Run with: npm run db:seed (after db:migrate). Idempotence: refuses to run
// on a non-empty database — use npm run db:reset to start over.

import { db, closeDb } from "./index";
import * as t from "./schema";
import { auditedInsert, type Actor } from "./mutate";
import { hashPassword } from "../lib/password";
import { isValidAbn, isValidAcn } from "../lib/abn";
import { DEFAULT_CHECKLIST } from "../lib/checklist";
import { WORKFLOW_TEMPLATES } from "../lib/workflows";

const SEED_ACTOR: Actor = { id: null, name: "System (seed)" };
const now = () => new Date().toISOString();

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/** Find the first valid ABN at or after a starting 11-digit number. */
function makeAbn(start: number): string {
  for (let n = start; ; n++) {
    const candidate = String(n).padStart(11, "0");
    if (isValidAbn(candidate)) return candidate;
  }
}

function makeAcn(start: number): string {
  for (let n = start; ; n++) {
    const candidate = String(n).padStart(9, "0");
    if (isValidAcn(candidate)) return candidate;
  }
}

async function main() {
const existing = await db.select().from(t.users).limit(1);
if (existing.length > 0) {
  console.log("Database already seeded — run `npm run db:reset` to reseed from scratch.");
  return;
}

// --- Staff -----------------------------------------------------------------

function insert<T extends { id: number }>(
  table: Parameters<typeof auditedInsert>[1],
  entityType: string,
  values: Record<string, unknown>,
): Promise<T> {
  return auditedInsert<T>(SEED_ACTOR, table, entityType, values);
}

const staffSeeds = [
  { name: "Cooper McRae", email: "admin@ygg.com.au", role: "admin" as const },
  { name: "Priya Sharma", email: "credit@ygg.com.au", role: "credit" as const },
  { name: "Liam O'Connell", email: "operations@ygg.com.au", role: "operations" as const },
];
const staff: Array<{ id: number }> = [];
for (const u of staffSeeds) {
  staff.push(
    await insert<{ id: number }>(t.users, "user", {
      ...u,
      passwordHash: hashPassword("yellowgate"),
      active: true,
      createdAt: now(),
    }),
  );
}
const [, credit, ops] = staff;

// --- Customers, contacts, insurance -----------------------------------------

type CustomerSeed = {
  name: string;
  suburb: string;
  state: string;
  postcode: string;
  contacts: Array<{ name: string; kind: "key" | "authorised" | "director_guarantor"; mobile: string; email: string }>;
};

const customerSeeds: CustomerSeed[] = [
  {
    name: "Harbour City Earthmoving Pty Ltd",
    suburb: "Botany",
    state: "NSW",
    postcode: "2019",
    contacts: [
      { name: "Tony Rossi", kind: "director_guarantor", mobile: "0412 338 291", email: "tony@hcearth.com.au" },
      { name: "Melissa Chan", kind: "key", mobile: "0433 902 114", email: "accounts@hcearth.com.au" },
    ],
  },
  {
    name: "Redgum Haulage Pty Ltd",
    suburb: "Dubbo",
    state: "NSW",
    postcode: "2830",
    contacts: [
      { name: "Bruce Kelly", kind: "director_guarantor", mobile: "0428 776 340", email: "bruce@redgumhaulage.com.au" },
      { name: "Janine Kelly", kind: "authorised", mobile: "0428 776 341", email: "janine@redgumhaulage.com.au" },
    ],
  },
  {
    name: "Bayside Scaffolding Group Pty Ltd",
    suburb: "Cheltenham",
    state: "VIC",
    postcode: "3192",
    contacts: [
      { name: "Stavros Dimitriou", kind: "director_guarantor", mobile: "0401 220 876", email: "stav@baysidescaff.com.au" },
    ],
  },
  {
    name: "Sunshine Coast Crane Hire Pty Ltd",
    suburb: "Kunda Park",
    state: "QLD",
    postcode: "4556",
    contacts: [
      { name: "Dale Whitford", kind: "director_guarantor", mobile: "0439 118 502", email: "dale@sccranehire.com.au" },
      { name: "Erin Whitford", kind: "key", mobile: "0439 118 503", email: "admin@sccranehire.com.au" },
    ],
  },
  {
    name: "Ironbark Civil Contracting Pty Ltd",
    suburb: "Toowoomba",
    state: "QLD",
    postcode: "4350",
    contacts: [
      { name: "Marcus Beattie", kind: "director_guarantor", mobile: "0417 664 209", email: "marcus@ironbarkcivil.com.au" },
    ],
  },
  {
    name: "Westgate Refrigerated Transport Pty Ltd",
    suburb: "Laverton North",
    state: "VIC",
    postcode: "3026",
    contacts: [
      { name: "Huong Nguyen", kind: "director_guarantor", mobile: "0421 559 083", email: "huong@westgatert.com.au" },
      { name: "Peter Lawson", kind: "authorised", mobile: "0421 559 084", email: "ops@westgatert.com.au" },
    ],
  },
  {
    name: "Coastal Plumbing Solutions Pty Ltd",
    suburb: "Tweed Heads",
    state: "NSW",
    postcode: "2485",
    contacts: [
      { name: "Shane Murdoch", kind: "director_guarantor", mobile: "0455 202 917", email: "shane@coastalplumbing.net.au" },
    ],
  },
  {
    name: "Kalgoorlie Drilling Services Pty Ltd",
    suburb: "Kalgoorlie",
    state: "WA",
    postcode: "6430",
    contacts: [
      { name: "Rhys Talbot", kind: "director_guarantor", mobile: "0409 887 664", email: "rhys@kaldrilling.com.au" },
      { name: "Wendy Marsh", kind: "key", mobile: "0409 887 665", email: "accounts@kaldrilling.com.au" },
    ],
  },
  {
    name: "Adelaide Hills Arborists Pty Ltd",
    suburb: "Stirling",
    state: "SA",
    postcode: "5152",
    contacts: [
      { name: "Callum Fraser", kind: "director_guarantor", mobile: "0447 310 552", email: "callum@ahillsarborists.com.au" },
    ],
  },
  {
    name: "Derwent Valley Logging Pty Ltd",
    suburb: "New Norfolk",
    state: "TAS",
    postcode: "7140",
    contacts: [
      { name: "Angela Burke", kind: "director_guarantor", mobile: "0418 445 730", email: "angela@dvlogging.com.au" },
    ],
  },
];

const customers: Array<{ id: number; name: string }> = [];
for (const [i, c] of customerSeeds.entries()) {
  customers.push(
    await insert<{ id: number; name: string }>(t.customers, "customer", {
    code: `C${1001 + i}`,
    name: c.name,
    type: "company",
    abn: makeAbn(51824753000 + i * 7919),
    acn: makeAcn(120354600 + i * 991),
    email: c.contacts[0].email,
    phone: c.contacts[0].mobile,
    addressLine1: `${12 + i * 7} ${["Foundry Road", "Enterprise Drive", "Industrial Avenue", "Depot Street", "Quarry Lane"][i % 5]}`,
    suburb: c.suburb,
    state: c.state,
    postcode: c.postcode,
    status: "active",
      createdAt: now(),
      updatedAt: now(),
    }),
  );
}

for (const [i, c] of customerSeeds.entries()) {
  for (const contact of c.contacts) {
    await insert(t.customerContacts, "customer_contact", {
      customerId: customers[i].id,
      kind: contact.kind,
      name: contact.name,
      mobile: contact.mobile,
      email: contact.email,
      idVerificationStatus: contact.kind === "director_guarantor" ? "verified" : "not_required",
      creditCheckStatus: contact.kind === "director_guarantor" ? "clear" : "not_required",
      createdAt: now(),
      updatedAt: now(),
    });
  }
}

const insurers = ["NTI", "QBE", "Allianz", "CGU", "GT Insurance"];
for (const [i, c] of customers.entries()) {
  await insert(t.insurancePolicies, "insurance_policy", {
    customerId: c.id,
    insurer: insurers[i % insurers.length],
    policyNumber: `POL-${882100 + i * 37}`,
    // A few policies expiring soon so the dashboard alert has content.
    expiryDate: iso(i < 3 ? 20 + i * 15 : 120 + i * 30),
    status: "current",
    notes: "Comprehensive cover incl. financed plant & equipment",
    createdAt: now(),
    updatedAt: now(),
  });
}

// --- External parties --------------------------------------------------------

const aggregator = await insert<{ id: number }>(t.externalParties, "external_party", {
  type: "aggregator",
  name: "COG Aggregation",
  contactName: "Sarah Millward",
  email: "partners@cogaggregation.com.au",
  phone: "02 9877 4400",
  abn: makeAbn(64060793000),
  accreditationStatus: "accredited",
  paidBefore: true,
  status: "active",
  createdAt: now(),
  updatedAt: now(),
});

const brokerSeeds = [
  { name: "Apex Equipment Finance", contactName: "Josh Barton", suffix: "apexef.com.au", agg: true },
  { name: "Meridian Capital Brokers", contactName: "Lucy Tran", suffix: "meridiancap.com.au", agg: true },
  { name: "Tablelands Finance Co", contactName: "Grant Ashby", suffix: "tablelandsfinance.com.au", agg: false },
];
const brokers: Array<{ id: number }> = [];
for (const [i, b] of brokerSeeds.entries()) {
  brokers.push(
    await insert<{ id: number }>(t.externalParties, "external_party", {
    type: "broker",
    name: b.name,
    contactName: b.contactName,
    email: `deals@${b.suffix}`,
    phone: `0${2 + (i % 7)} 9${300 + i * 41} ${1100 + i * 73}`,
    abn: makeAbn(83914571000 + i * 6151),
    bsb: ["062000", "082902", "013443"][i],
    accountNumber: String(10293847 + i * 55501),
    accountName: b.name,
    accreditationStatus: "accredited",
    paidBefore: i < 2,
    aggregatorId: b.agg ? aggregator.id : null,
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    }),
  );
}

await insert(t.externalParties, "external_party", {
  type: "vendor",
  name: "Eastern Plant Sales Pty Ltd",
  contactName: "Rick Doyle",
  email: "sales@easternplant.com.au",
  phone: "03 9720 5511",
  abn: makeAbn(37008426000),
  accreditationStatus: "not_accredited",
  paidBefore: true,
  status: "active",
  createdAt: now(),
  updatedAt: now(),
});
await insert(t.externalParties, "external_party", {
  type: "referrer",
  name: "Hunter Valley Accounting Group",
  contactName: "Fiona Wells",
  email: "fiona@hvaccounting.com.au",
  phone: "02 4991 8830",
  abn: makeAbn(29552008000),
  accreditationStatus: "pending",
  paidBefore: false,
  status: "active",
  createdAt: now(),
  updatedAt: now(),
});

// --- Assets, applications, loans, ledgers ------------------------------------

type DealSeed = {
  customerIdx: number;
  brokerIdx: number | null;
  startMonthsAgo: number;
  termMonths: number;
  status: "active" | "paid_out" | "written_off";
  arrears?: boolean;
  rentExGst: number; // dollars/month
  damageWaiver?: number; // dollars/month
  industry: string;
  assets: Array<{ description: string; category: string; vin?: string; rego?: string; serial?: string; value: number }>;
};

const deals: DealSeed[] = [
  {
    industry: "Civil & Construction", customerIdx: 0, brokerIdx: 0, startMonthsAgo: 14, termMonths: 12, status: "active", rentExGst: 6900, damageWaiver: 345,
    assets: [
      { description: "2023 Caterpillar 320 GC Excavator", category: "Excavator", vin: "CAT0320GCPKX10442", serial: "PKX10442", value: 285000 },
      { description: "2022 Custom Quad-Axle Plant Trailer", category: "Trailer", vin: "6T9T24Y0XN1088231", rego: "TP74KD", value: 68000 },
    ],
  },
  {
    industry: "Heavy Haulage", customerIdx: 1, brokerIdx: 1, startMonthsAgo: 10, termMonths: 12, status: "active", rentExGst: 8400, damageWaiver: 420,
    assets: [
      { description: "2021 Kenworth T610SAR Prime Mover", category: "Prime Mover", vin: "6F5000000MB472119", rego: "XT29GH", value: 315000 },
    ],
  },
  {
    industry: "Civil & Construction", customerIdx: 2, brokerIdx: 0, startMonthsAgo: 8, termMonths: 12, status: "active", rentExGst: 3100,
    assets: [
      { description: "Layher Allround Scaffold Package (400m²)", category: "Scaffolding", serial: "LAY-AR-400-8841", value: 96000 },
    ],
  },
  {
    industry: "Civil & Construction", customerIdx: 3, brokerIdx: 2, startMonthsAgo: 6, termMonths: 12, status: "active", arrears: true, rentExGst: 11200, damageWaiver: 560,
    assets: [
      { description: "2020 Liebherr LTM 1060-3.1 Mobile Crane", category: "Crane", vin: "W09611103LEL14887", rego: "QCR60T", value: 830000 },
    ],
  },
  {
    industry: "Civil & Construction", customerIdx: 4, brokerIdx: null, startMonthsAgo: 5, termMonths: 12, status: "active", rentExGst: 4750, damageWaiver: 240,
    assets: [
      { description: "2023 Komatsu WA270-8 Wheel Loader", category: "Loader", vin: "KMTWA270CPA87330", serial: "A87330", value: 198000 },
    ],
  },
  {
    industry: "Transport & Logistics", customerIdx: 5, brokerIdx: 1, startMonthsAgo: 4, termMonths: 12, status: "active", rentExGst: 5300,
    assets: [
      { description: "2022 Scania P280 Rigid w/ 14-pallet Fridge Body", category: "Rigid Truck", vin: "9BSP4X20003912274", rego: "1WR5TU", value: 245000 },
    ],
  },
  {
    industry: "Trades & Services", customerIdx: 6, brokerIdx: 2, startMonthsAgo: 3, termMonths: 12, status: "active", rentExGst: 1450,
    assets: [
      { description: "2024 Isuzu NPR 45-155 Tradepack", category: "Light Truck", vin: "JAANPR75HR7100553", rego: "EQW38C", value: 62000 },
    ],
  },
  {
    industry: "Mining", customerIdx: 7, brokerIdx: 0, startMonthsAgo: 26, termMonths: 12, status: "paid_out", rentExGst: 7800, damageWaiver: 390,
    assets: [
      { description: "2019 Sandvik DE712 Diamond Drill Rig", category: "Drill Rig", serial: "SDV-DE712-3308", value: 260000 },
    ],
  },
  {
    industry: "Forestry", customerIdx: 8, brokerIdx: null, startMonthsAgo: 7, termMonths: 12, status: "active", rentExGst: 2350,
    assets: [
      { description: "2023 Bandit Intimidator 19XPC Wood Chipper", category: "Chipper", serial: "BND19XPC77120", value: 89000 },
      { description: "2022 Hino 300 Series 917 Tipper", category: "Light Truck", vin: "JHDVC66JJKS004811", rego: "S882BWD", value: 74000 },
    ],
  },
];

// Demo loans sit just below the live YGG51600+ contract series.
let contractSeq = 51591;
let arrearsLoanId: number | null = null;
let appSeq = 1;

for (const deal of deals) {
  const customer = customers[deal.customerIdx];
  const startDate = iso(-deal.startMonthsAgo * 30);
  const totalValue = deal.assets.reduce((s, a) => s + a.value, 0);

  const application = await insert<{ id: number }>(t.applications, "application", {
    reference: `APP-2025-${String(appSeq++).padStart(4, "0")}`,
    customerId: customer.id,
    status: "converted",
    source: deal.brokerIdx != null ? "broker" : "direct",
    brokerId: deal.brokerIdx != null ? brokers[deal.brokerIdx].id : null,
    ownerId: credit.id,
    dealValueExGstCents: totalValue * 100,
    // Rental rate is 5%; ROI sits in the 21–27% band by asset type.
    rentalRatePercent: "5.00",
    roiPercent: (22 + (deal.customerIdx % 6)).toFixed(2),
    termMonths: deal.termMonths,
    brokerageExGstCents: deal.brokerIdx != null ? Math.round(totalValue * 0.03) * 100 : null,
    createdAt: now(),
    updatedAt: now(),
  });

  const loan = await insert<{ id: number; contractNumber: string }>(t.loans, "loan", {
    contractNumber: `YGG${contractSeq++}`,
    customerId: customer.id,
    applicationId: application.id,
    startDate,
    endDate: deal.status === "paid_out" ? iso((-deal.startMonthsAgo + deal.termMonths) * 30) : null,
    termMonths: deal.termMonths,
    paymentFrequency: "monthly",
    status: deal.status,
    arrears: deal.arrears ?? false,
    createdAt: now(),
    updatedAt: now(),
  });

  if (deal.arrears) arrearsLoanId = loan.id;

  for (const assetSeed of deal.assets) {
    const asset = await insert<{ id: number }>(t.assets, "asset", {
      description: assetSeed.description,
      category: assetSeed.category,
      industry: deal.industry,
      vin: assetSeed.vin ?? null,
      rego: assetSeed.rego ?? null,
      serialNumber: assetSeed.serial ?? null,
      valueExGstCents: assetSeed.value * 100,
      status: deal.status === "paid_out" ? "paid_out" : "active",
      customerId: customer.id,
      loanId: loan.id,
      createdAt: now(),
      updatedAt: now(),
    });
    await insert(t.applicationAssets, "application_asset", {
      applicationId: application.id,
      assetId: asset.id,
    });
    const registration = await insert<{ id: number }>(t.ppsrRegistrations, "ppsr_registration", {
      assetId: asset.id,
      registrationNumber: `2025${String(202500000000 + asset.id * 977351).slice(-10)}`,
      kind: "pmsi",
      registeredDate: startDate,
      expiryDate: deal.status === "paid_out" ? iso(-30) : iso(-deal.startMonthsAgo * 30 + 7 * 365),
      status: deal.status === "paid_out" ? "discharged" : "registered",
      createdAt: now(),
      updatedAt: now(),
    });
    await insert(t.ppsrEvents, "ppsr_event", {
      registrationId: registration.id,
      event: "searched",
      date: iso(-deal.startMonthsAgo * 30 - 10),
      notes: "Pre-settlement PPSR search — no adverse registrations",
      createdBy: credit.id,
    });
    await insert(t.ppsrEvents, "ppsr_event", {
      registrationId: registration.id,
      event: "registered",
      date: startDate,
      notes: "PMSI registered at settlement",
      createdBy: ops.id,
    });
    if (deal.status === "paid_out") {
      await insert(t.ppsrEvents, "ppsr_event", {
        registrationId: registration.id,
        event: "discharged",
        date: iso(-30),
        notes: "Discharged on payout",
        createdBy: ops.id,
      });
    }
  }

  // Recurring charge schedules.
  const rentCents = deal.rentExGst * 100;
  await insert(t.loanSchedules, "loan_schedule", {
    loanId: loan.id,
    code: "RENT",
    amountExGstCents: rentCents,
    gstCents: Math.round(rentCents * 0.1),
    frequency: "monthly",
    nextRunDate: iso(12),
    active: deal.status === "active",
  });
  if (deal.damageWaiver) {
    const dwCents = deal.damageWaiver * 100;
    await insert(t.loanSchedules, "loan_schedule", {
      loanId: loan.id,
      code: "DAMAGE WAIVER",
      amountExGstCents: dwCents,
      gstCents: Math.round(dwCents * 0.1),
      frequency: "monthly",
      nextRunDate: iso(12),
      active: deal.status === "active",
    });
  }

  // Zepto direct debit authority.
  await insert(t.directDebitAuthorities, "direct_debit_authority", {
    loanId: loan.id,
    accountName: customer.name,
    bsb: ["062184", "082356", "013006", "064462", "085458"][deal.customerIdx % 5],
    accountNumber: String(20481077 + deal.customerIdx * 391204),
    zeptoReference: `ZPT-${71200 + deal.customerIdx * 83}`,
    status: deal.status === "active" ? "active" : "cancelled",
    createdAt: now(),
    updatedAt: now(),
  });

  // Ledger: upfront at settlement, then monthly RENT/DW charges and payments.
  const monthsElapsed = deal.status === "paid_out" ? deal.termMonths : deal.startMonthsAgo;
  const upfrontCents = Math.round(rentCents * 1.5);
  await insert(t.transactions, "transaction", {
    loanId: loan.id,
    date: startDate,
    type: "upfront",
    amountExGstCents: upfrontCents,
    gstCents: Math.round(upfrontCents * 0.1),
    source: "manual",
    reference: `${loan.contractNumber}-UF`,
    description: "Upfront — establishment and first rental in advance",
    createdBy: ops.id,
    createdAt: now(),
  });
  await insert(t.transactions, "transaction", {
    loanId: loan.id,
    date: startDate,
    type: "payment",
    amountExGstCents: -upfrontCents,
    gstCents: -Math.round(upfrontCents * 0.1),
    source: "xero",
    reference: `EFT-${9000 + loan.id * 7}`,
    description: "Upfront received",
    createdBy: ops.id,
    createdAt: now(),
  });

  const dwCents = (deal.damageWaiver ?? 0) * 100;
  for (let m = 1; m <= monthsElapsed; m++) {
    const chargeDate = iso(-(deal.startMonthsAgo - m) * 30 - 15);
    await insert(t.transactions, "transaction", {
      loanId: loan.id,
      date: chargeDate,
      type: "charge",
      amountExGstCents: rentCents,
      gstCents: Math.round(rentCents * 0.1),
      source: "manual",
      reference: `${loan.contractNumber}-R${m}`,
      description: `RENT — month ${m}`,
      createdBy: ops.id,
      createdAt: now(),
    });
    if (dwCents > 0) {
      await insert(t.transactions, "transaction", {
        loanId: loan.id,
        date: chargeDate,
        type: "charge",
        amountExGstCents: dwCents,
        gstCents: Math.round(dwCents * 0.1),
        source: "manual",
        reference: `${loan.contractNumber}-DW${m}`,
        description: `DAMAGE WAIVER — month ${m}`,
        createdBy: ops.id,
        createdAt: now(),
      });
    }
    const cycleCents = rentCents + dwCents;
    const cycleGst = Math.round(rentCents * 0.1) + Math.round(dwCents * 0.1);
    // The arrears deal misses its two most recent debits, with one dishonour fee.
    const missed = deal.arrears && m > monthsElapsed - 2;
    if (!missed) {
      await insert(t.transactions, "transaction", {
        loanId: loan.id,
        date: chargeDate,
        type: "payment",
        amountExGstCents: -cycleCents,
        gstCents: -cycleGst,
        source: "zepto",
        reference: `DD-${loan.id * 100 + m}`,
        description: "Direct debit received",
        createdBy: ops.id,
        createdAt: now(),
      });
    } else if (m === monthsElapsed) {
      await insert(t.transactions, "transaction", {
        loanId: loan.id,
        date: chargeDate,
        type: "dishonour_fee",
        amountExGstCents: 3500,
        gstCents: 350,
        source: "manual",
        reference: `${loan.contractNumber}-DH${m}`,
        description: "Direct debit dishonour fee",
        createdBy: ops.id,
        createdAt: now(),
      });
    }
  }

  // Completed checklists behind each converted application.
  for (const item of DEFAULT_CHECKLIST) {
    await insert(t.applicationChecklistItems, "application_checklist_item", {
      applicationId: application.id,
      key: item.key,
      label: item.label,
      status: "done",
      completedBy: credit.id,
      completedAt: now(),
    });
  }
}

// --- Open applications in the originations pipeline ---------------------------

const openApplicationSeeds = [
  {
    customerIdx: 9, // Derwent Valley Logging — no current facility
    status: "in_progress" as const,
    brokerIdx: 2,
    dealValue: 152000,
    rr: "5.00",
    roi: "24.50",
    termMonths: 12,
    asset: {
      description: "2024 Tigercat 632H Skidder",
      category: "Skidder",
      industry: "Forestry",
      serial: "TC632H-20419",
      value: 152000,
    },
  },
  {
    customerIdx: 7, // Kalgoorlie Drilling — previous facility paid out, ready to convert
    status: "approved" as const,
    brokerIdx: 0,
    dealValue: 118000,
    rr: "5.00",
    roi: "26.00",
    termMonths: 12,
    asset: {
      description: "2023 Atlas Copco XAS 188 Air Compressor Package",
      category: "Compressor",
      industry: "Mining",
      serial: "AC-XAS188-55102",
      value: 118000,
    },
  },
];

const openApplicationIds: number[] = [];
for (const seed of openApplicationSeeds) {
  const customer = customers[seed.customerIdx];
  const application = await insert<{ id: number }>(t.applications, "application", {
    reference: `APP-2026-${String(appSeq++).padStart(4, "0")}`,
    customerId: customer.id,
    status: seed.status,
    source: "broker",
    brokerId: brokers[seed.brokerIdx].id,
    ownerId: credit.id,
    dealValueExGstCents: seed.dealValue * 100,
    rentalRatePercent: seed.rr,
    roiPercent: seed.roi,
    termMonths: seed.termMonths,
    brokerageExGstCents: Math.round(seed.dealValue * 0.03) * 100,
    tradingName: customer.name.replace(" Pty Ltd", ""),
    entityType: "pty_ltd",
    yearsTrading: 8,
    natureOfBusiness: seed.asset.industry,
    premises: "rent",
    employeesCount: 14,
    machinesInFleet: 6,
    createdAt: now(),
    updatedAt: now(),
  });
  openApplicationIds.push(application.id);
  if (seed.status === "in_progress") {
    await insert(t.applicationApplicants, "application_applicant", {
      applicationId: application.id,
      position: 1,
      firstName: "Angela",
      surname: "Burke",
      dateOfBirth: "1979-04-12",
      gender: "female",
      yearsIndustryExperience: 18,
      cityCountryOfBirth: "Hobart, Australia",
      driversLicenceNo: "TAS118842",
      driversLicenceExpiry: iso(650),
      medicareNo: "2950 44821 3",
      medicarePosition: "1",
      mobile: "0418 445 730",
      email: "angela@dvlogging.com.au",
      homeAddressLine1: "44 Derwent Terrace",
      homeSuburb: "New Norfolk",
      homeState: "TAS",
      homePostcode: "7140",
      homeOwnership: "own",
      privacyAcknowledged: true,
      assetsDetail: "Home — 44 Derwent Terrace, New Norfolk: $580,000\nToyota LandCruiser 2021: $74,000",
      liabilitiesDetail: "Bank of Tas home loan: $210,000",
      totalAssetsCents: 65400000,
      totalLiabilitiesCents: 21000000,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  const asset = await insert<{ id: number }>(t.assets, "asset", {
    description: seed.asset.description,
    category: seed.asset.category,
    industry: seed.asset.industry,
    serialNumber: seed.asset.serial,
    valueExGstCents: seed.asset.value * 100,
    status: "active",
    customerId: customer.id,
    loanId: null,
    createdAt: now(),
    updatedAt: now(),
  });
  await insert(t.applicationAssets, "application_asset", {
    applicationId: application.id,
    assetId: asset.id,
  });
  for (const item of DEFAULT_CHECKLIST) {
    // The approved application has its checks done; the in-progress one is mid-flight.
    const done = seed.status === "approved" || ["id_matrix", "credit_check"].includes(item.key);
    await insert(t.applicationChecklistItems, "application_checklist_item", {
      applicationId: application.id,
      key: item.key,
      label: item.label,
      status: done ? "done" : "pending",
      completedBy: done ? credit.id : null,
      completedAt: done ? now() : null,
      notes: done && item.stub ? `${item.stub} check completed (stub)` : null,
    });
  }
}

// --- Workflows -----------------------------------------------------------------

async function seedWorkflow(
  templateKey: string,
  entityType: "application" | "account",
  entityId: number,
  doneSteps: number,
) {
  const template = WORKFLOW_TEMPLATES[templateKey];
  const workflow = await insert<{ id: number }>(t.workflows, "workflow", {
    templateKey,
    description: template.name,
    entityType,
    entityId,
    status: "open",
    allocatedTo: credit.id,
    openedBy: credit.id,
    openedAt: now(),
  });
  for (const [i, step] of template.steps.entries()) {
    await insert(t.workflowItems, "workflow_item", {
      workflowId: workflow.id,
      position: i + 1,
      key: step.key,
      label: step.label,
      kind: step.kind,
      note: step.note ?? null,
      status: i < doneSteps ? "done" : "pending",
      actionedBy: i < doneSteps ? credit.id : null,
      actionedAt: i < doneSteps ? now() : null,
    });
  }
}

// Origination workflow mid-flight on each open application.
for (const [i, applicationId] of openApplicationIds.entries()) {
  await seedWorkflow("origination", "application", applicationId, i === 0 ? 2 : 5);
}
// Collections workflow on the account in arrears.
if (arrearsLoanId != null) {
  await seedWorkflow("collections", "account", arrearsLoanId, 2);
}

// --- Saved searches ------------------------------------------------------------

const searchSeeds = [
  { customerIdx: 0, type: "equifax_credit", subject: "Harbour City Earthmoving Pty Ltd", result: "Score 720 — clear (stub)", reference: "EFX-C-284113" },
  { customerIdx: 0, type: "equifax_name", subject: "Tony Rossi", result: "Name browse complete — no adverse matches located (stub)", reference: "EFX-N-284114" },
  { customerIdx: 1, type: "ppsr", subject: "6F5000000MB472119", result: "No adverse registrations found (stub)", reference: "PPSR-771202" },
  { customerIdx: 7, type: "court", subject: "Kalgoorlie Drilling Services Pty Ltd", result: "No court records located (stub)", reference: "CDS-455913" },
  { customerIdx: 9, type: "equifax_title", subject: "18 Quarry Lane, New Norfolk TAS 7140", result: "Title search complete — ownership and encumbrance summary returned (stub)", reference: "EFX-T-118240" },
] as const;
for (const seed of searchSeeds) {
  await insert(t.searches, "search", {
    type: seed.type,
    customerId: customers[seed.customerIdx].id,
    subject: seed.subject,
    result: seed.result,
    reference: seed.reference,
    runBy: credit.id,
    createdAt: now(),
  });
}

const counts = {
  users: (await db.select().from(t.users)).length,
  customers: (await db.select().from(t.customers)).length,
  contacts: (await db.select().from(t.customerContacts)).length,
  policies: (await db.select().from(t.insurancePolicies)).length,
  externalParties: (await db.select().from(t.externalParties)).length,
  applications: (await db.select().from(t.applications)).length,
  loans: (await db.select().from(t.loans)).length,
  assets: (await db.select().from(t.assets)).length,
  schedules: (await db.select().from(t.loanSchedules)).length,
  transactions: (await db.select().from(t.transactions)).length,
  ppsr: (await db.select().from(t.ppsrRegistrations)).length,
  searches: (await db.select().from(t.searches)).length,
  workflows: (await db.select().from(t.workflows)).length,
  auditEntries: (await db.select().from(t.auditLog)).length,
};
console.log("Seed complete:", counts);
console.log("Sign in: admin@ygg.com.au / credit@ygg.com.au / operations@ygg.com.au — password: yellowgate");

await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

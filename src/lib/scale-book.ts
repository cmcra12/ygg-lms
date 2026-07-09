// The "test book": ~1,600 generated fake deals used to exercise the LMS at a
// realistic portfolio size. Shared by the local script (npm run db:seed-scale)
// and the admin "Load test book" button on the Staff screen, which loads it
// straight into the live database — the Supabase SQL Editor rejects files this
// size, so the app inserts it directly.
//
// Every generated row has an explicit id above SCALE_ID_BASE; live data stays
// below it, so the whole book can be removed again without touching anything
// real. The generator is seeded — every run produces the same book.

import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as t from "@/db/schema";
import { isValidAbn, isValidAcn } from "./abn";
import { DEFAULT_CHECKLIST } from "./checklist";
import { WORKFLOW_TEMPLATES } from "./workflows";

export const SCALE_ID_BASE = 100000;
const CONTRACT_START = 51650; // leaves YGG51600–51649 for live conversions
const CREDIT_USER = 2; // Priya Sharma (base seed)
const OPS_USER = 3; // Liam O'Connell (base seed)
const BASE_BROKER_IDS = [2, 3, 4]; // external_parties from the base seed

type Row = Record<string, unknown>;
const TABLE_ORDER = [
  "customers",
  "customerContacts",
  "insurancePolicies",
  "applications",
  "loans",
  "assets",
  "applicationAssets",
  "applicationChecklistItems",
  "loanSchedules",
  "transactions",
  "directDebitAuthorities",
  "ppsrRegistrations",
  "ppsrEvents",
  "workflows",
  "workflowItems",
  "auditLog",
] as const;
type TableKey = (typeof TABLE_ORDER)[number];
const DRIZZLE_TABLES: Record<TableKey, PgTable> = {
  customers: t.customers,
  customerContacts: t.customerContacts,
  insurancePolicies: t.insurancePolicies,
  applications: t.applications,
  loans: t.loans,
  assets: t.assets,
  applicationAssets: t.applicationAssets,
  applicationChecklistItems: t.applicationChecklistItems,
  loanSchedules: t.loanSchedules,
  transactions: t.transactions,
  directDebitAuthorities: t.directDebitAuthorities,
  ppsrRegistrations: t.ppsrRegistrations,
  ppsrEvents: t.ppsrEvents,
  workflows: t.workflows,
  workflowItems: t.workflowItems,
  auditLog: t.auditLog,
};

export type ScaleBook = {
  store: Record<TableKey, Row[]>;
  summary: {
    deals: number;
    customers: number;
    active: number;
    paidOut: number;
    writtenOff: number;
    arrears: number;
    firstContract: string;
    lastContract: string;
    counts: Record<TableKey, number>;
  };
};

// --- Australian-flavoured name pools -------------------------------------------

const PLACE_WORDS = [
  "Blue Gum", "Wattle Creek", "Stony Point", "Barossa", "Pilbara", "Clarence", "Monaro", "Kimberley",
  "Grampians", "Otway", "Illawarra", "Hunter Valley", "Riverina", "Gippsland", "Darling Downs", "Capricorn",
  "Snowy River", "Macleay", "Torrens", "Fleurieu", "Goldfields", "Fortescue", "Murchison", "Coolum",
  "Bass Strait", "Macquarie", "Bellarine", "Sunraysia", "Wimmera", "Atherton", "Burdekin", "Whitsunday",
  "Nepean", "Hawkesbury", "Cooma", "Ballarat", "Bendigo", "Mildura", "Wagga", "Tamworth",
  "Gladstone", "Mackay", "Townsville", "Karratha", "Bunbury", "Albany", "Geraldton", "Esperance",
  "Launceston", "Devonport", "Mount Gambier", "Whyalla", "Port Lincoln", "Alice Springs", "Katherine", "Darwin Harbour",
  "Southern Cross", "Ironstone", "Redcliff", "Sandy Ridge", "Boulder Creek", "Eagle Point", "Silver Peak", "Copper Hill",
  "Brumby Plains", "Saltbush", "Spinifex", "Jarrah", "Karri", "Bloodwood", "Ironwood", "Stringybark",
  "Quarry Hill", "Millbrook", "Ashfield", "Northbank", "Westport", "Eastvale", "Highfield", "Longreach",
] as const;

const FIRST_NAMES = [
  "Jack", "Liam", "Noah", "Mia", "Ella", "Tom", "Sam", "Ben", "Kate", "Amy",
  "Ryan", "Dean", "Craig", "Wayne", "Shane", "Troy", "Brett", "Glen", "Kylie", "Sharon",
  "Narelle", "Donna", "Leanne", "Tracey", "Karen", "Michelle", "Rebecca", "Emma", "Sarah", "Jess",
  "Darren", "Scott", "Paul", "Mark", "Steve", "Gary", "Neil", "Ian", "Bruce", "Keith",
] as const;
const SURNAMES = [
  "Smith", "Jones", "Williams", "Brown", "Taylor", "Wilson", "Johnson", "White", "Martin", "Anderson",
  "Thompson", "Nguyen", "Ryan", "Walker", "Harris", "Lewis", "Robinson", "Clarke", "Young", "Wright",
  "King", "Hall", "Green", "Baker", "Adams", "Nelson", "Hill", "Campbell", "Mitchell", "Roberts",
  "Carter", "Phillips", "Evans", "Turner", "Parker", "Collins", "Edwards", "Stewart", "Morris", "Murphy",
  "Cook", "Rogers", "Reed", "Bell", "Bailey", "Cooper", "Richardson", "Cox", "Howard", "Ward",
  "Kelly", "Hayes", "Doyle", "Walsh", "OBrien", "Byrne", "Gallagher", "McCarthy", "Fitzgerald", "Kennedy",
] as const;

const LOCALITIES: Array<{ suburb: string; state: string; postcode: string }> = [
  { suburb: "Penrith", state: "NSW", postcode: "2750" }, { suburb: "Newcastle", state: "NSW", postcode: "2300" },
  { suburb: "Wollongong", state: "NSW", postcode: "2500" }, { suburb: "Dubbo", state: "NSW", postcode: "2830" },
  { suburb: "Tamworth", state: "NSW", postcode: "2340" }, { suburb: "Wagga Wagga", state: "NSW", postcode: "2650" },
  { suburb: "Orange", state: "NSW", postcode: "2800" }, { suburb: "Coffs Harbour", state: "NSW", postcode: "2450" },
  { suburb: "Dandenong", state: "VIC", postcode: "3175" }, { suburb: "Geelong", state: "VIC", postcode: "3220" },
  { suburb: "Ballarat", state: "VIC", postcode: "3350" }, { suburb: "Bendigo", state: "VIC", postcode: "3550" },
  { suburb: "Shepparton", state: "VIC", postcode: "3630" }, { suburb: "Traralgon", state: "VIC", postcode: "3844" },
  { suburb: "Laverton North", state: "VIC", postcode: "3026" }, { suburb: "Mildura", state: "VIC", postcode: "3500" },
  { suburb: "Toowoomba", state: "QLD", postcode: "4350" }, { suburb: "Rockhampton", state: "QLD", postcode: "4700" },
  { suburb: "Mackay", state: "QLD", postcode: "4740" }, { suburb: "Townsville", state: "QLD", postcode: "4810" },
  { suburb: "Cairns", state: "QLD", postcode: "4870" }, { suburb: "Gladstone", state: "QLD", postcode: "4680" },
  { suburb: "Sunshine Coast", state: "QLD", postcode: "4556" }, { suburb: "Ipswich", state: "QLD", postcode: "4305" },
  { suburb: "Kalgoorlie", state: "WA", postcode: "6430" }, { suburb: "Karratha", state: "WA", postcode: "6714" },
  { suburb: "Bunbury", state: "WA", postcode: "6230" }, { suburb: "Geraldton", state: "WA", postcode: "6530" },
  { suburb: "Port Hedland", state: "WA", postcode: "6721" }, { suburb: "Welshpool", state: "WA", postcode: "6106" },
  { suburb: "Port Adelaide", state: "SA", postcode: "5015" }, { suburb: "Mount Gambier", state: "SA", postcode: "5290" },
  { suburb: "Whyalla", state: "SA", postcode: "5600" }, { suburb: "Port Augusta", state: "SA", postcode: "5700" },
  { suburb: "Launceston", state: "TAS", postcode: "7250" }, { suburb: "Devonport", state: "TAS", postcode: "7310" },
  { suburb: "Hobart", state: "TAS", postcode: "7000" }, { suburb: "Darwin", state: "NT", postcode: "0800" },
  { suburb: "Katherine", state: "NT", postcode: "0850" }, { suburb: "Alice Springs", state: "NT", postcode: "0870" },
] as const;

const STREETS = ["Foundry Road", "Enterprise Drive", "Industrial Avenue", "Depot Street", "Quarry Lane", "Freight Terrace", "Haulage Way", "Boundary Road", "Prospect Street", "Machinery Drive"] as const;

// Industry → business noun and equipment catalogue. Asset values are ex-GST dollars.
type AssetTemplate = { make: string; model: string; category: string; kind: "vin" | "rego" | "serial"; lo: number; hi: number };
const INDUSTRIES: Array<{ industry: string; weight: number; trades: string[]; catalogue: AssetTemplate[] }> = [
  {
    industry: "Civil & Construction", weight: 26,
    trades: ["Civil Contracting", "Excavations", "Earthworks", "Concreting", "Plant Hire", "Demolition", "Roadworks"],
    catalogue: [
      { make: "Komatsu", model: "PC200-8 Excavator", category: "Excavator", kind: "vin", lo: 160000, hi: 260000 },
      { make: "Caterpillar", model: "320 GC Excavator", category: "Excavator", kind: "vin", lo: 220000, hi: 300000 },
      { make: "Hitachi", model: "ZX135US Excavator", category: "Excavator", kind: "vin", lo: 130000, hi: 200000 },
      { make: "Kubota", model: "U55-4 Mini Excavator", category: "Excavator", kind: "serial", lo: 60000, hi: 95000 },
      { make: "Volvo", model: "L90H Wheel Loader", category: "Loader", kind: "vin", lo: 180000, hi: 280000 },
      { make: "Bobcat", model: "S650 Skid Steer", category: "Skid Steer", kind: "serial", lo: 45000, hi: 75000 },
      { make: "Ammann", model: "ASC110 Smooth Drum Roller", category: "Roller", kind: "serial", lo: 65000, hi: 115000 },
      { make: "Genie", model: "S-65 Boom Lift", category: "EWP", kind: "serial", lo: 55000, hi: 95000 },
      { make: "Custom", model: "Tri-Axle Plant Trailer", category: "Trailer", kind: "rego", lo: 40000, hi: 80000 },
    ],
  },
  {
    industry: "Heavy Haulage", weight: 12,
    trades: ["Haulage", "Heavy Haulage", "Bulk Transport", "Livestock Transport"],
    catalogue: [
      { make: "Kenworth", model: "T610SAR Prime Mover", category: "Prime Mover", kind: "rego", lo: 260000, hi: 360000 },
      { make: "Volvo", model: "FH16 Prime Mover", category: "Prime Mover", kind: "rego", lo: 250000, hi: 340000 },
      { make: "Mack", model: "Super-Liner Prime Mover", category: "Prime Mover", kind: "rego", lo: 240000, hi: 330000 },
      { make: "Drake", model: "4x8 Swingwing Low Loader", category: "Trailer", kind: "rego", lo: 140000, hi: 230000 },
      { make: "Lusty EMS", model: "Side Tipper Set", category: "Trailer", kind: "rego", lo: 110000, hi: 190000 },
    ],
  },
  {
    industry: "Transport & Logistics", weight: 15,
    trades: ["Transport", "Freight Lines", "Logistics", "Refrigerated Transport", "Couriers"],
    catalogue: [
      { make: "Scania", model: "P280 Rigid Curtainsider", category: "Rigid Truck", kind: "rego", lo: 180000, hi: 260000 },
      { make: "Isuzu", model: "FVR 165-300 Rigid", category: "Rigid Truck", kind: "rego", lo: 120000, hi: 180000 },
      { make: "Hino", model: "500 Series FE Rigid", category: "Rigid Truck", kind: "rego", lo: 100000, hi: 170000 },
      { make: "Vawdrey", model: "45ft Drop Deck Trailer", category: "Trailer", kind: "rego", lo: 90000, hi: 150000 },
      { make: "Thermo King", model: "SLXi Fridge Trailer", category: "Trailer", kind: "rego", lo: 120000, hi: 190000 },
    ],
  },
  {
    industry: "Trades & Services", weight: 14,
    trades: ["Plumbing", "Electrical", "Scaffolding", "Roofing", "HVAC Services", "Shopfitting", "Landscaping"],
    catalogue: [
      { make: "Isuzu", model: "NPR 45-155 Tradepack", category: "Light Truck", kind: "rego", lo: 55000, hi: 82000 },
      { make: "Hino", model: "300 Series 616 Tipper", category: "Light Truck", kind: "rego", lo: 60000, hi: 90000 },
      { make: "Layher", model: "Allround Scaffold Package", category: "Scaffolding", kind: "serial", lo: 60000, hi: 120000 },
      { make: "Vermeer", model: "D23x30 Directional Drill", category: "Drill", kind: "serial", lo: 130000, hi: 210000 },
      { make: "Haulotte", model: "HA16RTJ Knuckle Boom", category: "EWP", kind: "serial", lo: 70000, hi: 110000 },
    ],
  },
  {
    industry: "Mining", weight: 10,
    trades: ["Drilling Services", "Mining Services", "Exploration Drilling", "Blast Hole Services"],
    catalogue: [
      // Note: no Caterpillar here — the smoke test's industry-filter check
      // asserts the Mining view contains no "Caterpillar".
      { make: "Epiroc", model: "SmartROC D65 Drill Rig", category: "Drill Rig", kind: "serial", lo: 260000, hi: 450000 },
      { make: "Sandvik", model: "DE712 Diamond Drill Rig", category: "Drill Rig", kind: "serial", lo: 220000, hi: 380000 },
      { make: "Komatsu", model: "WA380-8 Wheel Loader", category: "Loader", kind: "vin", lo: 200000, hi: 320000 },
      { make: "Volvo", model: "A30G Articulated Dump Truck", category: "Dump Truck", kind: "vin", lo: 280000, hi: 450000 },
      { make: "Atlas Copco", model: "XAS 188 Air Compressor", category: "Compressor", kind: "serial", lo: 90000, hi: 160000 },
    ],
  },
  {
    industry: "Earthmoving", weight: 8,
    trades: ["Earthmoving", "Bulk Earthworks", "Land Clearing"],
    catalogue: [
      { make: "Komatsu", model: "D65PX-18 Dozer", category: "Dozer", kind: "vin", lo: 250000, hi: 380000 },
      { make: "Hitachi", model: "ZX300LC-7 Excavator", category: "Excavator", kind: "vin", lo: 300000, hi: 420000 },
      { make: "Caterpillar", model: "140 GC Motor Grader", category: "Grader", kind: "vin", lo: 260000, hi: 380000 },
      { make: "Bell", model: "B30E Articulated Dump Truck", category: "Dump Truck", kind: "vin", lo: 240000, hi: 360000 },
    ],
  },
  {
    industry: "Agriculture", weight: 6,
    trades: ["Ag Contracting", "Harvesting", "Rural Services", "Grain Handling"],
    catalogue: [
      { make: "John Deere", model: "8R 340 Tractor", category: "Tractor", kind: "serial", lo: 220000, hi: 380000 },
      { make: "Case IH", model: "Axial-Flow 8250 Header", category: "Harvester", kind: "serial", lo: 320000, hi: 520000 },
      { make: "Kubota", model: "M7-172 Tractor", category: "Tractor", kind: "serial", lo: 120000, hi: 190000 },
      { make: "Hardi", model: "Saritor 62 Self-Propelled Sprayer", category: "Sprayer", kind: "serial", lo: 250000, hi: 380000 },
    ],
  },
  {
    industry: "Forestry", weight: 3,
    trades: ["Logging", "Forest Harvesting", "Tree Services"],
    catalogue: [
      { make: "Tigercat", model: "632H Skidder", category: "Skidder", kind: "serial", lo: 320000, hi: 480000 },
      { make: "Bandit", model: "Intimidator 19XPC Chipper", category: "Chipper", kind: "serial", lo: 80000, hi: 120000 },
      { make: "Hino", model: "500 Series 1426 Tipper", category: "Light Truck", kind: "rego", lo: 90000, hi: 140000 },
    ],
  },
  {
    industry: "Waste & Recycling", weight: 6,
    trades: ["Waste Services", "Recycling", "Skip Bins", "Liquid Waste"],
    catalogue: [
      { make: "Superior Pak", model: "Rear Loader Compactor", category: "Waste Truck", kind: "rego", lo: 180000, hi: 280000 },
      { make: "Doppstadt", model: "AK 565 Shredder", category: "Shredder", kind: "serial", lo: 250000, hi: 420000 },
      { make: "Isuzu", model: "FYJ 300-350 Hooklift", category: "Waste Truck", kind: "rego", lo: 190000, hi: 270000 },
    ],
  },
];
const INDUSTRY_POOL = INDUSTRIES.flatMap((i) => Array<typeof i>(i.weight).fill(i));

// --- Generator -------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateScaleBook(dealsWanted = 1600): ScaleBook {
  const rand = mulberry32(0x59_47_47_21);
  const rint = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const chance = (p: number) => rand() < p;

  // Date helpers — local calendar, ISO strings like the rest of the app.
  const TODAY = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const stampOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, rint(0, 59)).toISOString();
  const monthsBack = (months: number, day: number) =>
    new Date(TODAY.getFullYear(), TODAY.getMonth() - months, Math.min(day, 28));
  const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, d.getDate());

  // Unique identifier generators.
  const usedAbn = new Set<string>();
  const usedAcn = new Set<string>();
  function makeAbn(): string {
    for (;;) {
      for (let n = rint(11_000_000_000, 98_999_999_000); ; n++) {
        const candidate = String(n).padStart(11, "0");
        if (isValidAbn(candidate)) {
          if (usedAbn.has(candidate)) break; // re-roll a new starting point
          usedAbn.add(candidate);
          return candidate;
        }
      }
    }
  }
  function makeAcn(): string {
    for (;;) {
      for (let n = rint(100_000_000, 998_999_000); ; n++) {
        const candidate = String(n).padStart(9, "0");
        if (isValidAcn(candidate)) {
          if (usedAcn.has(candidate)) break;
          usedAcn.add(candidate);
          return candidate;
        }
      }
    }
  }
  // Regos from the base seed (and the one the smoke test searches for) are reserved.
  const usedRego = new Set(["XT29GH", "TP74KD", "QCR60T", "1WR5TU", "EQW38C", "S882BWD"]);
  function makeRego(): string {
    const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (;;) {
      const rego = `${pick(L as unknown as string[])}${pick(L as unknown as string[])}${rint(10, 99)}${pick(L as unknown as string[])}${pick(L as unknown as string[])}`;
      if (!usedRego.has(rego)) {
        usedRego.add(rego);
        return rego;
      }
    }
  }
  let vinSeq = 4_100_000;
  function makeVin(make: string): string {
    const prefix = (make.toUpperCase().replace(/[^A-Z0-9]/g, "") + "XXXXXXXXXXX").slice(0, 11);
    return `6${prefix.slice(0, 10)}${String(vinSeq++)}`.slice(0, 17);
  }
  let serialSeq = 610_000;
  const makeSerial = (make: string) =>
    `${make.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)}-${serialSeq++}`;

  const store = Object.fromEntries(TABLE_ORDER.map((k) => [k, []])) as unknown as Record<TableKey, Row[]>;
  const seq = Object.fromEntries(TABLE_ORDER.map((k) => [k, SCALE_ID_BASE])) as unknown as Record<TableKey, number>;
  function add(table: TableKey, row: Row): number {
    const id = ++seq[table];
    store[table].push({ id, ...row });
    return id;
  }
  function audit(entityType: string, entityId: number, after: Row, stamp: string) {
    add("auditLog", {
      timestamp: stamp,
      actorId: null,
      actorName: "System (test book)",
      entityType,
      entityId,
      action: "create",
      before: null,
      after: JSON.stringify(after),
    });
  }

  const usedNames = new Set<string>();
  const insurers = ["NTI", "QBE", "Allianz", "CGU", "GT Insurance", "Zurich"];

  type DealSpec = {
    customerId: number;
    customerName: string;
    industry: (typeof INDUSTRIES)[number];
    start: Date;
    brokerId: number | null;
  };
  const dealSpecs: DealSpec[] = [];

  let customerCount = 0;
  while (dealSpecs.length < dealsWanted) {
    const industry = pick(INDUSTRY_POOL);
    let name: string;
    do {
      name = `${pick(PLACE_WORDS)} ${pick(industry.trades)} Pty Ltd`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const locality = pick(LOCALITIES);
    const director = `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`;
    const emailDomain = `${name.toLowerCase().replace(/ pty ltd$/, "").replace(/[^a-z0-9]/g, "")}.com.au`;
    const createdStamp = stampOf(monthsBack(rint(6, 34), rint(1, 28)));

    const customerId = add("customers", {
      code: `C${2001 + customerCount}`,
      name,
      type: "company",
      abn: makeAbn(),
      acn: makeAcn(),
      email: `accounts@${emailDomain}`,
      phone: `04${rint(10, 99)} ${rint(100, 999)} ${rint(100, 999)}`,
      addressLine1: `${rint(1, 220)} ${pick(STREETS)}`,
      addressLine2: null,
      suburb: locality.suburb,
      state: locality.state,
      postcode: locality.postcode,
      status: "active",
      notes: null,
      createdAt: createdStamp,
      updatedAt: createdStamp,
    });
    customerCount++;
    audit("customer", customerId, { name }, createdStamp);

    add("customerContacts", {
      customerId,
      kind: "director_guarantor",
      name: director,
      mobile: `04${rint(10, 99)} ${rint(100, 999)} ${rint(100, 999)}`,
      email: `${director.split(" ")[0].toLowerCase()}@${emailDomain}`,
      idVerificationStatus: "verified",
      creditCheckStatus: "clear",
      notes: null,
      createdAt: createdStamp,
      updatedAt: createdStamp,
    });
    if (chance(0.5)) {
      add("customerContacts", {
        customerId,
        kind: pick(["key", "authorised"] as const),
        name: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,
        mobile: `04${rint(10, 99)} ${rint(100, 999)} ${rint(100, 999)}`,
        email: `admin@${emailDomain}`,
        idVerificationStatus: "not_required",
        creditCheckStatus: "not_required",
        notes: null,
        createdAt: createdStamp,
        updatedAt: createdStamp,
      });
    }

    add("insurancePolicies", {
      customerId,
      insurer: pick(insurers),
      policyNumber: `POL-${rint(300000, 989999)}`,
      expiryDate: isoDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + rint(15, 400))),
      status: "current",
      notes: "Comprehensive cover incl. financed plant & equipment",
      createdAt: createdStamp,
      updatedAt: createdStamp,
    });

    // 1–6 deals per customer, weighted towards one or two.
    const roll = rand();
    const dealCount = roll < 0.45 ? 1 : roll < 0.7 ? 2 : roll < 0.85 ? 3 : rint(4, 6);
    const usedMonths = new Set<number>();
    for (let d = 0; d < dealCount && dealSpecs.length < dealsWanted; d++) {
      // Start dates skew recent (a growing book), spread over ~30 months.
      let m = Math.floor(30 * Math.pow(rand(), 1.35)) + 1;
      while (usedMonths.has(m)) m = (m % 30) + 1;
      usedMonths.add(m);
      dealSpecs.push({
        customerId,
        customerName: name,
        industry,
        start: monthsBack(m, rint(1, 28)),
        brokerId: chance(0.75) ? pick(BASE_BROKER_IDS) : null,
      });
    }
  }

  // Contract numbers and application references are issued in settlement order.
  dealSpecs.sort((a, b) => a.start.getTime() - b.start.getTime());

  let arrearsCount = 0;
  const arrearsLoans: Array<{ loanId: number; openedAt: string }> = [];
  const statusTally = { active: 0, paid_out: 0, written_off: 0 };

  for (const [i, spec] of dealSpecs.entries()) {
    const start = spec.start;
    const startDate = isoDate(start);
    const startStamp = stampOf(start);
    // Completed monthly cycles only — a partial month means no charge yet.
    let monthsSinceStart =
      (TODAY.getFullYear() - start.getFullYear()) * 12 + TODAY.getMonth() - start.getMonth();
    if (addMonths(start, monthsSinceStart) > TODAY) monthsSinceStart--;
    monthsSinceStart = Math.max(0, monthsSinceStart);
    const term = 12;

    // Status: deals past their 12-month minimum mostly paid out; a thin slice
    // written off; ~6% of the live book in arrears.
    let status: "active" | "paid_out" | "written_off";
    if (monthsSinceStart > term + 1) {
      status = chance(0.78) ? "paid_out" : chance(0.94) ? "active" : "written_off";
    } else {
      status = chance(0.985) ? "active" : "written_off";
    }
    // Arrears needs at least two billed cycles behind it to make sense.
    const arrears = status === "active" && monthsSinceStart >= 2 && chance(0.06);
    if (arrears) arrearsCount++;
    statusTally[status]++;

    // Assets.
    const assetCount = chance(0.85) ? 1 : 2;
    const dealAssets: Array<{ template: AssetTemplate; value: number; description: string }> = [];
    for (let a = 0; a < assetCount; a++) {
      const template = pick(spec.industry.catalogue);
      const year = Math.min(start.getFullYear(), TODAY.getFullYear()) - rint(0, 4);
      dealAssets.push({
        template,
        value: Math.round(rint(template.lo, template.hi) / 500) * 500,
        description: `${year} ${template.make} ${template.model}`,
      });
    }
    const totalValue = dealAssets.reduce((s, a) => s + a.value, 0);

    // Monthly rent from the rental rate; ex-GST cents everywhere.
    const rr = 2.2 + rand() * 1.2;
    const rentCents = Math.round((totalValue * rr) / 100 / 10) * 10 * 100;
    const dwCents = chance(0.4) ? Math.round((rentCents * 0.05) / 100) * 100 : 0;

    const reference = `APP-${start.getFullYear()}-${2001 + i}`;
    const contractNumber = `YGG${CONTRACT_START + i}`;

    const applicationId = add("applications", {
      reference,
      customerId: spec.customerId,
      status: "converted",
      source: spec.brokerId != null ? "broker" : "direct",
      brokerId: spec.brokerId,
      ownerId: CREDIT_USER,
      dealValueExGstCents: totalValue * 100,
      rentalRatePercent: rr.toFixed(2),
      roiPercent: (10.5 + rand() * 4).toFixed(2),
      termMonths: term,
      brokerageExGstCents: spec.brokerId != null ? Math.round(totalValue * 0.03) * 100 : null,
      tradingName: spec.customerName.replace(" Pty Ltd", ""),
      entityType: "pty_ltd",
      yearsTrading: rint(2, 25),
      natureOfBusiness: spec.industry.industry,
      premises: chance(0.6) ? "rent" : "own",
      employeesCount: rint(2, 60),
      machinesInFleet: rint(1, 25),
      createdAt: stampOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() - rint(10, 30))),
      updatedAt: startStamp,
    });
    audit("application", applicationId, { reference }, startStamp);

    let payoutEnd = addMonths(start, term + rint(0, 6));
    if (payoutEnd > TODAY) payoutEnd = addMonths(start, term);
    const endDate = status === "paid_out" ? isoDate(payoutEnd) : null;
    const loanId = add("loans", {
      contractNumber,
      customerId: spec.customerId,
      applicationId,
      startDate,
      endDate,
      termMonths: term,
      paymentFrequency: "monthly",
      status,
      arrears,
      notes: null,
      createdAt: startStamp,
      updatedAt: startStamp,
    });
    audit("loan", loanId, { contractNumber }, startStamp);

    for (const dealAsset of dealAssets) {
      const { template } = dealAsset;
      const assetId = add("assets", {
        description: dealAsset.description,
        category: template.category,
        industry: spec.industry.industry,
        vin: template.kind === "vin" ? makeVin(template.make) : null,
        rego: template.kind === "rego" ? makeRego() : null,
        serialNumber: template.kind === "serial" ? makeSerial(template.make) : null,
        valueExGstCents: dealAsset.value * 100,
        status: status === "paid_out" ? "paid_out" : status === "written_off" ? "sold" : "active",
        customerId: spec.customerId,
        loanId,
        notes: null,
        createdAt: startStamp,
        updatedAt: startStamp,
      });
      audit("asset", assetId, { description: dealAsset.description }, startStamp);
      add("applicationAssets", { applicationId, assetId });

      const registrationId = add("ppsrRegistrations", {
        assetId,
        registrationNumber: `20${String(2400000000 + assetId * 9377).slice(-12)}`,
        kind: "pmsi",
        registeredDate: startDate,
        expiryDate:
          status === "active"
            ? isoDate(new Date(start.getFullYear() + 7, start.getMonth(), start.getDate()))
            : endDate ?? startDate,
        status: status === "active" ? "registered" : "discharged",
        createdAt: startStamp,
        updatedAt: startStamp,
      });
      add("ppsrEvents", {
        registrationId,
        event: "searched",
        date: isoDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() - rint(5, 15))),
        notes: "Pre-settlement PPSR search — no adverse registrations",
        createdBy: CREDIT_USER,
      });
      add("ppsrEvents", {
        registrationId,
        event: "registered",
        date: startDate,
        notes: "PMSI registered at settlement",
        createdBy: OPS_USER,
      });
      if (status !== "active") {
        add("ppsrEvents", {
          registrationId,
          event: "discharged",
          date: endDate ?? isoDate(addMonths(start, 6)),
          notes: status === "paid_out" ? "Discharged on payout" : "Discharged — asset recovered and sold",
          createdBy: OPS_USER,
        });
      }
    }

    // Recurring schedules and the Zepto DDR.
    add("loanSchedules", {
      loanId,
      code: "RENT",
      amountExGstCents: rentCents,
      gstCents: Math.round(rentCents * 0.1),
      frequency: "monthly",
      nextRunDate: isoDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + rint(1, 28))),
      active: status === "active",
    });
    if (dwCents > 0) {
      add("loanSchedules", {
        loanId,
        code: "DAMAGE WAIVER",
        amountExGstCents: dwCents,
        gstCents: Math.round(dwCents * 0.1),
        frequency: "monthly",
        nextRunDate: isoDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + rint(1, 28))),
        active: status === "active",
      });
    }
    add("directDebitAuthorities", {
      loanId,
      accountName: spec.customerName,
      bsb: pick(["062184", "082356", "013006", "064462", "085458", "036063"]),
      accountNumber: String(rint(10000000, 99999999)),
      zeptoReference: `ZPT-${rint(60000, 99999)}`,
      status: status === "active" ? "active" : "cancelled",
      createdAt: startStamp,
      updatedAt: startStamp,
    });

    // Ledger: upfront at settlement, then a monthly cycle of charges/payments.
    // Paid-out deals settle in full; written-off deals stop paying, then stop;
    // arrears deals miss their last two debits (one dishonour fee).
    const monthsElapsed =
      status === "paid_out"
        ? term
        : status === "written_off"
          ? Math.min(monthsSinceStart, rint(4, 9))
          : Math.min(monthsSinceStart, 24);
    const paymentsStop = status === "written_off" ? Math.max(1, monthsElapsed - rint(2, 3)) : Infinity;

    const upfrontCents = Math.round(rentCents * 1.5);
    const txn = (row: Row) => add("transactions", { loanId, createdBy: OPS_USER, createdAt: startStamp, ...row });
    txn({
      date: startDate,
      type: "upfront",
      amountExGstCents: upfrontCents,
      gstCents: Math.round(upfrontCents * 0.1),
      source: "manual",
      reference: `${contractNumber}-UF`,
      description: "Upfront — establishment and first rental in advance",
    });
    txn({
      date: startDate,
      type: "payment",
      amountExGstCents: -upfrontCents,
      gstCents: -Math.round(upfrontCents * 0.1),
      source: "xero",
      reference: `EFT-${loanId * 7}`,
      description: "Upfront received",
    });

    for (let m = 1; m <= monthsElapsed; m++) {
      const cycle = addMonths(start, m);
      const cycleDate = isoDate(cycle);
      const cycleStamp = stampOf(cycle);
      txn({
        date: cycleDate,
        type: "charge",
        amountExGstCents: rentCents,
        gstCents: Math.round(rentCents * 0.1),
        source: "manual",
        reference: `${contractNumber}-R${m}`,
        description: `RENT — month ${m}`,
        createdAt: cycleStamp,
      });
      if (dwCents > 0) {
        txn({
          date: cycleDate,
          type: "charge",
          amountExGstCents: dwCents,
          gstCents: Math.round(dwCents * 0.1),
          source: "manual",
          reference: `${contractNumber}-DW${m}`,
          description: `DAMAGE WAIVER — month ${m}`,
          createdAt: cycleStamp,
        });
      }
      const missed = (arrears && m > monthsElapsed - 2) || m > paymentsStop;
      if (!missed) {
        txn({
          date: cycleDate,
          type: "payment",
          amountExGstCents: -(rentCents + dwCents),
          gstCents: -(Math.round(rentCents * 0.1) + Math.round(dwCents * 0.1)),
          source: "zepto",
          reference: `DD-${loanId * 100 + m}`,
          description: "Direct debit received",
          createdAt: cycleStamp,
        });
      } else if (arrears && m === monthsElapsed) {
        txn({
          date: cycleDate,
          type: "dishonour_fee",
          amountExGstCents: 3500,
          gstCents: 350,
          source: "manual",
          reference: `${contractNumber}-DH${m}`,
          description: "Direct debit dishonour fee",
          createdAt: cycleStamp,
        });
      }
    }
    if (status === "written_off" && monthsElapsed > paymentsStop) {
      // Write the residual off so the ledger tells the story.
      const owed = (rentCents + dwCents) * (monthsElapsed - paymentsStop);
      const writeOff = addMonths(start, monthsElapsed + 1);
      txn({
        date: isoDate(writeOff > TODAY ? TODAY : writeOff),
        type: "adjustment",
        amountExGstCents: -owed,
        gstCents: -Math.round(owed * 0.1),
        source: "manual",
        reference: `${contractNumber}-WO`,
        description: "Balance written off — facility terminated",
      });
    }

    for (const item of DEFAULT_CHECKLIST) {
      add("applicationChecklistItems", {
        applicationId,
        key: item.key,
        label: item.label,
        status: "done",
        completedBy: CREDIT_USER,
        completedAt: stampOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() - rint(3, 12))),
        notes: null,
      });
    }

    if (arrears)
      arrearsLoans.push({
        loanId,
        openedAt: stampOf(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - rint(3, 40))),
      });
  }

  // Collections workflows on most arrears accounts, mid-flight.
  const collectionsTemplate = WORKFLOW_TEMPLATES.collections;
  for (const { loanId, openedAt } of arrearsLoans) {
    if (!chance(0.75)) continue; // some arrears accounts not yet worked
    const workflowId = add("workflows", {
      templateKey: "collections",
      description: collectionsTemplate.name,
      entityType: "account",
      entityId: loanId,
      status: "open",
      allocatedTo: chance(0.5) ? CREDIT_USER : OPS_USER,
      openedBy: CREDIT_USER,
      openedAt,
      completedAt: null,
    });
    const doneSteps = rint(1, 4);
    for (const [pos, step] of collectionsTemplate.steps.entries()) {
      add("workflowItems", {
        workflowId,
        position: pos + 1,
        key: step.key,
        label: step.label,
        kind: step.kind,
        note: step.note ?? null,
        status: pos < doneSteps ? "done" : "pending",
        actionedBy: pos < doneSteps ? CREDIT_USER : null,
        actionedAt: pos < doneSteps ? openedAt : null,
      });
    }
  }

  return {
    store,
    summary: {
      deals: dealSpecs.length,
      customers: customerCount,
      active: statusTally.active,
      paidOut: statusTally.paid_out,
      writtenOff: statusTally.written_off,
      arrears: arrearsCount,
      firstContract: `YGG${CONTRACT_START}`,
      lastContract: `YGG${CONTRACT_START + dealSpecs.length - 1}`,
      counts: Object.fromEntries(TABLE_ORDER.map((k) => [k, store[k].length])) as Record<TableKey, number>,
    },
  };
}

// --- Load / query / remove --------------------------------------------------------

export async function isScaleBookLoaded(): Promise<boolean> {
  const [row] = await db
    .select({ id: t.loans.id })
    .from(t.loans)
    .where(sql`${t.loans.id} > ${SCALE_ID_BASE}`)
    .limit(1);
  return row != null;
}

/** Bulk-insert the whole book in one transaction (explicit ids above SCALE_ID_BASE). */
export async function insertScaleBook(book: ScaleBook): Promise<void> {
  const CHUNK = 800;
  await db.transaction(async (tx) => {
    for (const key of TABLE_ORDER) {
      const rows = book.store[key];
      for (let i = 0; i < rows.length; i += CHUNK) {
        await tx
          .insert(DRIZZLE_TABLES[key])
          .overridingSystemValue()
          .values(rows.slice(i, i + CHUNK) as never);
      }
    }
  });
}

/**
 * Remove the book: deletes every row above SCALE_ID_BASE plus anything created
 * against a test entity since (payments on a test account, workflows opened on
 * one, generated documents…), so foreign keys can't block the cleanup.
 */
export async function removeScaleBook(): Promise<void> {
  const B = SCALE_ID_BASE;
  const scaleLoans = `SELECT id FROM loans WHERE id > ${B} OR customer_id > ${B}`;
  const scaleApps = `SELECT id FROM applications WHERE id > ${B} OR customer_id > ${B}`;
  const scaleAssets = `SELECT id FROM assets WHERE id > ${B} OR customer_id > ${B} OR loan_id IN (${scaleLoans})`;
  const statements = [
    `DELETE FROM workflow_items WHERE workflow_id IN (SELECT id FROM workflows WHERE id > ${B} OR entity_id > ${B})`,
    `DELETE FROM workflows WHERE id > ${B} OR entity_id > ${B}`,
    `DELETE FROM ppsr_events WHERE registration_id IN (SELECT id FROM ppsr_registrations WHERE id > ${B} OR asset_id IN (${scaleAssets}))`,
    `DELETE FROM ppsr_registrations WHERE id > ${B} OR asset_id IN (${scaleAssets})`,
    `DELETE FROM transactions WHERE loan_id IN (${scaleLoans})`,
    `DELETE FROM loan_schedules WHERE loan_id IN (${scaleLoans})`,
    `DELETE FROM direct_debit_authorities WHERE loan_id IN (${scaleLoans})`,
    `DELETE FROM documents WHERE (entity_type = 'application' AND entity_id IN (${scaleApps})) OR (entity_type = 'loan' AND entity_id IN (${scaleLoans}))`,
    `DELETE FROM application_checklist_items WHERE application_id IN (${scaleApps})`,
    `DELETE FROM application_applicants WHERE application_id IN (${scaleApps})`,
    `DELETE FROM application_assets WHERE application_id IN (${scaleApps}) OR asset_id IN (${scaleAssets})`,
    `DELETE FROM insurance_policy_assets WHERE asset_id IN (${scaleAssets}) OR policy_id IN (SELECT id FROM insurance_policies WHERE id > ${B} OR customer_id > ${B})`,
    `DELETE FROM assets WHERE id IN (${scaleAssets})`,
    `DELETE FROM loans WHERE id IN (${scaleLoans})`,
    `DELETE FROM applications WHERE id IN (${scaleApps})`,
    `DELETE FROM searches WHERE customer_id > ${B}`,
    `DELETE FROM insurance_policies WHERE id > ${B} OR customer_id > ${B}`,
    `DELETE FROM customer_contacts WHERE id > ${B} OR customer_id > ${B}`,
    `DELETE FROM customers WHERE id > ${B}`,
    `DELETE FROM audit_log WHERE id > ${B}`,
  ];
  await db.transaction(async (tx) => {
    for (const statement of statements) {
      await tx.execute(sql.raw(statement));
    }
  });
}

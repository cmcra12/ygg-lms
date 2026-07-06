import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// Conventions:
// - All money is stored as integer cents, ex-GST, with GST tracked in a separate
//   column per row (amounts are ex-GST unless a column says otherwise).
// - Dates are ISO "YYYY-MM-DD" strings; timestamps are ISO 8601 UTC strings.
//   Formatting to DD/MM/YYYY / Australia/Sydney happens in the display layer.

// ---------------------------------------------------------------------------
// Internal staff & auth
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "credit", "operations"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // random token
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// Parties & people
// ---------------------------------------------------------------------------

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(), // e.g. C10023
    name: text("name").notNull(),
    type: text("type", { enum: ["individual", "company"] }).notNull(),
    abn: text("abn"),
    acn: text("acn"),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    suburb: text("suburb"),
    state: text("state"),
    postcode: text("postcode"),
    status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("customers_name_idx").on(t.name)],
);

export const customerContacts = sqliteTable(
  "customer_contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    kind: text("kind", { enum: ["key", "authorised", "director_guarantor"] }).notNull(),
    name: text("name").notNull(),
    mobile: text("mobile"),
    email: text("email"),
    // Only meaningful for director guarantors — ID verification and credit
    // checks apply to them personally.
    idVerificationStatus: text("id_verification_status", {
      enum: ["not_required", "pending", "verified", "failed"],
    }).notNull().default("not_required"),
    creditCheckStatus: text("credit_check_status", {
      enum: ["not_required", "pending", "clear", "adverse"],
    }).notNull().default("not_required"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("customer_contacts_customer_idx").on(t.customerId)],
);

export const insurancePolicies = sqliteTable(
  "insurance_policies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    insurer: text("insurer").notNull(),
    policyNumber: text("policy_number").notNull(),
    expiryDate: text("expiry_date").notNull(),
    status: text("status", { enum: ["current", "expired", "cancelled"] }).notNull().default("current"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("insurance_policies_customer_idx").on(t.customerId)],
);

export const insurancePolicyAssets = sqliteTable(
  "insurance_policy_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    policyId: integer("policy_id").notNull().references(() => insurancePolicies.id),
    assetId: integer("asset_id").notNull().references(() => assets.id),
  },
  (t) => [uniqueIndex("insurance_policy_assets_uniq").on(t.policyId, t.assetId)],
);

export const externalParties = sqliteTable("external_parties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["broker", "vendor", "referrer", "aggregator"] }).notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  abn: text("abn"),
  bsb: text("bsb"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  accreditationStatus: text("accreditation_status", {
    enum: ["not_accredited", "pending", "accredited", "suspended"],
  }).notNull().default("not_accredited"),
  paidBefore: integer("paid_before", { mode: "boolean" }).notNull().default(false),
  // Brokers can sit under an aggregator, which is itself an external party.
  aggregatorId: integer("aggregator_id"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// Originations (schema in place for Phase 2)
// ---------------------------------------------------------------------------

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(), // e.g. APP-2026-0001
    customerId: integer("customer_id").notNull().references(() => customers.id),
    status: text("status", {
      enum: ["draft", "in_progress", "approved", "declined", "withdrawn", "converted"],
    }).notNull().default("draft"),
    source: text("source", { enum: ["broker", "direct", "referrer", "vendor"] }).notNull(),
    brokerId: integer("broker_id").references(() => externalParties.id),
    ownerId: integer("owner_id").references(() => users.id),
    // Deal snapshot — RR and ROI are set by YGG's external quote tools and
    // entered manually; this app never calculates them.
    dealValueExGstCents: integer("deal_value_ex_gst_cents"),
    rentalRatePercent: text("rental_rate_percent"), // decimal string, e.g. "3.25"
    roiPercent: text("roi_percent"),
    termMonths: integer("term_months"),
    brokerageExGstCents: integer("brokerage_ex_gst_cents"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("applications_customer_idx").on(t.customerId)],
);

export const applicationAssets = sqliteTable(
  "application_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => applications.id),
    assetId: integer("asset_id").notNull().references(() => assets.id),
  },
  (t) => [uniqueIndex("application_assets_uniq").on(t.applicationId, t.assetId)],
);

export const applicationChecklistItems = sqliteTable(
  "application_checklist_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id").notNull().references(() => applications.id),
    key: text("key").notNull(), // id_matrix, credit_check, info_agent, ppsr_search, ca_generated, contract_generated
    label: text("label").notNull(),
    status: text("status", { enum: ["pending", "in_progress", "done", "not_applicable"] })
      .notNull()
      .default("pending"),
    completedBy: integer("completed_by").references(() => users.id),
    completedAt: text("completed_at"),
    notes: text("notes"),
  },
  (t) => [index("application_checklist_app_idx").on(t.applicationId)],
);

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  template: text("template").notNull(), // template filename used
  entityType: text("entity_type").notNull(), // application | loan | customer
  entityId: integer("entity_id").notNull(),
  path: text("path").notNull(),
  generatedBy: integer("generated_by").references(() => users.id),
  generatedAt: text("generated_at").notNull(),
});

// ---------------------------------------------------------------------------
// Facilities & money
// ---------------------------------------------------------------------------

export const loans = sqliteTable(
  "loans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contractNumber: text("contract_number").notNull().unique(), // e.g. YGG-00042
    customerId: integer("customer_id").notNull().references(() => customers.id),
    // Exactly one loan per application.
    applicationId: integer("application_id").references(() => applications.id),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    termMonths: integer("term_months").notNull(),
    paymentFrequency: text("payment_frequency", {
      enum: ["weekly", "fortnightly", "monthly"],
    }).notNull(),
    status: text("status", { enum: ["active", "paid_out", "written_off"] })
      .notNull()
      .default("active"),
    arrears: integer("arrears", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("loans_customer_idx").on(t.customerId),
    uniqueIndex("loans_application_uniq").on(t.applicationId),
  ],
);

export const loanSchedules = sqliteTable(
  "loan_schedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    loanId: integer("loan_id").notNull().references(() => loans.id),
    code: text("code").notNull(), // RENT, DAMAGE WAIVER, ...
    amountExGstCents: integer("amount_ex_gst_cents").notNull(),
    gstCents: integer("gst_cents").notNull(),
    frequency: text("frequency", { enum: ["weekly", "fortnightly", "monthly"] }).notNull(),
    nextRunDate: text("next_run_date").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("loan_schedules_loan_idx").on(t.loanId)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    loanId: integer("loan_id").notNull().references(() => loans.id),
    date: text("date").notNull(),
    type: text("type", {
      enum: ["charge", "payment", "dishonour_fee", "upfront", "adjustment"],
    }).notNull(),
    // Sign convention: charges/fees are positive (owed to YGG), payments are
    // negative. Balance = sum of amounts including GST.
    amountExGstCents: integer("amount_ex_gst_cents").notNull(),
    gstCents: integer("gst_cents").notNull(),
    source: text("source", { enum: ["manual", "xero", "zepto"] }).notNull().default("manual"),
    reference: text("reference"),
    description: text("description"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("transactions_loan_idx").on(t.loanId), index("transactions_date_idx").on(t.date)],
);

export const directDebitAuthorities = sqliteTable("direct_debit_authorities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id").notNull().references(() => loans.id),
  accountName: text("account_name").notNull(),
  bsb: text("bsb").notNull(),
  accountNumber: text("account_number").notNull(),
  zeptoReference: text("zepto_reference"),
  status: text("status", { enum: ["pending", "active", "cancelled"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// Security & collateral
// ---------------------------------------------------------------------------

export const assets = sqliteTable(
  "assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    description: text("description").notNull(),
    category: text("category"), // e.g. Excavator, Prime Mover, Trailer
    vin: text("vin"),
    rego: text("rego"),
    serialNumber: text("serial_number"),
    valueExGstCents: integer("value_ex_gst_cents"),
    status: text("status", { enum: ["active", "paid_out", "sold"] }).notNull().default("active"),
    // Assets may move to a different loan only after the previous loan finished.
    customerId: integer("customer_id").references(() => customers.id),
    loanId: integer("loan_id").references(() => loans.id),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("assets_customer_idx").on(t.customerId),
    index("assets_loan_idx").on(t.loanId),
  ],
);

export const ppsrRegistrations = sqliteTable(
  "ppsr_registrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assetId: integer("asset_id").notNull().references(() => assets.id),
    registrationNumber: text("registration_number"),
    kind: text("kind", { enum: ["pmsi", "other"] }).notNull().default("pmsi"),
    registeredDate: text("registered_date"),
    expiryDate: text("expiry_date"),
    status: text("status", { enum: ["searched", "registered", "renewed", "discharged"] })
      .notNull()
      .default("searched"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("ppsr_registrations_asset_idx").on(t.assetId)],
);

export const ppsrEvents = sqliteTable(
  "ppsr_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id").notNull().references(() => ppsrRegistrations.id),
    event: text("event", { enum: ["searched", "registered", "renewed", "discharged"] }).notNull(),
    date: text("date").notNull(),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
  },
  (t) => [index("ppsr_events_registration_idx").on(t.registrationId)],
);

// ---------------------------------------------------------------------------
// Cross-cutting
// ---------------------------------------------------------------------------

// Immutable. Written only by the audited mutation layer (src/db/mutate.ts) —
// no screen or action may write to business tables except through it.
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    timestamp: text("timestamp").notNull(),
    actorId: integer("actor_id"),
    actorName: text("actor_name").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    action: text("action", { enum: ["create", "update", "delete"] }).notNull(),
    before: text("before"), // JSON snapshot, null on create
    after: text("after"), // JSON snapshot, null on delete
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_timestamp_idx").on(t.timestamp),
  ],
);

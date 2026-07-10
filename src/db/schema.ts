import { pgTable, text, integer, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";

// Conventions:
// - All money is stored as integer cents, ex-GST, with GST tracked in a separate
//   column per row (amounts are ex-GST unless a column says otherwise).
// - Dates are ISO "YYYY-MM-DD" strings; timestamps are ISO 8601 UTC strings.
//   Formatting to DD/MM/YYYY / Australia/Sydney happens in the display layer.

// ---------------------------------------------------------------------------
// Internal staff & auth
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "credit", "operations"] }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // random token
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// Parties & people
// ---------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const insurancePolicies = pgTable(
  "insurance_policies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    insurer: text("insurer").notNull(),
    policyNumber: text("policy_number").notNull(),
    expiryDate: text("expiry_date").notNull(),
    status: text("status", { enum: ["current", "expired", "cancelled"] }).notNull().default("current"),
    // When a renewal reminder was last sent to the client (HubSpot).
    lastNotifiedAt: text("last_notified_at"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("insurance_policies_customer_idx").on(t.customerId)],
);

export const insurancePolicyAssets = pgTable(
  "insurance_policy_assets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    policyId: integer("policy_id").notNull().references(() => insurancePolicies.id),
    assetId: integer("asset_id").notNull().references(() => assets.id),
  },
  (t) => [uniqueIndex("insurance_policy_assets_uniq").on(t.policyId, t.assetId)],
);

export const externalParties = pgTable("external_parties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
  paidBefore: boolean("paid_before").notNull().default(false),
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

export const applications = pgTable(
  "applications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
    // Business information from the YGG application form (YGG0094).
    tradingName: text("trading_name"),
    entityType: text("entity_type", {
      enum: ["pty_ltd", "limited", "sole_trader", "trust", "partnership"],
    }),
    trusteeType: text("trustee_type", { enum: ["company", "individual"] }),
    trusteeName: text("trustee_name"),
    yearsTrading: integer("years_trading"),
    natureOfBusiness: text("nature_of_business"), // e.g. Civil, Mining
    businessPhone: text("business_phone"),
    businessAddressLine1: text("business_address_line1"),
    businessSuburb: text("business_suburb"),
    businessState: text("business_state"),
    businessPostcode: text("business_postcode"),
    premises: text("premises", { enum: ["rent", "own"] }),
    employeesCount: integer("employees_count"),
    machinesInFleet: integer("machines_in_fleet"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("applications_customer_idx").on(t.customerId)],
);

// Applicant 1 / Applicant 2 from the YGG application form, including the
// personal assets & liabilities statement each applicant completes.
export const applicationApplicants = pgTable(
  "application_applicants",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    applicationId: integer("application_id").notNull().references(() => applications.id),
    position: integer("position").notNull(), // 1 or 2
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    surname: text("surname").notNull(),
    dateOfBirth: text("date_of_birth"),
    gender: text("gender", { enum: ["male", "female"] }),
    yearsIndustryExperience: integer("years_industry_experience"),
    cityCountryOfBirth: text("city_country_of_birth"),
    driversLicenceNo: text("drivers_licence_no"),
    driversLicenceExpiry: text("drivers_licence_expiry"),
    driversCardNo: text("drivers_card_no"),
    medicareNo: text("medicare_no"),
    medicarePosition: text("medicare_position"),
    medicareExpiry: text("medicare_expiry"),
    mobile: text("mobile"),
    email: text("email"),
    homeAddressLine1: text("home_address_line1"),
    homeSuburb: text("home_suburb"),
    homeState: text("home_state"),
    homePostcode: text("home_postcode"),
    homeOwnership: text("home_ownership", { enum: ["renting", "own"] }),
    previousAddress: text("previous_address"), // if at current address < 12 months
    privacyAcknowledged: boolean("privacy_acknowledged").notNull().default(false),
    // Personal assets & liabilities statement (totals; detail as free text).
    assetsDetail: text("assets_detail"),
    liabilitiesDetail: text("liabilities_detail"),
    totalAssetsCents: integer("total_assets_cents"),
    totalLiabilitiesCents: integer("total_liabilities_cents"),
    comments: text("comments"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("application_applicants_app_idx").on(t.applicationId)],
);

export const applicationAssets = pgTable(
  "application_assets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    applicationId: integer("application_id").notNull().references(() => applications.id),
    assetId: integer("asset_id").notNull().references(() => assets.id),
  },
  (t) => [uniqueIndex("application_assets_uniq").on(t.applicationId, t.assetId)],
);

export const applicationChecklistItems = pgTable(
  "application_checklist_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const loans = pgTable(
  "loans",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
    arrears: boolean("arrears").notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("loans_customer_idx").on(t.customerId),
    uniqueIndex("loans_application_uniq").on(t.applicationId),
  ],
);

export const loanSchedules = pgTable(
  "loan_schedules",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    loanId: integer("loan_id").notNull().references(() => loans.id),
    code: text("code").notNull(), // RENT, DAMAGE WAIVER, ...
    amountExGstCents: integer("amount_ex_gst_cents").notNull(),
    gstCents: integer("gst_cents").notNull(),
    frequency: text("frequency", { enum: ["weekly", "fortnightly", "monthly"] }).notNull(),
    nextRunDate: text("next_run_date").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("loan_schedules_loan_idx").on(t.loanId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const directDebitAuthorities = pgTable("direct_debit_authorities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const assets = pgTable(
  "assets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    description: text("description").notNull(),
    category: text("category"), // e.g. Excavator, Prime Mover, Trailer
    industry: text("industry"), // e.g. Civil & Construction, Mining, Transport
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

export const ppsrRegistrations = pgTable(
  "ppsr_registrations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

export const ppsrEvents = pgTable(
  "ppsr_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    registrationId: integer("registration_id").notNull().references(() => ppsrRegistrations.id),
    event: text("event", { enum: ["searched", "registered", "renewed", "discharged"] }).notNull(),
    date: text("date").notNull(),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
  },
  (t) => [index("ppsr_events_registration_idx").on(t.registrationId)],
);

// ---------------------------------------------------------------------------
// Workflows — instances of the templates in src/lib/workflows.ts, attached to
// an application (origination) or an account (collections / payout / returns).
// ---------------------------------------------------------------------------

export const workflows = pgTable(
  "workflows",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    templateKey: text("template_key").notNull(), // origination | collections | payout | returns
    description: text("description").notNull(), // template name at time of opening
    entityType: text("entity_type", { enum: ["application", "account"] }).notNull(),
    entityId: integer("entity_id").notNull(),
    status: text("status", { enum: ["open", "complete", "cancelled"] }).notNull().default("open"),
    allocatedTo: integer("allocated_to").references(() => users.id),
    openedBy: integer("opened_by").references(() => users.id),
    openedAt: text("opened_at").notNull(),
    completedAt: text("completed_at"),
  },
  (t) => [index("workflows_entity_idx").on(t.entityType, t.entityId)],
);

export const workflowItems = pgTable(
  "workflow_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    workflowId: integer("workflow_id").notNull().references(() => workflows.id),
    position: integer("position").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    kind: text("kind", { enum: ["task", "approval", "auto"] }).notNull().default("task"),
    note: text("note"),
    status: text("status", { enum: ["pending", "done", "skipped"] }).notNull().default("pending"),
    actionedBy: integer("actioned_by").references(() => users.id),
    actionedAt: text("actioned_at"),
  },
  (t) => [index("workflow_items_workflow_idx").on(t.workflowId)],
);

// ---------------------------------------------------------------------------
// Searches — PPSR, Equifax (title / name browse / credit) and court data.
// Every search run is saved here, linked to the customer it was run for.
// ---------------------------------------------------------------------------

export const searches = pgTable(
  "searches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: text("type", {
      enum: ["ppsr", "equifax_title", "equifax_name", "equifax_credit", "court"],
    }).notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    subject: text("subject").notNull(), // what was searched: name, VIN, address, company…
    result: text("result"), // summary of the provider response (stub or manual entry)
    reference: text("reference"), // provider reference number
    notes: text("notes"),
    runBy: integer("run_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("searches_customer_idx").on(t.customerId), index("searches_type_idx").on(t.type)],
);

// Free-text comments/notes staff leave against an entity (e.g. a collections
// case on an account). Distinct from the audit log, which is system-generated.
export const comments = pgTable(
  "comments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    entityType: text("entity_type").notNull(), // account | application | customer
    entityId: integer("entity_id").notNull(),
    body: text("body").notNull(),
    authorId: integer("author_id").references(() => users.id),
    authorName: text("author_name").notNull(), // snapshot of the author's name
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("comments_entity_idx").on(t.entityType, t.entityId)],
);

// ---------------------------------------------------------------------------
// Cross-cutting
// ---------------------------------------------------------------------------

// Immutable. Written only by the audited mutation layer (src/db/mutate.ts) —
// no screen or action may write to business tables except through it.
export const auditLog = pgTable(
  "audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

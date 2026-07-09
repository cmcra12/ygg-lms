// Workflow templates, transcribed from YGG's WORKFLOWS document. A workflow
// instance copies its template's steps; steps are actioned in order.
// kind: "task" is a normal step, "approval" is a review/sign-off gate,
// "auto" is a step the system performs (stubbed today).

export type WorkflowStepKind = "task" | "approval" | "auto";

export type WorkflowTemplate = {
  key: string;
  name: string;
  appliesTo: "application" | "account";
  steps: Array<{ key: string; label: string; kind: WorkflowStepKind; note?: string }>;
};

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  origination: {
    key: "origination",
    name: "Origination",
    appliesTo: "application",
    steps: [
      { key: "application_received", label: "New application received — data captured", kind: "task" },
      { key: "privacy_id_check", label: "Check privacy & ID documents", kind: "task" },
      {
        key: "run_searches",
        label: "Run searches",
        kind: "task",
        note: "Equifax credit/title/company, Court Data, PPSR, InfoAgent — plus manual Detective Desk / Google / NCI Link",
      },
      { key: "credit_assessment", label: "Generate credit assessment", kind: "task" },
      {
        key: "compile_information",
        label: "Request further information / compile & complete credit assessment",
        kind: "task",
      },
      {
        key: "credit_review",
        label: "Credit assessment submitted for review & decision",
        kind: "approval",
        note: "Approval gate — decision recorded with audit trail",
      },
      {
        key: "decision_email",
        label: "Template email to broker / end user (approved or declined)",
        kind: "task",
      },
      {
        key: "id_matrix_sms",
        label: "Trigger ID Matrix verification SMS (Equifax)",
        kind: "auto",
        note: "Stub today — sends on approval once the Equifax API is connected",
      },
      { key: "generate_agreement", label: "Generate rental agreement", kind: "task" },
      { key: "agreement_approval", label: "Agreement reviewed & approved to send", kind: "approval" },
      { key: "agreement_sent", label: "Agreement sent for signing (Secured Sign)", kind: "task" },
      { key: "settlement_docs", label: "Compile outstanding settlement documents", kind: "task" },
      {
        key: "settlement_signoff",
        label: "Settlement checklist & sign-off",
        kind: "approval",
        note: "Reviewed then signed off via Secured Sign",
      },
      { key: "settlement_accounts", label: "Settlement submitted to YGG Accounts", kind: "task" },
      { key: "countersign", label: "Counter sign rental agreement", kind: "task" },
      { key: "final_email", label: "Template email to broker / end user", kind: "task" },
      {
        key: "open_account",
        label: "Open account",
        kind: "auto",
        note: "Triggers PPSR registration, direct debit set-up and Xero recurring invoices",
      },
    ],
  },
  collections: {
    key: "collections",
    name: "Collections",
    appliesTo: "account",
    steps: [
      { key: "arrears_identified", label: "Arrears identified — missed direct debit", kind: "task" },
      { key: "dishonour_fee", label: "Apply dishonour fee to account", kind: "task" },
      { key: "first_contact", label: "Contact customer (call / SMS / email)", kind: "task" },
      { key: "arrangement", label: "Agree payment arrangement / re-debit date", kind: "task" },
      { key: "follow_up", label: "Monitor arrangement & follow up", kind: "task" },
      { key: "formal_notice", label: "Issue formal demand / default notice", kind: "approval" },
      {
        key: "escalation",
        label: "Escalate — repossession / legal / write-off decision",
        kind: "approval",
      },
      { key: "resolved", label: "Arrears resolved — clear arrears flag", kind: "task" },
    ],
  },
  payout: {
    key: "payout",
    name: "Payout",
    appliesTo: "account",
    steps: [
      { key: "quote_initiated", label: "Purchase quote initiated (external request)", kind: "task" },
      {
        key: "generate_quote",
        label: "Accounts generate purchase quote",
        kind: "task",
        note: "Decision tree — arrears? any reason a payout cannot be provided? notice period?",
      },
      { key: "doa_signoff", label: "DOA review and sign off purchase quote", kind: "approval" },
      { key: "issue_quote", label: "BDM issue quote to customer and discuss options", kind: "task" },
      {
        key: "payment_received",
        label: "Quote accepted — confirm payment received before expiry",
        kind: "task",
        note: "If the quote expires, close off the request instead",
      },
      { key: "final_invoice", label: "Send final invoice & contract finalisation confirmation", kind: "task" },
      {
        key: "lender_payout",
        label: "Request payout from lender; on receipt make payment & request their PPSR release",
        kind: "task",
      },
      { key: "release_ppsr", label: "Release PPSR within 5 days of receiving payment", kind: "task" },
      {
        key: "close_account",
        label: "Close account / update rent if assets remain",
        kind: "task",
        note: "Customer offboarding only where no other live contracts — release all PPSRs, remove alerts",
      },
    ],
  },
  returns: {
    key: "returns",
    name: "Returns",
    appliesTo: "account",
    steps: [
      { key: "return_initiated", label: "Voluntary return initiated", kind: "task" },
      { key: "check_terms", label: "Check minimum rental term & notice period per contract", kind: "task" },
      {
        key: "inspection",
        label: "Arrange off-hire inspection on site or advise return location",
        kind: "task",
      },
      { key: "stop_invoices", label: "Stop rental invoices and direct debits", kind: "task" },
      {
        key: "repairs",
        label: "Advise customer of repairs / cleaning",
        kind: "task",
        note: "Customer remediates within the agreed window, or YGG arranges and invoices",
      },
      { key: "finalisation", label: "Advise customer of contract finalisation", kind: "task" },
      {
        key: "disposal",
        label: "Facilitate disposal via retail / auction / remarketing",
        kind: "task",
      },
      { key: "release_ppsr", label: "Release PPSR once asset disposed; update Xero", kind: "task" },
    ],
  },
};

export const APPLICATION_TEMPLATES = Object.values(WORKFLOW_TEMPLATES).filter(
  (t) => t.appliesTo === "application",
);
export const ACCOUNT_TEMPLATES = Object.values(WORKFLOW_TEMPLATES).filter(
  (t) => t.appliesTo === "account",
);

/** finPOWER-style workflow number, e.g. 10001875. */
export function workflowCode(id: number): string {
  return String(10000000 + id);
}

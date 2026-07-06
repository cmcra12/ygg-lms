// One TypeScript interface per external service. The app only ever talks to
// these interfaces; the concrete driver (mock today, real API later) is picked
// by env config in src/integrations/index.ts. Every integration also has a
// manual-entry fallback in the UI so the app works end-to-end with zero
// credentials.

export interface XeroClient {
  /** Fetch receipted payments for reconciliation against a loan ledger. */
  fetchPayments(sinceIsoDate: string): Promise<
    Array<{ date: string; amountExGstCents: number; gstCents: number; reference: string }>
  >;
}

export interface ZeptoClient {
  /** Register a direct-debit authority; returns the Zepto reference. */
  registerDdr(input: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  }): Promise<{ reference: string; status: "pending" | "active" }>;
}

export interface PpsrClient {
  search(input: { vin?: string; serialNumber?: string }): Promise<{
    registrations: Array<{ registrationNumber: string; securedParty: string; expiryDate: string }>;
  }>;
  register(input: { assetId: number; kind: "pmsi" | "other" }): Promise<{
    registrationNumber: string;
    registeredDate: string;
    expiryDate: string;
  }>;
  discharge(registrationNumber: string): Promise<{ dischargedDate: string }>;
  renew(registrationNumber: string): Promise<{ expiryDate: string }>;
}

export interface CreditBureauClient {
  /** Equifax / illion company or individual credit check. */
  check(input: { name: string; abn?: string }): Promise<{
    score: number;
    result: "clear" | "adverse";
    reportUrl?: string;
  }>;
}

export interface InfoAgentClient {
  companyLookup(abn: string): Promise<{
    name: string;
    acn?: string;
    status: string;
    directors: string[];
  }>;
}

export interface IdVerificationClient {
  verify(input: { name: string; dateOfBirth?: string; licenceNumber?: string }): Promise<{
    result: "verified" | "failed";
    checkedAt: string;
  }>;
}

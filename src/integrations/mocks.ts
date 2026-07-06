import type {
  CreditBureauClient,
  IdVerificationClient,
  InfoAgentClient,
  PpsrClient,
  XeroClient,
  ZeptoClient,
} from "./types";

// Deterministic mock drivers so every workflow is demoable with no credentials.

export const mockXero: XeroClient = {
  async fetchPayments() {
    return [];
  },
};

export const mockZepto: ZeptoClient = {
  async registerDdr() {
    return { reference: `ZPT-MOCK-${Math.floor(Math.random() * 90000) + 10000}`, status: "pending" };
  },
};

export const mockPpsr: PpsrClient = {
  async search() {
    return { registrations: [] };
  },
  async register() {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 7);
    return {
      registrationNumber: `2026${String(Math.floor(Math.random() * 1e10)).padStart(10, "0")}`,
      registeredDate: now.toISOString().slice(0, 10),
      expiryDate: expiry.toISOString().slice(0, 10),
    };
  },
  async discharge() {
    return { dischargedDate: new Date().toISOString().slice(0, 10) };
  },
  async renew() {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 7);
    return { expiryDate: expiry.toISOString().slice(0, 10) };
  },
};

export const mockCreditBureau: CreditBureauClient = {
  async check() {
    return { score: 720, result: "clear" };
  },
};

export const mockInfoAgent: InfoAgentClient = {
  async companyLookup() {
    return { name: "Mock Company Pty Ltd", status: "Registered", directors: [] };
  },
};

export const mockIdVerification: IdVerificationClient = {
  async verify() {
    return { result: "verified", checkedAt: new Date().toISOString() };
  },
};

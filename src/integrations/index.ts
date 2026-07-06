import {
  mockCreditBureau,
  mockIdVerification,
  mockInfoAgent,
  mockPpsr,
  mockXero,
  mockZepto,
} from "./mocks";
import type {
  CreditBureauClient,
  IdVerificationClient,
  InfoAgentClient,
  PpsrClient,
  XeroClient,
  ZeptoClient,
} from "./types";

// Driver selection by env config. To swap in a real API: implement the
// interface in a new file (e.g. ./xero-real.ts), add a case here, and set the
// env var (e.g. XERO_DRIVER=real). Nothing else in the app changes.

function pick<T>(envVar: string | undefined, drivers: Record<string, T>): T {
  const name = envVar ?? "mock";
  const driver = drivers[name];
  if (!driver) throw new Error(`Unknown integration driver "${name}"`);
  return driver;
}

export const xero: XeroClient = pick(process.env.XERO_DRIVER, { mock: mockXero });
export const zepto: ZeptoClient = pick(process.env.ZEPTO_DRIVER, { mock: mockZepto });
export const ppsr: PpsrClient = pick(process.env.PPSR_DRIVER, { mock: mockPpsr });
export const creditBureau: CreditBureauClient = pick(process.env.CREDIT_BUREAU_DRIVER, {
  mock: mockCreditBureau,
});
export const infoAgent: InfoAgentClient = pick(process.env.INFO_AGENT_DRIVER, {
  mock: mockInfoAgent,
});
export const idVerification: IdVerificationClient = pick(process.env.ID_VERIFICATION_DRIVER, {
  mock: mockIdVerification,
});

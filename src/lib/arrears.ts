// Ages a rental account's ledger into "missed invoices" for the collections
// screen. Each charge (rent, damage waiver, dishonour fee, upfront) is an
// invoice; payments are allocated to the oldest invoices first (FIFO), so
// whatever is left uncovered is what the client is currently behind on.
//
// Amounts are ex GST throughout, matching the rest of the app.

export type LedgerTxn = {
  id: number;
  date: string; // YYYY-MM-DD
  type: string;
  amountExGstCents: number; // charges/fees positive, payments negative
  reference: string | null;
  description: string | null;
};

export type MissedInvoice = {
  date: string;
  reference: string | null;
  description: string | null;
  amountExGstCents: number; // the original invoice amount
  outstandingExGstCents: number; // still owed (may be partial if a payment part-covered it)
  daysOverdue: number;
};

export type ArrearsSummary = {
  outstandingExGstCents: number;
  missed: MissedInvoice[];
  firstMissedDate: string | null;
  daysSinceFirstMissed: number | null;
};

function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z");
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function computeArrears(txns: LedgerTxn[], today: string): ArrearsSummary {
  const sorted = [...txns].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id,
  );

  // Total received (all money in), then walk charges oldest → newest and cover
  // them off that pool. Charges still uncovered are the missed invoices.
  let paidPool = 0;
  for (const t of sorted) if (t.amountExGstCents < 0) paidPool += -t.amountExGstCents;

  const missed: MissedInvoice[] = [];
  for (const t of sorted) {
    if (t.amountExGstCents <= 0) continue; // only invoices/charges
    if (paidPool >= t.amountExGstCents) {
      paidPool -= t.amountExGstCents;
      continue;
    }
    const outstanding = t.amountExGstCents - paidPool;
    paidPool = 0;
    // Upfront that's still (partly) uncovered is genuinely owed, so keep it.
    missed.push({
      date: t.date,
      reference: t.reference,
      description: t.description,
      amountExGstCents: t.amountExGstCents,
      outstandingExGstCents: outstanding,
      daysOverdue: daysBetween(t.date, today),
    });
  }

  const outstandingExGstCents = missed.reduce((s, m) => s + m.outstandingExGstCents, 0);
  const firstMissedDate = missed[0]?.date ?? null;
  return {
    outstandingExGstCents,
    missed,
    firstMissedDate,
    daysSinceFirstMissed: firstMissedDate ? daysBetween(firstMissedDate, today) : null,
  };
}

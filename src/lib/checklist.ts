// The originations checklist every application starts with. Items with a
// `stub` are backed by a stubbed integration (run from the application screen)
// and can always be completed manually as the fallback.
export const DEFAULT_CHECKLIST: Array<{ key: string; label: string; stub?: string }> = [
  { key: "id_matrix", label: "ID matrix — verify director guarantors", stub: "ID verification" },
  { key: "credit_check", label: "Credit check (Equifax/illion)", stub: "credit bureau" },
  { key: "info_agent", label: "Info Agent company lookup", stub: "Info Agent" },
  { key: "ppsr_search", label: "PPSR search on assets", stub: "PPSR" },
  { key: "ca_generated", label: "Credit approval (CA) generated" },
  { key: "contract_generated", label: "Rental contract generated" },
];

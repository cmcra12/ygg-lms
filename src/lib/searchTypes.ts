// The saved-search types available from the Searches menu. Each runs against
// a stub provider today; the real PPSR/Equifax/court APIs slot in later.
export type SearchType = "ppsr" | "equifax_title" | "equifax_name" | "equifax_credit" | "court";

export const SEARCH_TYPES: Record<
  SearchType,
  { label: string; menuLabel: string; subjectLabel: string; subjectHint: string }
> = {
  ppsr: {
    label: "PPSR search",
    menuLabel: "PPSR",
    subjectLabel: "VIN / serial number / grantor",
    subjectHint: "e.g. 6F5000000MB472119 or company name",
  },
  equifax_title: {
    label: "Equifax title search (property)",
    menuLabel: "Equifax Title",
    subjectLabel: "Property address or title reference",
    subjectHint: "e.g. 12 Foundry Road, Botany NSW 2019",
  },
  equifax_name: {
    label: "Equifax personal name browse",
    menuLabel: "Equifax Name Browse",
    subjectLabel: "Person's full name",
    subjectHint: "e.g. Tony Rossi",
  },
  equifax_credit: {
    label: "Equifax credit search",
    menuLabel: "Equifax Credit",
    subjectLabel: "Company or person",
    subjectHint: "e.g. Harbour City Earthmoving Pty Ltd",
  },
  court: {
    label: "Court data search",
    menuLabel: "Court Data",
    subjectLabel: "Company or person",
    subjectHint: "e.g. Harbour City Earthmoving Pty Ltd",
  },
};

export const SEARCH_TYPE_KEYS = Object.keys(SEARCH_TYPES) as SearchType[];

// The saved-search types available from the Searches menu. Each runs against
// a stub provider today; the real PPSR/Equifax/court APIs slot in later.
export type SearchType = "ppsr" | "equifax_title" | "equifax_name" | "equifax_credit" | "court";

export const SEARCH_TYPES: Record<
  SearchType,
  {
    label: string;
    group: string;
    /** Short code shown on the launcher tile. */
    tile: string;
    description: string;
    subjectLabel: string;
    subjectHint: string;
  }
> = {
  ppsr: {
    label: "PPSR search",
    group: "PPSR",
    tile: "PPSR",
    description: "Personal Property Securities Register search on a VIN, serial number or grantor",
    subjectLabel: "VIN / serial number / grantor",
    subjectHint: "e.g. 6F5000000MB472119 or company name",
  },
  equifax_title: {
    label: "Equifax title search (property)",
    group: "Equifax",
    tile: "ET",
    description: "Property ownership and encumbrance search",
    subjectLabel: "Property address or title reference",
    subjectHint: "e.g. 12 Foundry Road, Botany NSW 2019",
  },
  equifax_name: {
    label: "Equifax personal name browse",
    group: "Equifax",
    tile: "NB",
    description: "Browse for individuals by name across Equifax records",
    subjectLabel: "Person's full name",
    subjectHint: "e.g. Tony Rossi",
  },
  equifax_credit: {
    label: "Equifax credit search",
    group: "Equifax",
    tile: "EC",
    description: "Commercial or consumer credit file search",
    subjectLabel: "Company or person",
    subjectHint: "e.g. Harbour City Earthmoving Pty Ltd",
  },
  court: {
    label: "Court data search",
    group: "Court data",
    tile: "CD",
    description: "Court judgments and proceedings search",
    subjectLabel: "Company or person",
    subjectHint: "e.g. Harbour City Earthmoving Pty Ltd",
  },
};

export const SEARCH_TYPE_KEYS = Object.keys(SEARCH_TYPES) as SearchType[];

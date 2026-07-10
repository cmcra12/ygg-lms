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
  }
> = {
  equifax_title: {
    label: "Land title search",
    group: "Land titles (Equifax)",
    tile: "TIT",
    description: "Property titles — search by name, title reference, address, lot/plan or document",
  },
  equifax_name: {
    label: "Personal name browse",
    group: "Equifax",
    tile: "NB",
    description: "Browse individuals by name and date of birth across Equifax records",
  },
  equifax_credit: {
    label: "Credit search",
    group: "Equifax",
    tile: "EC",
    description: "Commercial or consumer credit file search",
  },
  ppsr: {
    label: "PPSR search",
    group: "PPSR",
    tile: "PPSR",
    description: "Personal Property Securities Register — vehicles, grantors, registrations and more",
  },
  court: {
    label: "Court data search",
    group: "Court data",
    tile: "CD",
    description: "Court judgments and proceedings by individual or company / case title",
  },
};

export const SEARCH_TYPE_KEYS = Object.keys(SEARCH_TYPES) as SearchType[];

// The five ways to obtain a land title, per the Equifax titles product (screenshot).
export const TITLE_METHODS = [
  { key: "name", label: "Name Search" },
  { key: "title", label: "Title Search" },
  { key: "address", label: "Address Search" },
  { key: "lot_plan", label: "Lot Plan Search" },
  { key: "document", label: "Document Search" },
] as const;
export type TitleMethod = (typeof TITLE_METHODS)[number]["key"];

// PPSR search types (screenshot dropdown).
export const PPSR_SEARCH_TYPES = [
  { key: "motor_vehicle", label: "Motor Vehicle" },
  { key: "aircraft", label: "Aircraft" },
  { key: "individual_grantor", label: "Individual Grantor" },
  { key: "individual_grantor_date_range", label: "Individual Grantor Date Range" },
  { key: "intellectual_property", label: "Intellectual Property" },
  { key: "organisation_grantor", label: "Organisation Grantor" },
  { key: "organisation_grantor_date_range", label: "Organisation Grantor Date Range" },
  { key: "registration_number", label: "Registration Number" },
  { key: "watercraft", label: "Watercraft" },
] as const;
export type PpsrSearchType = (typeof PPSR_SEARCH_TYPES)[number]["key"];

// Serial-number based PPSR searches ask for a serial number + its type.
export const PPSR_SERIAL_TYPES = [
  { key: "vin", label: "VIN (Vehicle)" },
  { key: "chassis", label: "Chassis number" },
  { key: "manufacturer", label: "Manufacturer's number" },
  { key: "aircraft_msn", label: "Aircraft manufacturer's serial number" },
  { key: "hull", label: "Watercraft hull ID (HIN)" },
] as const;

export const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { SEARCH_TYPES, TITLE_METHODS, type SearchType, type TitleMethod } from "@/lib/searchTypes";
import { PageHeader } from "@/components/ui";
import { SearchForm } from "../SearchForm";
import { runSearch } from "../actions";

export default async function NewSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; method?: string; customerId?: string }>;
}) {
  const { type, method, customerId } = await searchParams;
  const initialType: SearchType = type && type in SEARCH_TYPES ? (type as SearchType) : "equifax_title";
  const initialMethod = TITLE_METHODS.some((m) => m.key === method) ? (method as TitleMethod) : undefined;

  const customerOptions = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.status, "active"))
    .orderBy(asc(customers.name));

  return (
    <>
      <PageHeader title="New search" subtitle={SEARCH_TYPES[initialType].label} />
      <SearchForm
        action={runSearch}
        initialType={initialType}
        initialMethod={initialMethod}
        initialCustomerId={customerId ? Number(customerId) : undefined}
        customers={customerOptions}
      />
    </>
  );
}

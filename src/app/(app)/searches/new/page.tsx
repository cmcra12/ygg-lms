import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { SEARCH_TYPES, type SearchType } from "@/lib/searchTypes";
import { PageHeader } from "@/components/ui";
import { SearchForm } from "../SearchForm";
import { runSearch } from "../actions";

export default async function NewSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; customerId?: string }>;
}) {
  const { type, customerId } = await searchParams;
  const initialType: SearchType = type && type in SEARCH_TYPES ? (type as SearchType) : "ppsr";

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
        initialCustomerId={customerId ? Number(customerId) : undefined}
        customers={customerOptions}
      />
    </>
  );
}

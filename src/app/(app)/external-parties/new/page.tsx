import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { externalParties } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ExternalPartyForm } from "../ExternalPartyForm";
import { saveExternalParty } from "../actions";

export default async function NewExternalPartyPage() {
  const aggregators = await db
    .select({ id: externalParties.id, name: externalParties.name })
    .from(externalParties)
    .where(eq(externalParties.type, "aggregator"))
    .orderBy(asc(externalParties.name))
    ;

  return (
    <>
      <PageHeader title="New external party" />
      <ExternalPartyForm
        action={saveExternalParty.bind(null, null)}
        aggregators={aggregators}
        cancelHref="/external-parties"
      />
    </>
  );
}

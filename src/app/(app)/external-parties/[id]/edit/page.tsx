import { notFound } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { externalParties } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ExternalPartyForm } from "../../ExternalPartyForm";
import { saveExternalParty } from "../../actions";

export default async function EditExternalPartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partyId = Number(id);
  const [party] = await db.select().from(externalParties).where(eq(externalParties.id, partyId));
  if (!party) notFound();

  const aggregators = await db
    .select({ id: externalParties.id, name: externalParties.name })
    .from(externalParties)
    .where(and(eq(externalParties.type, "aggregator"), ne(externalParties.id, partyId)))
    .orderBy(asc(externalParties.name))
    ;

  return (
    <>
      <PageHeader title={`Edit ${party.name}`} />
      <ExternalPartyForm
        action={saveExternalParty.bind(null, partyId)}
        initial={party}
        aggregators={aggregators}
        cancelHref={`/external-parties/${partyId}`}
      />
    </>
  );
}

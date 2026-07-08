import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ApplicantForm } from "../../../ApplicantForm";
import { saveApplicant } from "../../../actions";

export default async function NewApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicationId = Number(id);
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) notFound();

  return (
    <>
      <PageHeader title={`Add applicant — ${application.reference}`} />
      <ApplicantForm
        action={saveApplicant.bind(null, applicationId, null)}
        cancelHref={`/applications/${applicationId}?tab=applicants`}
      />
    </>
  );
}

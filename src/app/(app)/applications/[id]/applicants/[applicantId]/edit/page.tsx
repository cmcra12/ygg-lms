import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationApplicants, applications } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ApplicantForm } from "../../../../ApplicantForm";
import { saveApplicant } from "../../../../actions";

export default async function EditApplicantPage({
  params,
}: {
  params: Promise<{ id: string; applicantId: string }>;
}) {
  const { id, applicantId } = await params;
  const applicationId = Number(id);
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  const [applicant] = await db
    .select()
    .from(applicationApplicants)
    .where(
      and(
        eq(applicationApplicants.id, Number(applicantId)),
        eq(applicationApplicants.applicationId, applicationId),
      ),
    );
  if (!application || !applicant) notFound();

  return (
    <>
      <PageHeader
        title={`Applicant ${applicant.position} — ${applicant.firstName} ${applicant.surname}`}
        subtitle={application.reference}
      />
      <ApplicantForm
        action={saveApplicant.bind(null, applicationId, applicant.id)}
        initial={applicant}
        cancelHref={`/applications/${applicationId}?tab=applicants`}
      />
    </>
  );
}

import "server-only";

// HubSpot integration for client notifications. Sends a pre-built HubSpot email
// template (single-send transactional email) to a client, with the merge fields
// the template expects filled from our data.
//
// Configured entirely by environment variables so no secrets live in the repo:
//   HUBSPOT_ACCESS_TOKEN         private-app token with transactional-email scope
//   HUBSPOT_INSURANCE_EMAIL_ID   numeric id of the saved single-send email
//
// With neither set the function runs in stub mode: it sends nothing and returns
// a clearly-labelled stub result, so the button works in a demo without a
// HubSpot account (the same pattern as the credit / PPSR / Info Agent stubs).

export type HubspotSendResult = {
  ok: boolean;
  stub: boolean;
  message: string;
};

export type InsuranceReminder = {
  toEmail: string | null;
  contactName: string | null;
  companyName: string;
  insurer: string;
  policyNumber: string;
  expiryDate: string; // DD/MM/YYYY for display in the email
};

const SINGLE_SEND_URL = "https://api.hubapi.com/marketing/v3/transactional/single-email/send";

export async function sendInsuranceExpiryEmail(reminder: InsuranceReminder): Promise<HubspotSendResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const emailId = process.env.HUBSPOT_INSURANCE_EMAIL_ID;

  if (!token || !emailId) {
    return {
      ok: true,
      stub: true,
      message: `Stub: no HubSpot credentials set — would send the insurance-renewal template to ${reminder.toEmail ?? reminder.companyName}.`,
    };
  }

  if (!reminder.toEmail) {
    return { ok: false, stub: false, message: "No email address on file for this client." };
  }

  try {
    const res = await fetch(SINGLE_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailId: Number(emailId),
        message: { to: reminder.toEmail },
        // Merge fields the HubSpot template can reference as {{ custom.* }}.
        customProperties: {
          company_name: reminder.companyName,
          contact_name: reminder.contactName ?? reminder.companyName,
          insurer: reminder.insurer,
          policy_number: reminder.policyNumber,
          expiry_date: reminder.expiryDate,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, stub: false, message: `HubSpot returned ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true, stub: false, message: `Renewal reminder sent to ${reminder.toEmail} via HubSpot.` };
  } catch (err) {
    return { ok: false, stub: false, message: `Could not reach HubSpot: ${(err as Error).message}` };
  }
}

"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type ApplicantValues = {
  firstName?: string;
  middleName?: string | null;
  surname?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  yearsIndustryExperience?: number | null;
  cityCountryOfBirth?: string | null;
  driversLicenceNo?: string | null;
  driversLicenceExpiry?: string | null;
  driversCardNo?: string | null;
  medicareNo?: string | null;
  medicarePosition?: string | null;
  medicareExpiry?: string | null;
  mobile?: string | null;
  email?: string | null;
  homeAddressLine1?: string | null;
  homeSuburb?: string | null;
  homeState?: string | null;
  homePostcode?: string | null;
  homeOwnership?: string | null;
  previousAddress?: string | null;
  privacyAcknowledged?: boolean;
  assetsDetail?: string | null;
  liabilitiesDetail?: string | null;
  totalAssetsCents?: number | null;
  totalLiabilitiesCents?: number | null;
  comments?: string | null;
};

const STATES = ["", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="sm:col-span-2 border-b border-slate-200 pb-1 pt-2 text-sm font-bold uppercase tracking-wide text-ygg-600">
      {children}
    </h2>
  );
}

export function ApplicantForm({
  action,
  initial = {},
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: ApplicantValues;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save applicant" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionHeading>Applicant details</SectionHeading>
        <div>
          <label className="field-label">First name *</label>
          <input name="firstName" required defaultValue={initial.firstName ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Middle name</label>
          <input name="middleName" defaultValue={initial.middleName ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Surname *</label>
          <input name="surname" required defaultValue={initial.surname ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Date of birth</label>
          <input name="dateOfBirth" type="date" defaultValue={initial.dateOfBirth ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Gender</label>
          <select name="gender" defaultValue={initial.gender ?? ""} className="field-input">
            <option value="">— Select —</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="field-label">Years of industry experience</label>
          <input
            name="yearsIndustryExperience"
            defaultValue={
              initial.yearsIndustryExperience != null ? String(initial.yearsIndustryExperience) : ""
            }
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">City and country of birth</label>
          <input name="cityCountryOfBirth" defaultValue={initial.cityCountryOfBirth ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Mobile / phone</label>
          <input name="mobile" defaultValue={initial.mobile ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" defaultValue={initial.email ?? ""} className="field-input" />
        </div>

        <SectionHeading>Identification</SectionHeading>
        <div>
          <label className="field-label">Drivers licence no.</label>
          <input name="driversLicenceNo" defaultValue={initial.driversLicenceNo ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Licence expiry date</label>
          <input
            name="driversLicenceExpiry"
            type="date"
            defaultValue={initial.driversLicenceExpiry ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Drivers card no.</label>
          <input name="driversCardNo" defaultValue={initial.driversCardNo ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Medicare card no.</label>
          <input name="medicareNo" defaultValue={initial.medicareNo ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Position on card</label>
          <input name="medicarePosition" defaultValue={initial.medicarePosition ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Medicare expiry date</label>
          <input
            name="medicareExpiry"
            type="date"
            defaultValue={initial.medicareExpiry ?? ""}
            className="field-input"
          />
        </div>

        <SectionHeading>Home address</SectionHeading>
        <div className="sm:col-span-2">
          <label className="field-label">Home address</label>
          <input name="homeAddressLine1" defaultValue={initial.homeAddressLine1 ?? ""} className="field-input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Suburb</label>
            <input name="homeSuburb" defaultValue={initial.homeSuburb ?? ""} className="field-input" />
          </div>
          <div>
            <label className="field-label">State</label>
            <select name="homeState" defaultValue={initial.homeState ?? ""} className="field-input">
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s || "—"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Postcode</label>
            <input name="homePostcode" defaultValue={initial.homePostcode ?? ""} className="field-input" />
          </div>
        </div>
        <div>
          <label className="field-label">Renting or own home</label>
          <select name="homeOwnership" defaultValue={initial.homeOwnership ?? ""} className="field-input">
            <option value="">— Select —</option>
            <option value="renting">Renting</option>
            <option value="own">Own home</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Previous home address (if at current address less than 12 months)</label>
          <input name="previousAddress" defaultValue={initial.previousAddress ?? ""} className="field-input" />
        </div>

        <SectionHeading>Personal assets &amp; liabilities statement</SectionHeading>
        <div>
          <label className="field-label">Assets (residence, properties, vehicles, cash/shares)</label>
          <textarea
            name="assetsDetail"
            rows={4}
            defaultValue={initial.assetsDetail ?? ""}
            className="field-input"
            placeholder={"e.g. Home — 12 Foundry Rd, Botany: $1,100,000\nToyota Hilux 2022: $48,000"}
          />
        </div>
        <div>
          <label className="field-label">Liabilities (home loan, property loans, vehicle finance, other)</label>
          <textarea
            name="liabilitiesDetail"
            rows={4}
            defaultValue={initial.liabilitiesDetail ?? ""}
            className="field-input"
            placeholder={"e.g. CBA home loan: $620,000\nCredit card limit: $15,000"}
          />
        </div>
        <div>
          <label className="field-label">Total assets ($)</label>
          <input
            name="totalAssets"
            defaultValue={initial.totalAssetsCents != null ? (initial.totalAssetsCents / 100).toFixed(2) : ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Total liabilities ($)</label>
          <input
            name="totalLiabilities"
            defaultValue={
              initial.totalLiabilitiesCents != null ? (initial.totalLiabilitiesCents / 100).toFixed(2) : ""
            }
            className="field-input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Comments</label>
          <textarea name="comments" rows={2} defaultValue={initial.comments ?? ""} className="field-input" />
        </div>
        <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input
            id="privacyAcknowledged"
            name="privacyAcknowledged"
            type="checkbox"
            defaultChecked={initial.privacyAcknowledged ?? false}
            className="mt-0.5 h-4 w-4 accent-ygg-400"
          />
          <label htmlFor="privacyAcknowledged" className="text-sm text-slate-700">
            Privacy acknowledgment received — the applicant has read Yellowgate Group&apos;s Credit
            Reporting Policy and authorised YGG to access consumer and commercial credit files.
          </label>
        </div>
      </div>
    </FormFrame>
  );
}

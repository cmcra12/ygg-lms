// Creates the starter .docx templates in templates/ with {placeholder} fields.
// The generated files are ordinary Word documents — open them in Word, restyle
// or reword them freely, and keep the {placeholders} where values should go.
// Run: npx tsx scripts/make-templates.ts
import fs from "node:fs";
import PizZip from "pizzip";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraph(text: string, opts: { bold?: boolean; size?: number } = {}): string {
  const rPr = `<w:rPr>${opts.bold ? "<w:b/>" : ""}${opts.size ? `<w:sz w:val="${opts.size * 2}"/>` : ""}</w:rPr>`;
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function buildDocx(lines: Array<string | { text: string; bold?: boolean; size?: number }>): Buffer {
  const body = lines
    .map((l) => (typeof l === "string" ? paragraph(l) : paragraph(l.text, l)))
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}<w:sectPr/></w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );
  zip.file("word/document.xml", documentXml);
  return zip.generate({ type: "nodebuffer" });
}

fs.mkdirSync("templates", { recursive: true });

fs.writeFileSync(
  "templates/credit-approval.docx",
  buildDocx([
    { text: "YELLOWGATE GROUP", bold: true, size: 18 },
    { text: "CREDIT APPROVAL", bold: true, size: 14 },
    "",
    "Date: {generated_date}",
    "Application: {application_reference}",
    "Prepared by: {generated_by}",
    "",
    { text: "Customer", bold: true },
    "{customer_name}",
    "ABN: {customer_abn}   ACN: {customer_acn}",
    "{customer_address}",
    "",
    { text: "Assets", bold: true },
    "{#assets}",
    "• {description} — VIN {vin} / Rego {rego} / Serial {serial} — {value_ex_gst} ex GST",
    "{/assets}",
    "",
    { text: "Deal", bold: true },
    "Total value (ex GST): {deal_value}",
    "Rental rate (RR): {rr}%",
    "Return on investment (ROI): {roi}%",
    "Term: {term_months} months",
    "Brokerage (ex GST): {brokerage}",
    "Introduced by: {broker_name}",
    "",
    "Approval is subject to Yellowgate Group's standard settlement conditions,",
    "satisfactory PPSR position and execution of the rental agreement.",
    "",
    "Approved by: ______________________    Date: ____________",
  ]),
);

fs.writeFileSync(
  "templates/rental-contract.docx",
  buildDocx([
    { text: "YELLOWGATE GROUP", bold: true, size: 18 },
    { text: "EQUIPMENT RENTAL AGREEMENT", bold: true, size: 14 },
    "",
    "Agreement date: {generated_date}",
    "Application: {application_reference}",
    "",
    { text: "The Renter", bold: true },
    "{customer_name} (ABN {customer_abn})",
    "{customer_address}",
    "",
    { text: "The Owner", bold: true },
    "Yellowgate Group Pty Ltd",
    "",
    { text: "Schedule 1 — Rented Equipment", bold: true },
    "{#assets}",
    "• {description} — VIN {vin} / Rego {rego} / Serial {serial}",
    "{/assets}",
    "",
    { text: "Schedule 2 — Payment Terms", bold: true },
    "Equipment value (ex GST): {deal_value}",
    "Term: {term_months} months",
    "Rental rate (RR): {rr}% per month of equipment value, plus GST",
    "",
    "The Renter agrees to rent the equipment listed in Schedule 1 on Yellowgate",
    "Group's standard rental terms and conditions, which form part of this",
    "agreement.",
    "",
    "Signed for the Renter: ______________________    Date: ____________",
    "",
    "Signed for Yellowgate Group: ______________________    Date: ____________",
  ]),
);

console.log("Templates written to templates/credit-approval.docx and templates/rental-contract.docx");

import "server-only";
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

// Fills a .docx template from templates/ with {placeholder} data and returns
// the generated file. Templates are ordinary Word documents the team edits
// directly — see templates/README.md for the available placeholders.
export function renderDocx(templateFile: string, data: Record<string, unknown>): Buffer {
  const templatePath = path.join(process.cwd(), "templates", templateFile);
  const zip = new PizZip(fs.readFileSync(templatePath));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "—",
  });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

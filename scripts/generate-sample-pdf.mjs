import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const lines = [
  "FIRST NATIONAL BANK",
  "Employment Verification Letter",
  "",
  "Date: 10 April 2024",
  "Employee Name: John Smith",
  "Account Number on file: 1234567890",
  "Employer: Northshore Retail Group",
  "Job Title: Store Manager",
  "Employment Start Date: 03 June 2019",
  "Annual Base Salary: $80,000",
  "Employment Status: Full-time, active",
  "",
  "This letter confirms employment for lending review.",
  "Tax Identification Number: Not on file",
];

function writePdf(filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(16).text(lines[0]);
    doc.moveDown(0.4);
    doc.fontSize(12);
    for (const line of lines.slice(1)) {
      doc.text(line || " ");
    }
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

const packDir = path.join(root, "sample-documents");
fs.mkdirSync(packDir, { recursive: true });
const out = path.join(packDir, "04_employment_verification.pdf");
await writePdf(out);

const legacyDir = path.join(root, "samples");
if (fs.existsSync(legacyDir)) {
  await writePdf(path.join(legacyDir, "employment_verification.pdf"));
}

console.log(`Wrote ${out}`);

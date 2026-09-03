import { describe, expect, it } from "vitest";
import { fingerprintOutput, MockProvider } from "../src/ai/MockProvider.js";
import type { DocumentInput } from "../src/types/index.js";

const documents: DocumentInput[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "account_statement_q1.txt",
    text: [
      "Customer Name: John Smith",
      "Account Number: 1234567890",
      "Closing Balance: $50,000.00",
      "Address on File: 14 Maple Street, Boston, MA 02108",
    ].join("\n"),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "kyc_profile.txt",
    text: [
      "KYC CUSTOMER PROFILE",
      "Full Legal Name: Jon Smith",
      "Account Number: 1234567891",
      "Residential Address: 88 Harbor Avenue, Cambridge, MA 02139",
      "Annual Income Declared: $120,000",
      "Employment: Not provided",
      "Tax Identification Number: Not on file",
    ].join("\n"),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "loan_application.csv",
    text: [
      "field,value",
      "applicant_name,John Smith",
      "account_number,1234567890",
      "stated_annual_income,80000",
      "employer,",
      "tax_id,",
    ].join("\n"),
  },
];

describe("MockProvider", () => {
  const provider = new MockProvider();

  it("returns grounded, deterministic findings with source documents", async () => {
    const first = await provider.analyze("Compare identity and income.", documents);
    const second = await provider.analyze("Compare identity and income.", documents);

    expect(fingerprintOutput(first)).toBe(fingerprintOutput(second));

    const allowedIds = new Set(documents.map((doc) => doc.id));
    const allowedNames = new Set(documents.map((doc) => doc.name));

    for (const fact of first.keyFacts) {
      expect(allowedIds.has(fact.source.documentId)).toBe(true);
      expect(allowedNames.has(fact.source.documentName)).toBe(true);
    }

    const accountDiscrepancy = first.discrepancies.find((item) =>
      item.field.includes("account"),
    );
    expect(accountDiscrepancy).toBeTruthy();
    expect(accountDiscrepancy!.values.map((item) => item.value).sort()).toEqual([
      "1234567890",
      "1234567891",
    ]);

    const invented = [...first.keyFacts, ...first.missingInformation].some((item) =>
      /999-00-0000|secret bonus|offshore/i.test(item.text),
    );
    expect(invented).toBe(false);
    expect(first.summary).toMatch(/3 documents/);
    expect(first.missingInformation.length).toBeGreaterThan(0);
  });
});

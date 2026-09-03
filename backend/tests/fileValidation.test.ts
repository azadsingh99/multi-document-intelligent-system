import { describe, expect, it } from "vitest";
import {
  detectKind,
  FileValidationError,
  secureStoredName,
} from "../src/services/fileValidation.js";

describe("fileValidation", () => {
  it("accepts a PDF with a valid header and rejects unsupported or binary files", () => {
    const pdf = Buffer.from("%PDF-1.4 fake-body");
    expect(detectKind("statement.pdf", pdf)).toBe("pdf");

    expect(() => detectKind("photo.png", Buffer.from("png"))).toThrow(FileValidationError);
    expect(() => detectKind("notes.txt", Buffer.from([0x00, 0x01, 0x02]))).toThrow(
      FileValidationError,
    );
    expect(() => detectKind("empty.txt", Buffer.from(""))).toThrow(FileValidationError);
    expect(() => detectKind("spoof.pdf", Buffer.from("not-a-pdf"))).toThrow(FileValidationError);
  });

  it("builds a path-safe stored filename", () => {
    const stored = secureStoredName("..\\..\\secret loan (draft).PDF");
    expect(stored.toLowerCase().endsWith(".pdf")).toBe(true);
    expect(stored).not.toMatch(/[\\/]/);
    expect(stored).not.toContain("..");
    expect(stored).toMatch(/secret_loan_draft/i);
  });
});

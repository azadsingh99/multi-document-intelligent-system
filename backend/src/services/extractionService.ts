import { extractText as extractPdfText } from "unpdf";
import { FileValidationError } from "./fileValidation.js";

export async function extractText(
  kind: "pdf" | "csv" | "txt",
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  if (kind === "pdf") {
    try {
      const result = await extractPdfText(new Uint8Array(buffer), { mergePages: true });
      const text = (typeof result.text === "string" ? result.text : result.text.join("\n"))
        .replace(/\u0000/g, "")
        .trim();
      if (!text) {
        throw new FileValidationError(
          `"${originalName}" is a PDF with no extractable text.`,
        );
      }
      return text;
    } catch (error) {
      if (error instanceof FileValidationError) throw error;
      throw new FileValidationError(`Could not read PDF "${originalName}". The file may be corrupt.`);
    }
  }

  const text = buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new FileValidationError(`"${originalName}" contains no readable text.`);
  }
  return text;
}

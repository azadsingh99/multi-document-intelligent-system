import { config } from "dotenv";
import { resolve, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(here, "../../../.env") });
config({ path: resolve(here, "../../.env") });

function requiredNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  port: requiredNumber(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://mdis:mdis_dev_password@localhost:5432/mdis",
  maxFileSizeMb: requiredNumber(process.env.MAX_FILE_SIZE_MB, 10),
  maxFilesPerUpload: requiredNumber(process.env.MAX_FILES_PER_UPLOAD, 10),
  uploadDir: (() => {
    const configured = process.env.UPLOAD_DIR ?? "uploads";
    return isAbsolute(configured) ? configured : resolve(here, "../../..", configured);
  })(),
  aiProvider: (process.env.AI_PROVIDER ?? "mock").toLowerCase(),
  grokApiKey: process.env.GROK_API_KEY ?? process.env.XAI_API_KEY ?? "",
  grokModel: process.env.GROK_MODEL ?? "grok-3-latest",
  grokBaseUrl: process.env.GROK_BASE_URL ?? "https://api.x.ai/v1",
};

export function maxFileSizeBytes(): number {
  return env.maxFileSizeMb * 1024 * 1024;
}

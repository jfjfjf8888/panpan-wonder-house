import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  GAME_ORIGIN: z.string().url().default("http://localhost:9000"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  CSRF_SECRET: z.string().min(16),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(6),
  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_GAMES: z.string().min(1),
  S3_BUCKET_UPLOADS: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  ADS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  ANALYTICS_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(120),
  LOGIN_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(10),
  ANALYTICS_EVENT_RETENTION_DAYS: z.coerce.number().default(90),
  ERROR_LOG_RETENTION_DAYS: z.coerce.number().default(180),
  UPLOAD_TEMP_RETENTION_HOURS: z.coerce.number().default(24),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${message}`);
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    return getEnv()[prop];
  },
});

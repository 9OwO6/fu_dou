export const environmentKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "ORDER_EMAIL_FROM",
  "ORDER_NOTIFICATION_EMAIL",
  "ORDER_RATE_LIMIT_SECRET",
] as const;

export type EnvironmentKey = (typeof environmentKeys)[number];
export type EnvironmentSource = Partial<Record<EnvironmentKey, string | undefined>>;

export class EnvironmentValidationError extends Error {
  readonly missingKeys: readonly EnvironmentKey[];

  constructor(missingKeys: readonly EnvironmentKey[]) {
    super(`缺少必需环境变量：${missingKeys.join(", ")}。请参考 .env.example 配置。`);
    this.name = "EnvironmentValidationError";
    this.missingKeys = missingKeys;
  }
}

export function validateEnvironment(source: EnvironmentSource): Record<EnvironmentKey, string>;
export function validateEnvironment<const RequiredKeys extends readonly EnvironmentKey[]>(
  source: EnvironmentSource,
  requiredKeys: RequiredKeys,
): Record<RequiredKeys[number], string>;
export function validateEnvironment(
  source: EnvironmentSource,
  requiredKeys: readonly EnvironmentKey[] = environmentKeys,
) {
  const missingKeys = requiredKeys.filter((key) => !source[key]?.trim());

  if (missingKeys.length > 0) {
    throw new EnvironmentValidationError(missingKeys);
  }

  return Object.fromEntries(
    requiredKeys.map((key) => [key, source[key]!.trim()]),
  );
}

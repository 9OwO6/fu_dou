export const supportedLocales = ["zh"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "zh";

export function isSupportedLocale(locale: string): locale is AppLocale {
  return supportedLocales.some((supportedLocale) => supportedLocale === locale);
}

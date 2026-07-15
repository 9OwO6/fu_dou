export const supportedLocales = ["en", "zh"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en";

export function isSupportedLocale(locale: string): locale is AppLocale {
  return supportedLocales.some((supportedLocale) => supportedLocale === locale);
}

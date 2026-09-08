import { isSupportedCountry, type Country } from "react-phone-number-input";

export function supportedPhoneCountry(value: string | null | undefined) {
  return value && isSupportedCountry(value) ? (value as Country) : undefined;
}

export function countryFromLocales(locales: readonly string[]) {
  for (const locale of locales) {
    try {
      const country = supportedPhoneCountry(
        new Intl.Locale(locale).region?.toUpperCase(),
      );
      if (country) return country;
    } catch {
      // Ignore malformed browser locale values and try the next one.
    }
  }
  return undefined;
}

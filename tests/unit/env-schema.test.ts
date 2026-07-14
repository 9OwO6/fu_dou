import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  validateEnvironment,
} from "@/lib/env/schema";

describe("validateEnvironment", () => {
  it("returns trimmed values for the requested keys", () => {
    expect(
      validateEnvironment(
        { NEXT_PUBLIC_SITE_URL: " https://example.test " },
        ["NEXT_PUBLIC_SITE_URL"],
      ),
    ).toEqual({ NEXT_PUBLIC_SITE_URL: "https://example.test" });
  });

  it("reports missing key names without exposing configured values", () => {
    const configuredSecret = "must-not-appear-in-errors";

    expect(() =>
      validateEnvironment(
        {
          SUPABASE_SECRET_KEY: configuredSecret,
          RESEND_API_KEY: "   ",
        },
        ["SUPABASE_SECRET_KEY", "RESEND_API_KEY"],
      ),
    ).toThrowError(EnvironmentValidationError);

    try {
      validateEnvironment(
        {
          SUPABASE_SECRET_KEY: configuredSecret,
          RESEND_API_KEY: "",
        },
        ["SUPABASE_SECRET_KEY", "RESEND_API_KEY"],
      );
    } catch (error) {
      expect(String(error)).toContain("RESEND_API_KEY");
      expect(String(error)).not.toContain(configuredSecret);
    }
  });
});

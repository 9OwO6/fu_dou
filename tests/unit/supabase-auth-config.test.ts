import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const configPath = fileURLToPath(new URL("../../supabase/config.toml", import.meta.url));
const config = readFileSync(configPath, "utf8");

describe("Supabase local Auth configuration", () => {
  it("blocks account creation globally", () => {
    const authSection = config.match(/\[auth\]\s+([\s\S]*?)(?=\n\[)/)?.[1];

    expect(authSection).toMatch(/\benable_signup\s*=\s*false\b/);
    expect(authSection).toMatch(/\benable_anonymous_sign_ins\s*=\s*false\b/);
  });

  it("keeps the email provider available for existing administrators", () => {
    const emailSection = config.match(/\[auth\.email\]\s+([\s\S]*?)(?=\n\[)/)?.[1];

    expect(emailSection).toMatch(/\benable_signup\s*=\s*true\b/);
  });
});

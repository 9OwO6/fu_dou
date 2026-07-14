import { describe, expect, it } from "vitest";

import { parseLoginCredentials } from "@/lib/auth/credentials";

describe("parseLoginCredentials", () => {
  it("normalizes a valid email without changing the password", () => {
    const formData = new FormData();
    formData.set("email", " Admin@Example.COM ");
    formData.set("password", "Secret-Value");

    expect(parseLoginCredentials(formData)).toEqual({
      email: "admin@example.com",
      password: "Secret-Value",
    });
  });

  it("rejects malformed or undersized credentials", () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "12345");

    expect(parseLoginCredentials(formData)).toBeNull();
  });
});

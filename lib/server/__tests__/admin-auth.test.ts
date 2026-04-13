import { describe, expect, it } from "vitest";

import {
  createAdminSessionToken,
  parseAdminSessionToken
} from "@/lib/server/admin-auth";

describe("admin auth token", () => {
  it("creates and parses token", () => {
    const token = createAdminSessionToken("admin");
    const parsed = parseAdminSessionToken(token);

    expect(parsed).not.toBeNull();
    expect(parsed?.username).toBe("admin");
  });

  it("rejects modified token", () => {
    const token = createAdminSessionToken("admin");
    const modified = `${token}extra`;
    expect(parseAdminSessionToken(modified)).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { validateLicense } from "../../src/utils/validation.utils";

vi.mock("../../src/utils/embedded-config.utils", () => ({
  getEmbeddedConfig: vi.fn(),
}));

import { getEmbeddedConfig } from "../../src/utils/embedded-config.utils";

const mockGetEmbeddedConfig = vi.mocked(getEmbeddedConfig);

const validConfig = {
  org: "Example Corp",
  max_seats: 5,
  issued: "2026-01-01",
  expires: "2027-01-01",
};

describe("validateLicense", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("succeeds when now is between issued and expires", () => {
    mockGetEmbeddedConfig.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2026-06-15"))).not.toThrow();
  });

  it("succeeds on the exact issue date", () => {
    mockGetEmbeddedConfig.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2026-01-01"))).not.toThrow();
  });

  it("fails when now is before the issue date", () => {
    mockGetEmbeddedConfig.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2025-12-31"))).toThrow(
      "Enterprise license is not yet valid",
    );
  });

  it("fails on the expiration date", () => {
    mockGetEmbeddedConfig.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2027-01-01"))).toThrow(
      "Enterprise license has expired",
    );
  });

  it("fails after the expiration date", () => {
    mockGetEmbeddedConfig.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2028-01-01"))).toThrow(
      "Enterprise license has expired",
    );
  });
});

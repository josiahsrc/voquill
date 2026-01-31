import { afterEach, describe, expect, it, vi } from "vitest";
import { validateLicense } from "../../src/utils/validation.utils";

vi.mock("../../src/utils/license-key.utils", () => ({
  getLicenseKey: vi.fn(),
}));

import { getLicenseKey } from "../../src/utils/license-key.utils";

const mockGetLicenseKey = vi.mocked(getLicenseKey);

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
    mockGetLicenseKey.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2026-06-15"))).not.toThrow();
  });

  it("succeeds on the exact issue date", () => {
    mockGetLicenseKey.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2026-01-01"))).not.toThrow();
  });

  it("fails when now is before the issue date", () => {
    mockGetLicenseKey.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2025-12-31"))).toThrow(
      "Enterprise license is not yet valid",
    );
  });

  it("fails on the expiration date", () => {
    mockGetLicenseKey.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2027-01-01"))).toThrow(
      "Enterprise license has expired",
    );
  });

  it("fails after the expiration date", () => {
    mockGetLicenseKey.mockReturnValue(validConfig);
    expect(() => validateLicense(new Date("2028-01-01"))).toThrow(
      "Enterprise license has expired",
    );
  });

  it("throws when license key fails to load", () => {
    mockGetLicenseKey.mockImplementation(() => {
      throw new Error("Failed to decrypt license key");
    });
    expect(() => validateLicense(new Date("2026-06-15"))).toThrow(
      "Failed to decrypt license key",
    );
  });
});

import {
  clearEmbeddedConfigCache,
  getEmbeddedConfig,
} from "../../src/utils/embedded-config.utils";

const ENCRYPTED_CONFIG_B64 =
  "AQA/QrReGUTRd7UAtx2U6m2fViq9Eg/sYGq0JmN+TbcgK7K4tatGpezxrvycDnMtBVRz1x9+ssajTjR+nLKRBjRQXuKBLXvat2eXSZHZzcSHXVTTp4EcbwhgEQU57rpEzA8rmJrt940AUSxeqIGKPnQ4G+4v/mSqV7NELgWIwIqr9pjhUWBbcJ4JU8c0h8ncydCsWu4kIM38qIPf3xkSQ349LR66Sk+XLpQzf2JApcHUThzzUJPmgerXu+14ebi4frnZe9vQpKeAzFM6yyM+rTHw4IY+g/RfPN03/aW5em7DK/E3yLhNDePU6nonOwFs4o7ppLL/CFgj4u1PITDFv/0qU3XNYWup7xEAR0hFfVELlbwbu+qACsnGtzAEoRa5516ofHY0BzSEFm77ymEv5Y1JpEpVHMRkLB5XNNWPLi8x3IraJSzO3UN8PPGO6F4atCYOZ8Hiw1WMzh6WuAccZCr586nArGro/Kn5f05Q2XjcL6ySbX7H/7M3ncSl4JA7K+c=";

describe("embedded config", () => {
  beforeEach(() => {
    process.env.EMBEDDED_CONFIG_B64 = ENCRYPTED_CONFIG_B64;
  });

  afterEach(() => {
    delete process.env.EMBEDDED_CONFIG_B64;
  });

  it("decrypts and parses the embedded config", () => {
    const config = getEmbeddedConfig();

    expect(config).toHaveProperty("org");
    expect(config).toHaveProperty("max_seats");
    expect(config).toHaveProperty("issued");
    expect(config).toHaveProperty("expires");
    expect(typeof config.org).toBe("string");
    expect(typeof config.max_seats).toBe("number");
  });

  it("returns null if EMBEDDED_CONFIG_B64 is not set", () => {
    delete process.env.EMBEDDED_CONFIG_B64;
    clearEmbeddedConfigCache();
    expect(() => getEmbeddedConfig()).toThrow();
  });
});

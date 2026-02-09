import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLogLevel, getLogger, Logger, setLogLevel } from "./log.utils";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

describe("LoggyTails", () => {
  it("should log info messages", () => {
    const logger = new Logger("info");
    logger.info("hello");
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("[INFO] hello");
  });

  it("should log warning messages", () => {
    const logger = new Logger("info");
    logger.warning("watch out");
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("[WARN] watch out");
  });

  it("should log error messages", () => {
    const logger = new Logger("info");
    logger.error("something broke");
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("[ERROR] something broke");
  });

  it("should skip verbose messages when level is info", () => {
    const logger = new Logger("info");
    logger.verbose("detail");
    expect(logger.getLogs()).toHaveLength(0);
  });

  it("should log verbose messages when level is verbose", () => {
    const logger = new Logger("verbose");
    logger.verbose("detail");
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("[VERBOSE] detail");
  });

  it("should use circular buffer for info level (200 entries)", () => {
    const logger = new Logger("info");
    for (let i = 0; i < 220; i++) {
      logger.info(`msg-${i}`);
    }
    const logs = logger.getLogs();
    expect(logs).toHaveLength(200);
    expect(logs[0]).toContain("msg-20");
    expect(logs[199]).toContain("msg-219");
  });

  it("should use circular buffer for verbose level (2000 entries)", () => {
    const logger = new Logger("verbose");
    for (let i = 0; i < 2020; i++) {
      logger.info(`msg-${i}`);
    }
    const logs = logger.getLogs();
    expect(logs).toHaveLength(2000);
    expect(logs[0]).toContain("msg-20");
    expect(logs[1999]).toContain("msg-2019");
  });

  it("should return logs in chronological order after wrapping", () => {
    const logger = new Logger("info");
    for (let i = 0; i < 105; i++) {
      logger.info(`msg-${i}`);
    }
    const logs = logger.getLogs();
    for (let i = 0; i < logs.length - 1; i++) {
      const currNum = parseInt(logs[i].match(/msg-(\d+)/)![1]);
      const nextNum = parseInt(logs[i + 1].match(/msg-(\d+)/)![1]);
      expect(nextNum).toBe(currNum + 1);
    }
  });

  it("should include timestamps in log entries", () => {
    const logger = new Logger("info");
    logger.info("timestamped");
    const logs = logger.getLogs();
    expect(logs[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
  });

  it("should report its log level", () => {
    expect(new Logger("info").getLogLevel()).toBe("info");
    expect(new Logger("verbose").getLogLevel()).toBe("verbose");
  });
});

describe("getLogLevel", () => {
  it("should return info by default", () => {
    expect(getLogLevel()).toBe("info");
  });

  it("should return stored level", () => {
    localStorageMock.setItem("voquill_log_level", "verbose");
    expect(getLogLevel()).toBe("verbose");
  });

  it("should ignore invalid stored values", () => {
    localStorageMock.setItem("voquill_log_level", "debug");
    expect(getLogLevel()).toBe("info");
  });
});

describe("setLogLevel", () => {
  it("should persist level to localStorage", () => {
    setLogLevel("verbose");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "voquill_log_level",
      "verbose",
    );
  });

  it("should reset the global logger", () => {
    const first = getLogger();
    setLogLevel("verbose");
    const second = getLogger();
    expect(second).not.toBe(first);
    expect(second.getLogLevel()).toBe("verbose");
  });
});

describe("getLogger", () => {
  it("should create a logger on first call", () => {
    const logger = getLogger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it("should return the same instance on repeated calls", () => {
    const a = getLogger();
    const b = getLogger();
    expect(a).toBe(b);
  });

  it("should recreate logger when stored level changes", () => {
    const first = getLogger();
    expect(first.getLogLevel()).toBe("info");
    localStorageMock.setItem("voquill_log_level", "verbose");
    const second = getLogger();
    expect(second).not.toBe(first);
    expect(second.getLogLevel()).toBe("verbose");
  });
});

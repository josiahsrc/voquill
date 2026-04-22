import { describe, expect, it } from "vitest";

const loadSubject = async () => {
  return import("./permission-flow.utils").catch(
    () => ({}) as Partial<typeof import("./permission-flow.utils")>,
  );
};

describe("derivePermissionGateState", () => {
  it("treats an untrusted accessibility check as requestable before request", async () => {
    const { derivePermissionGateState } = await loadSubject();

    expect(derivePermissionGateState).toBeTypeOf("function");
    expect(
      derivePermissionGateState?.({
        kind: "accessibility",
        status: {
          kind: "accessibility",
          state: "not-determined",
          promptShown: false,
        },
        requestInFlight: false,
        awaitingExternalApproval: false,
      }),
    ).toMatchObject({
      canRequest: true,
      isAwaitingExternalApproval: false,
      shouldOpenSettings: false,
    });
  });

  it("enters a waiting state after accessibility request has been initiated", async () => {
    const { derivePermissionGateState } = await loadSubject();

    expect(derivePermissionGateState).toBeTypeOf("function");
    expect(
      derivePermissionGateState?.({
        kind: "accessibility",
        status: {
          kind: "accessibility",
          state: "not-determined",
          promptShown: false,
        },
        requestInFlight: false,
        awaitingExternalApproval: true,
      }),
    ).toMatchObject({
      canRequest: false,
      isAwaitingExternalApproval: true,
      shouldOpenSettings: false,
    });
  });

  it("does not reopen settings while accessibility approval is pending externally", async () => {
    const { derivePermissionGateState } = await loadSubject();

    expect(derivePermissionGateState).toBeTypeOf("function");
    expect(
      derivePermissionGateState?.({
        kind: "accessibility",
        status: {
          kind: "accessibility",
          state: "not-determined",
          promptShown: false,
        },
        requestInFlight: false,
        awaitingExternalApproval: true,
      }),
    ).toMatchObject({
      shouldOpenSettings: false,
    });
  });

  it("disables repeated requests while a permission request is already active", async () => {
    const { derivePermissionGateState } = await loadSubject();

    expect(derivePermissionGateState).toBeTypeOf("function");
    expect(
      derivePermissionGateState?.({
        kind: "microphone",
        status: {
          kind: "microphone",
          state: "not-determined",
          promptShown: false,
        },
        requestInFlight: true,
        awaitingExternalApproval: false,
      }),
    ).toMatchObject({
      canRequest: false,
      isAwaitingExternalApproval: false,
      shouldOpenSettings: false,
    });
  });
});

describe("resolvePermissionRequestLifecycle", () => {
  it("starts waiting for external approval after an accessibility request opens settings", async () => {
    const { resolvePermissionRequestLifecycle } = await loadSubject();

    expect(resolvePermissionRequestLifecycle).toBeTypeOf("function");
    expect(
      resolvePermissionRequestLifecycle?.({
        kind: "accessibility",
        status: {
          kind: "accessibility",
          state: "not-determined",
          promptShown: true,
        },
        requestInFlight: true,
        awaitingExternalApproval: false,
      }),
    ).toMatchObject({
      requestInFlight: false,
      awaitingExternalApproval: true,
    });
  });

  it("keeps waiting while repeated accessibility polling is still not determined", async () => {
    const { resolvePermissionRequestLifecycle } = await loadSubject();

    expect(resolvePermissionRequestLifecycle).toBeTypeOf("function");
    expect(
      resolvePermissionRequestLifecycle?.({
        kind: "accessibility",
        status: {
          kind: "accessibility",
          state: "not-determined",
          promptShown: false,
        },
        requestInFlight: false,
        awaitingExternalApproval: true,
      }),
    ).toMatchObject({
      requestInFlight: false,
      awaitingExternalApproval: true,
    });
  });

  it("clears waiting once accessibility becomes authorized", async () => {
    const { resolvePermissionRequestLifecycle } = await loadSubject();

    expect(resolvePermissionRequestLifecycle).toBeTypeOf("function");
    expect(
      resolvePermissionRequestLifecycle?.({
        kind: "accessibility",
        status: {
          kind: "accessibility",
          state: "authorized",
          promptShown: false,
        },
        requestInFlight: false,
        awaitingExternalApproval: true,
      }),
    ).toMatchObject({
      requestInFlight: false,
      awaitingExternalApproval: false,
    });
  });
});

describe("screen recording permission contract", () => {
  it("keeps screen recording optional while leaving it requestable", async () => {
    const [
      { INITIAL_APP_STATE },
      { REQUIRED_PERMISSIONS, ENHANCEMENT_PERMISSIONS },
      permissionFlowSubject,
    ] = await Promise.all([
      import("../state/app.state"),
      import("./permission.utils"),
      loadSubject(),
    ]);

    const derivePermissionGateState =
      permissionFlowSubject.derivePermissionGateState as
        | ((input: {
            kind: string;
            status: unknown;
            requestInFlight: boolean;
            awaitingExternalApproval: boolean;
          }) => {
            canRequest: boolean;
            isAwaitingExternalApproval: boolean;
            shouldOpenSettings: boolean;
          })
        | undefined;

    const permissions = INITIAL_APP_STATE.permissions as Record<string, unknown>;
    const permissionRequests = INITIAL_APP_STATE.permissionRequests as Record<
      string,
      { requestInFlight: boolean; awaitingExternalApproval: boolean }
    >;

    expect(REQUIRED_PERMISSIONS).not.toContain("screen-recording");
    expect(ENHANCEMENT_PERMISSIONS).toContain("screen-recording");
    expect(permissions).toHaveProperty("screen-recording");
    expect(permissions["screen-recording"]).toMatchObject({
      kind: "screen-recording",
      state: "not-determined",
      promptShown: false,
    });
    expect(permissionRequests).toHaveProperty("screen-recording");
    expect(permissionRequests["screen-recording"]).toMatchObject({
      requestInFlight: false,
      awaitingExternalApproval: false,
    });
    expect(derivePermissionGateState).toBeTypeOf("function");
    expect(
      derivePermissionGateState?.({
        kind: "screen-recording",
        status: permissions["screen-recording"],
        ...permissionRequests["screen-recording"],
      }),
    ).toMatchObject({
      canRequest: true,
      isAwaitingExternalApproval: false,
      shouldOpenSettings: false,
    });
  });
});

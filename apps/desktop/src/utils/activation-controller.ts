const LOCK_MS = 400;

export class ActivationController {
  private _isActive = false;
  private _isLocked = false;
  private ignoreNextActivation = false;
  private deactivateTimer: NodeJS.Timeout | null = null;
  private activationTimestamp: number | null = null;
  private lastReleaseTimestamp: number | null = null;

  constructor(
    private onActivate: () => void,
    private onDeactivate: () => void,
  ) {}

  get isActive(): boolean {
    return this._isActive;
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  get shouldIgnoreActivation(): boolean {
    return this.ignoreNextActivation;
  }

  get hasHadRelease(): boolean {
    return this.lastReleaseTimestamp !== null;
  }

  private clearPendingDeactivation(): void {
    if (this.deactivateTimer) {
      clearTimeout(this.deactivateTimer);
      this.deactivateTimer = null;
    }
  }

  private doActivate(timestamp: number): void {
    if (this._isActive) return;

    this.clearPendingDeactivation();
    this._isActive = true;
    this.activationTimestamp = timestamp;
    this.onActivate();
  }

  private doDeactivate(): void {
    const wasActive = this._isActive;

    this.clearPendingDeactivation();
    this._isActive = false;
    this._isLocked = false;
    this.ignoreNextActivation = false;
    this.activationTimestamp = null;

    if (wasActive) {
      this.onDeactivate();
    }
  }

  handlePress(): void {
    if (this.ignoreNextActivation) {
      return;
    }

    const now = Date.now();

    if (this._isLocked) {
      this._isLocked = false;
      this.ignoreNextActivation = true;
      this.doDeactivate();
      return;
    }

    const lastRelease = this.lastReleaseTimestamp;
    const doubleTap =
      this._isActive && lastRelease !== null && now - lastRelease <= LOCK_MS;

    this.clearPendingDeactivation();

    if (!this._isActive) {
      this.doActivate(now);
    }

    if (doubleTap && this._isActive) {
      this._isLocked = true;
    }
  }

  handleRelease(): void {
    this.ignoreNextActivation = false;
    this.lastReleaseTimestamp = Date.now();

    if (!this._isActive) return;
    if (this._isLocked) return;

    const now = Date.now();
    const activatedAt = this.activationTimestamp ?? now;
    const elapsed = now - activatedAt;
    const remaining = LOCK_MS - elapsed;

    if (remaining <= 0) {
      this.doDeactivate();
    } else {
      this.clearPendingDeactivation();
      this.deactivateTimer = setTimeout(() => {
        this.doDeactivate();
      }, remaining);
    }
  }

  toggle(): void {
    if (this._isActive) {
      this.doDeactivate();
    } else {
      this._isLocked = true;
      this.doActivate(Date.now());
    }
  }

  reset(): void {
    this.ignoreNextActivation = false;
    this.lastReleaseTimestamp = null;
    this.clearPendingDeactivation();
    this.doDeactivate();
  }

  forceReset(): void {
    this._isActive = false;
    this._isLocked = false;
    this.ignoreNextActivation = false;
    this.activationTimestamp = null;
    this.lastReleaseTimestamp = null;
    this.clearPendingDeactivation();
  }

  clearIgnore(): void {
    this.ignoreNextActivation = false;
  }

  dispose(): void {
    this.clearPendingDeactivation();
  }
}

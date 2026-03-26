export class AsyncLock {
  private count = 0;

  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.count++;
    try {
      return await fn();
    } finally {
      this.count--;
    }
  }

  get locked(): boolean {
    return this.count > 0;
  }

  async wait(): Promise<void> {
    while (this.count > 0) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

export class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

export class NotFoundError extends ClientError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ClientError {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends ClientError {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

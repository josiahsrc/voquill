import * as functions from "firebase-functions";
import * as express from "express";

export class ClientError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ClientError";
	}
}

export class InvalidArgumentError extends ClientError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidArgumentError";
	}
}

export class NotFoundError extends ClientError {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export class AlreadyExistsError extends ClientError {
	constructor(message: string) {
		super(message);
		this.name = "AlreadyExistsError";
	}
}

export class PermissionDeniedError extends ClientError {
	constructor(message: string) {
		super(message);
		this.name = "PermissionDeniedError";
	}
}

export class UnauthenticatedError extends ClientError {
	constructor(message: string) {
		super(message);
		this.name = "UnauthenticatedError";
	}
}

export async function wrapAsync<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		console.error(e);
		if (e instanceof Error) {
			console.error(e.stack);
		}

		if (e instanceof InvalidArgumentError) {
			console.log("invalid argument error");
			throw new functions.https.HttpsError("invalid-argument", e.message);
		} else if (e instanceof NotFoundError) {
			throw new functions.https.HttpsError("not-found", e.message);
		} else if (e instanceof AlreadyExistsError) {
			throw new functions.https.HttpsError("already-exists", e.message);
		} else if (e instanceof PermissionDeniedError) {
			throw new functions.https.HttpsError("permission-denied", e.message);
		} else if (e instanceof UnauthenticatedError) {
			throw new functions.https.HttpsError("unauthenticated", e.message);
		} else if (e instanceof ClientError) {
			throw new functions.https.HttpsError("invalid-argument", e.message);
		} else if (e instanceof Error) {
			throw new functions.https.HttpsError("internal", e.message);
		} else {
			throw new functions.https.HttpsError("internal", "unknown error");
		}
	}
}

export async function wrapAsyncExpress(
	res: express.Response,
	fn: () => Promise<void>
): Promise<void> {
	try {
		await fn();
	} catch (e) {
		console.error(e);
		if (e instanceof Error) {
			console.error(e.stack);
		}

		if (e instanceof InvalidArgumentError) {
			console.log("invalid argument error");
			res.status(400).send(e.message);
		} else if (e instanceof NotFoundError) {
			res.status(404).send(e.message);
		} else if (e instanceof AlreadyExistsError) {
			res.status(409).send(e.message);
		} else if (e instanceof PermissionDeniedError) {
			res.status(403).send(e.message);
		} else if (e instanceof UnauthenticatedError) {
			res.status(401).send(e.message);
		} else if (e instanceof ClientError) {
			res.status(400).send(e.message);
		} else if (e instanceof Error) {
			res.status(500).send(e.message);
		} else {
			res.status(500).send("unknown error");
		}
	}
}

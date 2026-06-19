import { ItemsApiError } from "./api";

export function itemsErrorMessage(error: unknown): string {
	if (error instanceof ItemsApiError) {
		switch (error.code) {
			case "SESSION_EXPIRED":
				return "session expired — start a new one.";
			case "SESSION_NOT_PAIRED":
				return "session is not paired yet.";
			case "FILE_TOO_LARGE":
				return error.message;
			default:
				return error.message;
		}
	}
	return "couldn't send — check your connection and try again.";
}

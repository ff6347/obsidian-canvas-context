export interface InferenceResult {
	success: boolean;
	text: string;
	error?: string;
	errorType?: "connection" | "model" | "provider" | "unknown";
}

export interface RecentError extends InferenceResult {
	timestamp: number;
}

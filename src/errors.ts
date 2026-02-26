import type { LeanvoxError } from "leanvox";

export interface StructuredError {
  code: string;
  message: string;
  status: number;
  recoverable: boolean;
  suggestion: string;
  details?: Record<string, unknown>;
}

const ERROR_MAP: Record<string, { recoverable: boolean; suggestion: string }> = {
  insufficient_balance: {
    recoverable: true,
    suggestion:
      "Call leanvox_check_balance to see your balance, or inform the user they need to add funds at https://leanvox.com/billing.",
  },
  rate_limit_exceeded: {
    recoverable: true,
    suggestion: "Wait a moment and retry the request.",
  },
  invalid_request: {
    recoverable: true,
    suggestion: "Check the parameters and fix the invalid values.",
  },
  invalid_api_key: {
    recoverable: false,
    suggestion:
      "The LEANVOX_API_KEY environment variable is missing or invalid. Ask the user to provide a valid API key.",
  },
  not_found: {
    recoverable: true,
    suggestion:
      "The requested resource was not found. Use leanvox_list_voices to see available options.",
  },
  server_error: {
    recoverable: true,
    suggestion: "This is a temporary server issue. Wait a moment and retry.",
  },
};

export function formatError(error: unknown): StructuredError {
  if (isLeanvoxError(error)) {
    const code = error.code ?? "unknown_error";
    const mapped = ERROR_MAP[code] ?? {
      recoverable: true,
      suggestion: "Retry the request or try different parameters.",
    };
    return {
      code,
      message: error.message,
      status: error.statusCode ?? 500,
      recoverable: mapped.recoverable,
      suggestion: mapped.suggestion,
      details: typeof error.body === "object" && error.body !== null
        ? (error.body as Record<string, unknown>)
        : undefined,
    };
  }

  return {
    code: "unknown_error",
    message: error instanceof Error ? error.message : String(error),
    status: 500,
    recoverable: true,
    suggestion: "An unexpected error occurred. Retry the request.",
  };
}

function isLeanvoxError(error: unknown): error is LeanvoxError {
  return (
    error instanceof Error &&
    "code" in error &&
    "statusCode" in error
  );
}

import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "API_KEY_MISSING",
  "RATE_LIMIT",
  "AI_PARSE_FAILURE",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  errorCode: ErrorCodeSchema.optional(),
});

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode?: ErrorCode
  ) {
    super(`API error ${status}`);
    this.name = "ApiError";
  }
}

export function getUserFriendlyErrorMessage(
  status: number,
  errorCode?: ErrorCode
): string {
  if (errorCode === "API_KEY_MISSING") {
    return "サービスの設定に問題が発生しました。しばらく時間をおいてお試しください。";
  }
  if (status === 429 || errorCode === "RATE_LIMIT") {
    return "AIが混み合っています。少し待ってから再度お試しください。";
  }
  if (status === 503) {
    return "AIサービスが一時的に利用できません。しばらく時間をおいてお試しください。";
  }
  if (status === 502 || errorCode === "AI_PARSE_FAILURE") {
    return "AIの応答を解析できませんでした。もう一度お試しください。";
  }
  if (status === 400 || errorCode === "VALIDATION_ERROR") {
    return "入力内容に問題があります。タスクの内容を確認してください。";
  }
  return "予期しないエラーが発生しました。しばらく時間をおいてお試しください。";
}

export const NETWORK_ERROR_MESSAGE = "ネットワーク接続を確認してください。";

export async function parseApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => ({}));
  const parsed = ApiErrorResponseSchema.safeParse(body);
  const errorCode = parsed.success ? parsed.data.errorCode : undefined;
  return new ApiError(response.status, errorCode);
}

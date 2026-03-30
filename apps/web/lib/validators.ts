import { z } from 'zod';

/** Schema for POST /api/survey/submit */
export const surveySubmitSchema = z.object({
  token: z.string().min(1, '토큰이 필요합니다.'),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, '질문 ID가 필요합니다.'),
        value: z.string(),
      }),
    )
    .min(1, '최소 하나의 답변이 필요합니다.'),
});

export type SurveySubmitInput = z.infer<typeof surveySubmitSchema>;

/** Schema for POST /api/quote/generate */
export const quoteGenerateSchema = z.object({
  responseId: z.string().min(1, '응답 ID가 필요합니다.'),
});

export type QuoteGenerateInput = z.infer<typeof quoteGenerateSchema>;

/** Schema for route params with responseId */
export const responseIdParamSchema = z.object({
  responseId: z.string().min(1),
});

/**
 * Validate request body against a zod schema.
 * Returns a structured error response or the parsed data.
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string; field?: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstIssue = result.error.issues[0];
  const path = firstIssue?.path;
  const field = path && path.length > 0 ? path.join('.') : undefined;

  return {
    success: false,
    error: firstIssue?.message ?? '유효하지 않은 데이터입니다.',
    field,
  };
}

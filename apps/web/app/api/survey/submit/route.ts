import { NextResponse } from 'next/server';
import { prisma, withDbResilience, safeDbError } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { env } from '@/lib/env';
import { surveySubmitSchema, validateBody } from '@/lib/validators';
import { submitLimiter, checkRateLimit } from '@/lib/rate-limit';
import { requestId, createRequestLogger } from '@/lib/logger';

export async function POST(request: Request) {
  const reqId = requestId();
  const log = createRequestLogger(reqId, 'POST', '/api/survey/submit');
  const start = Date.now();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      log.warn('Invalid JSON body');
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const validation = validateBody(surveySubmitSchema, body);
    if (!validation.success) {
      log.warn({ error: validation.error, field: validation.field }, 'Validation failed');
      return NextResponse.json(
        { error: validation.error, field: validation.field },
        { status: 400 },
      );
    }

    const { token, answers } = validation.data;

    const payload = verifyToken(token);
    if (!payload) {
      log.warn('Invalid or expired token');
      return NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 401 });
    }

    const rl = await checkRateLimit(submitLimiter, token);
    if (rl.limited) {
      log.warn({ remaining: rl.remaining, reset: rl.reset }, 'Rate limit exceeded');
      return NextResponse.json(
        { error: '제출 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const { userId, surveyId } = payload;

    const survey = await withDbResilience(
      () => prisma.survey.findUnique({ where: { id: surveyId }, include: { questions: true } }),
      'submit-find-survey',
    );

    if (!survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
    }

    const validQuestionIds = new Set(survey.questions.map((q) => q.id));
    const validAnswers = answers.filter((a) => validQuestionIds.has(a.questionId));

    const response = await withDbResilience(
      () =>
        prisma.$transaction(async (tx) => {
          const resp = await tx.response.create({ data: { userId, surveyId } });
          if (validAnswers.length > 0) {
            await tx.answer.createMany({
              data: validAnswers.map((a) => ({
                responseId: resp.id,
                questionId: a.questionId,
                value: a.value,
              })),
            });
          }
          return resp;
        }),
      'submit-transaction',
    );

    triggerQuoteGeneration(response.id).catch((err) => {
      log.error({ err: String(err), responseId: response.id }, 'Failed to trigger quote generation');
    });

    log.info({ responseId: response.id, duration: Date.now() - start }, 'Survey submitted');
    return NextResponse.json({ responseId: response.id });
  } catch (err) {
    log.error({ err: String(err), duration: Date.now() - start }, 'Survey submit error');
    return NextResponse.json({ error: safeDbError(err) }, { status: 500 });
  }
}

async function triggerQuoteGeneration(responseId: string) {
  await fetch(`${env.NEXT_PUBLIC_BASE_URL}/api/quote/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responseId }),
  });
}

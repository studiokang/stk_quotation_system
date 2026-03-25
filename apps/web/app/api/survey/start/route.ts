import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, withDbResilience } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { env } from '@/lib/env';
import { requestId, createRequestLogger } from '@/lib/logger';

const startSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해 주세요.'),
  surveyId: z.string().min(1, '설문을 선택해 주세요.'),
});

export async function POST(request: Request) {
  const reqId = requestId();
  const log = createRequestLogger(reqId, 'POST', '/api/survey/start');
  const start = Date.now();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message ?? '입력값이 올바르지 않습니다.', field: firstError?.path[0] },
        { status: 400 },
      );
    }

    const { email, surveyId } = parsed.data;

    const survey = await withDbResilience(
      () => prisma.survey.findUnique({ where: { id: surveyId }, select: { id: true } }),
      'start-find-survey',
    );
    if (!survey) {
      return NextResponse.json({ error: '해당 설문을 찾을 수 없습니다.' }, { status: 404 });
    }

    const user = await withDbResilience(
      () =>
        prisma.user.upsert({
          where: { email },
          create: { email },
          update: {},
          select: { id: true },
        }),
      'start-upsert-user',
    );

    const token = signToken({ userId: user.id, surveyId });
    const surveyUrl = `/survey?token=${token}`;

    log.info({ email, surveyId, duration: Date.now() - start }, 'Survey token generated');
    return NextResponse.json({ surveyUrl });
  } catch (err) {
    log.error({ err: String(err), duration: Date.now() - start }, 'Survey start error');
    return NextResponse.json({ error: '설문 시작 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

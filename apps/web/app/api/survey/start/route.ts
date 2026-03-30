import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@repo/db';
import { prisma, withDbResilience } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { requestId, createRequestLogger } from '@/lib/logger';

/** PgBouncer(transaction) 환경에서 upsert가 실패하는 경우가 있어 find + create로 처리 */
async function findOrCreateUser(email: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing;
  try {
    return await prisma.user.create({
      data: { email },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const retry = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (retry) return retry;
    }
    throw e;
  }
}

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
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? '입력값이 올바르지 않습니다.', field: firstIssue?.path[0] },
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

    const user = await withDbResilience(() => findOrCreateUser(email), 'start-upsert-user');

    const token = signToken({ userId: user.id, surveyId });
    const surveyUrl = `/survey?token=${token}`;

    log.info({ email, surveyId, duration: Date.now() - start }, 'Survey token generated');
    return NextResponse.json({ surveyUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message, duration: Date.now() - start }, 'Survey start error');
    const body: { error: string; debug?: string } = {
      error: '설문 시작 중 오류가 발생했습니다.',
    };
    if (process.env.NODE_ENV === 'development') {
      body.debug = message;
    }
    return NextResponse.json(body, { status: 500 });
  }
}

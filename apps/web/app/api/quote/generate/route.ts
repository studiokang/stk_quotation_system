import { NextResponse } from 'next/server';
import { generateQuote } from '@/lib/quote/engine';
import { quoteGenerateSchema, validateBody } from '@/lib/validators';
import { requestId, createRequestLogger } from '@/lib/logger';

export async function POST(request: Request) {
  const reqId = requestId();
  const log = createRequestLogger(reqId, 'POST', '/api/quote/generate');
  const start = Date.now();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const validation = validateBody(quoteGenerateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, field: validation.field },
        { status: 400 },
      );
    }

    log.info({ responseId: validation.data.responseId }, 'Quote generation started');

    const quoteId = await generateQuote(validation.data.responseId);

    log.info({ quoteId, responseId: validation.data.responseId, duration: Date.now() - start }, 'Quote generation completed');
    return NextResponse.json({ quoteId });
  } catch (err) {
    log.error({ err: String(err), duration: Date.now() - start }, 'Quote generation error');
    return NextResponse.json({ error: '견적 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

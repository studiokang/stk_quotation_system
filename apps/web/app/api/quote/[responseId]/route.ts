import { NextResponse } from 'next/server';
import { prisma, withDbResilience, safeDbError } from '@/lib/prisma';
import { requestId, createRequestLogger } from '@/lib/logger';

export interface QuoteStatusResponse {
  status: 'pending' | 'ready';
  quote: {
    id: string;
    quoteNumber: string;
    totalPrice: number;
    vat: number;
    grandTotal: number;
    items: Array<{ label: string; value: string; price: number }>;
    createdAt: string;
    hasPdf: boolean;
  } | null;
}

export async function GET(
  _request: Request,
  { params }: { params: { responseId: string } },
) {
  const reqId = requestId();
  const log = createRequestLogger(reqId, 'GET', `/api/quote/${params.responseId}`);

  try {
    const { responseId } = params;

    const response = await withDbResilience(
      () => prisma.response.findUnique({ where: { id: responseId }, select: { id: true } }),
      'quote-status-find-response',
    );

    if (!response) {
      return NextResponse.json({ error: '응답을 찾을 수 없습니다.' }, { status: 404 });
    }

    const quote = await withDbResilience(
      () =>
        prisma.quote.findUnique({
          where: { responseId },
          select: { id: true, totalPrice: true, detailJson: true, pdfPath: true, createdAt: true },
        }),
      'quote-status-find-quote',
    );

    if (!quote) {
      const body: QuoteStatusResponse = { status: 'pending', quote: null };
      return NextResponse.json(body);
    }

    const items = (quote.detailJson ?? []) as Array<{ label: string; value: string; price: number }>;
    const vat = Math.round(quote.totalPrice * 0.1);

    const body: QuoteStatusResponse = {
      status: 'ready',
      quote: {
        id: quote.id,
        quoteNumber: `QT-${quote.id.slice(0, 8).toUpperCase()}`,
        totalPrice: quote.totalPrice,
        vat,
        grandTotal: quote.totalPrice + vat,
        items,
        createdAt: quote.createdAt.toISOString(),
        hasPdf: !!quote.pdfPath,
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    log.error({ err: String(err) }, 'Quote status check failed');
    return NextResponse.json({ error: safeDbError(err) }, { status: 500 });
  }
}

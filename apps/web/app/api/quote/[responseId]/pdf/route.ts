import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { prisma, withDbResilience, safeDbError } from '@/lib/prisma';
import { requestId, createRequestLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { responseId: string } },
) {
  const reqId = requestId();
  const log = createRequestLogger(reqId, 'GET', `/api/quote/${params.responseId}/pdf`);

  try {
    const { responseId } = params;

    const quote = await withDbResilience(
      () => prisma.quote.findUnique({ where: { responseId }, select: { id: true, pdfPath: true } }),
      'pdf-find-quote',
    );

    if (!quote) {
      return NextResponse.json({ error: '견적을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!quote.pdfPath) {
      return NextResponse.json(
        { error: 'PDF가 아직 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 202 },
      );
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(quote.pdfPath);
    } catch {
      log.warn({ quoteId: quote.id }, 'PDF file not found on disk');
      return NextResponse.json(
        { error: 'PDF 파일을 찾을 수 없습니다. 재생성이 필요합니다.' },
        { status: 404 },
      );
    }

    const filename = `quote-QT-${quote.id.slice(0, 8).toUpperCase()}.pdf`;

    log.info({ quoteId: quote.id }, 'PDF downloaded');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err) {
    log.error({ err: String(err) }, 'PDF download error');
    return NextResponse.json({ error: safeDbError(err) }, { status: 500 });
  }
}

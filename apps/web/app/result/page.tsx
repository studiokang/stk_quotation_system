import { prisma, withDbResilience } from '@/lib/prisma';
import { QuotePolling } from '@/components/QuotePolling';
import type { QuoteStatusResponse } from '@/app/api/quote/[responseId]/route';

interface PageProps {
  searchParams: { responseId?: string };
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">결과를 확인할 수 없습니다</h1>
        <p className="text-gray-600">{message}</p>
        <a
          href="/"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          홈으로 돌아가기
        </a>
      </div>
    </main>
  );
}

export default async function ResultPage({ searchParams }: PageProps) {
  const { responseId } = searchParams;

  if (!responseId) {
    return <ErrorPage message="결과를 조회하기 위한 응답 ID가 제공되지 않았습니다." />;
  }

  const response = await withDbResilience(
    () => prisma.response.findUnique({ where: { id: responseId }, select: { id: true } }),
    'result-page-find-response',
  );

  if (!response) {
    return <ErrorPage message="해당 응답을 찾을 수 없습니다. URL을 다시 확인해 주세요." />;
  }

  const quote = await withDbResilience(
    () =>
      prisma.quote.findUnique({
        where: { responseId },
        select: { id: true, totalPrice: true, detailJson: true, pdfPath: true, createdAt: true },
      }),
    'result-page-find-quote',
  );

  let initialData: QuoteStatusResponse | null = null;

  if (quote) {
    const items = (quote.detailJson ?? []) as Array<{ label: string; value: string; price: number }>;
    const vat = Math.round(quote.totalPrice * 0.1);
    initialData = {
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
  }

  return <QuotePolling responseId={responseId} initialData={initialData} />;
}

'use client';

interface QuoteItem {
  label: string;
  value: string;
  price: number;
}

interface QuoteCardProps {
  quoteNumber: string;
  totalPrice: number;
  vat: number;
  grandTotal: number;
  items: QuoteItem[];
  createdAt: string;
  hasPdf: boolean;
  responseId: string;
}

function formatCurrency(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function QuoteCard({
  quoteNumber,
  totalPrice,
  vat,
  grandTotal,
  items,
  createdAt,
  hasPdf,
  responseId,
}: QuoteCardProps) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">견적서</h2>
              <p className="mt-1 text-sm text-gray-500">{quoteNumber}</p>
            </div>
            <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              완료
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">발행일</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">유효 기간</p>
            <p className="mt-1 text-sm font-medium text-gray-900">발행일로부터 30일</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  항목
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  선택
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  금액
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 text-sm text-gray-700">{item.label}</td>
                  <td className="py-3 text-sm text-gray-500">{item.value}</td>
                  <td className="py-3 text-right text-sm tabular-nums text-gray-900">
                    {formatCurrency(item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">소계</span>
              <span className="tabular-nums text-gray-700">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">부가세 (10%)</span>
              <span className="tabular-nums text-gray-700">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
              <span className="text-gray-900">합계</span>
              <span className="tabular-nums text-gray-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {hasPdf ? (
          <a
            href={`/api/quote/${responseId}/pdf`}
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF 다운로드
          </a>
        ) : (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium text-gray-400">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            PDF 생성 중...
          </div>
        )}
        <a
          href="/"
          className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          홈으로 돌아가기
        </a>
      </div>

      {/* Note */}
      <div className="space-y-2 text-center text-xs text-gray-500">
        <p className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 leading-relaxed text-gray-600">
          납품되는 최종 결과물에 대해 소규모 세부 조정이 필요하신 경우, 별도 협의를 통해 반영할 수 있습니다.
        </p>
        <p className="text-gray-400">
          이 견적서는 이메일로도 발송되었습니다. 문의사항이 있으시면 담당자에게 연락해 주세요.
        </p>
      </div>
    </div>
  );
}

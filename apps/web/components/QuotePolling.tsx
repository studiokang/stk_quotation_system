'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QuoteCard } from '@/components/QuoteCard';
import type { QuoteStatusResponse } from '@/app/api/quote/[responseId]/route';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 60_000;

interface QuotePollingProps {
  responseId: string;
  initialData: QuoteStatusResponse | null;
}

function QuoteSkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-4 px-6 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex justify-between">
            <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingState({ elapsed }: { elapsed: number }) {
  const remaining = Math.max(0, Math.ceil((POLL_TIMEOUT_MS - elapsed) / 1000));

  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center">
        <svg className="h-10 w-10 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">견적 생성 중...</h2>
        <p className="mt-2 text-sm text-gray-500">
          설문 응답을 분석하여 맞춤 견적서를 작성하고 있습니다.
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(95, (elapsed / POLL_TIMEOUT_MS) * 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">약 {remaining}초 남음</p>
    </div>
  );
}

function TimeoutError() {
  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">견적 생성에 시간이 걸리고 있습니다</h2>
        <p className="mt-2 text-sm text-gray-500">
          견적서가 준비되면 이메일로 발송해 드리겠습니다. 잠시 후 이 페이지를 새로고침해 주세요.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          페이지 새로고침
        </button>
        <a
          href="/"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}

export function QuotePolling({ responseId, initialData }: QuotePollingProps) {
  const [data, setData] = useState<QuoteStatusResponse | null>(initialData);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const isReady = data?.status === 'ready';
  const isFullyReady = isReady && data?.quote?.hasPdf;

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote/${responseId}`);
      if (!res.ok) return;
      const json: QuoteStatusResponse = await res.json();
      setData(json);
    } catch {
      // Network error — will retry on next interval
    }
  }, [responseId]);

  useEffect(() => {
    if (isFullyReady || timedOut) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const ms = now - startTimeRef.current;
      setElapsed(ms);

      if (ms >= POLL_TIMEOUT_MS) {
        setTimedOut(true);
        clearInterval(intervalRef.current);
        return;
      }

      poll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [isFullyReady, timedOut, poll]);

  if (timedOut && !isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <TimeoutError />
      </main>
    );
  }

  if (!isReady || !data?.quote) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <PendingState elapsed={elapsed} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <QuoteCard
        quoteNumber={data.quote.quoteNumber}
        totalPrice={data.quote.totalPrice}
        vat={data.quote.vat}
        grandTotal={data.quote.grandTotal}
        items={data.quote.items}
        createdAt={data.quote.createdAt}
        hasPdf={data.quote.hasPdf}
        responseId={responseId}
      />
    </main>
  );
}

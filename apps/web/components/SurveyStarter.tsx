'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Survey {
  id: string;
  title: string;
}

export function SurveyStarter({ surveys }: { surveys: Survey[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState(surveys[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    if (!selectedSurvey) {
      setError('설문을 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/survey/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, surveyId: selectedSurvey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.');
        return;
      }

      router.push(data.surveyUrl);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleStart} className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
      <div className="space-y-4">
        {surveys.length > 1 && (
          <div>
            <label htmlFor="survey-select" className="block text-sm font-medium text-gray-700 mb-1.5">
              설문 선택
            </label>
            <select
              id="survey-select"
              value={selectedSurvey}
              onChange={(e) => setSelectedSurvey(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            >
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        )}

        {surveys.length === 1 && (
          <div className="flex items-center gap-3 rounded-lg bg-primary-50 px-4 py-3">
            <svg className="h-5 w-5 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-primary-700">{surveys[0]?.title}</span>
          </div>
        )}

        <div>
          <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-1.5">
            이메일 주소
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="your@email.com"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
          />
          <p className="mt-1 text-xs text-gray-400">견적서가 이 이메일로 발송됩니다.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '시작 중...' : '설문 시작하기'}
      </button>
    </form>
  );
}

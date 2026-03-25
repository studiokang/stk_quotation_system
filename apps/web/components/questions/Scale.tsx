'use client';

import type { SurveyQuestion } from '@/lib/types';

interface ScaleProps {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}

export function Scale({ question, value, onChange }: ScaleProps) {
  const numericValue = value ? parseInt(value, 10) : 5;

  return (
    <div className="space-y-4">
      <label htmlFor={question.id} className="block text-base font-medium text-gray-900">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="space-y-3">
        <input
          id={question.id}
          type="range"
          min={1}
          max={10}
          step={1}
          value={numericValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600"
        />
        <div className="flex justify-between px-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition ${
                numericValue === n
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>매우 낮음</span>
          <span>매우 높음</span>
        </div>
      </div>
    </div>
  );
}

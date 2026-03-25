'use client';

import type { SurveyQuestion } from '@/lib/types';

interface DateInputProps {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}

export function DateInput({ question, value, onChange }: DateInputProps) {
  return (
    <div className="space-y-3">
      <label htmlFor={question.id} className="block text-base font-medium text-gray-900">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={question.id}
        name={question.id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}

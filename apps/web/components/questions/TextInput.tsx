'use client';

import type { SurveyQuestion } from '@/lib/types';

interface TextInputProps {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}

export function TextInput({ question, value, onChange }: TextInputProps) {
  return (
    <div className="space-y-3">
      <label htmlFor={question.id} className="block text-base font-medium text-gray-900">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <textarea
        id={question.id}
        name={question.id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="답변을 입력해 주세요..."
        className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}

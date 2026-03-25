'use client';

import type { SurveyQuestion } from '@/lib/types';

interface SingleChoiceProps {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}

export function SingleChoice({ question, value, onChange }: SingleChoiceProps) {
  const options = question.options ?? [];

  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-medium text-gray-900">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
              value === option
                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

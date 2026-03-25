'use client';

import type { SurveyQuestion } from '@/lib/types';

interface MultiChoiceProps {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}

export function MultiChoice({ question, value, onChange }: MultiChoiceProps) {
  const options = question.options ?? [];
  const selected: string[] = value ? JSON.parse(value) : [];

  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : [...selected, option];
    onChange(JSON.stringify(next));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-medium text-gray-900">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </legend>
      <p className="text-xs text-gray-500">복수 선택 가능</p>
      <div className="space-y-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                checked
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                name={question.id}
                value={option}
                checked={checked}
                onChange={() => toggle(option)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

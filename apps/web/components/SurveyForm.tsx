'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SurveyData, SurveyQuestion, AnswerEntry } from '@/lib/types';
import { SingleChoice } from '@/components/questions/SingleChoice';
import { MultiChoice } from '@/components/questions/MultiChoice';
import { TextInput } from '@/components/questions/TextInput';
import { Scale } from '@/components/questions/Scale';
import { DateInput } from '@/components/questions/DateInput';

interface SurveyFormProps {
  survey: SurveyData;
  token: string;
}

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (question.type) {
    case 'single_choice':
      return <SingleChoice question={question} value={value} onChange={onChange} />;
    case 'multi_choice':
      return <MultiChoice question={question} value={value} onChange={onChange} />;
    case 'text':
      return <TextInput question={question} value={value} onChange={onChange} />;
    case 'scale':
      return <Scale question={question} value={value} onChange={onChange} />;
    case 'date':
      return <DateInput question={question} value={value} onChange={onChange} />;
    default:
      return null;
  }
}

function getDisplayValue(question: SurveyQuestion, value: string): string {
  if (!value) return '(미답변)';
  if (question.type === 'multi_choice') {
    try {
      const parsed: string[] = JSON.parse(value);
      return parsed.length > 0 ? parsed.join(', ') : '(미답변)';
    } catch {
      return value;
    }
  }
  if (question.type === 'scale') {
    return `${value} / 10`;
  }
  if (question.type === 'date' && value) {
    const d = new Date(value + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    }
  }
  return value;
}

export function SurveyForm({ survey, token }: SurveyFormProps) {
  const router = useRouter();

  const sortedQuestions = useMemo(
    () => [...survey.questions].sort((a, b) => a.order - b.order),
    [survey.questions],
  );
  const totalSteps = sortedQuestions.length + 1; // +1 for review step

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const questionMap = useMemo(
    () => new Map(survey.questions.map((q) => [q.id, q])),
    [survey.questions],
  );

  const isReviewStep = currentStep === sortedQuestions.length;
  const isLastQuestion = currentStep === sortedQuestions.length - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentQuestion = !isReviewStep ? sortedQuestions[currentStep] : null;

  const sectionForCurrentQuestion = useMemo(() => {
    if (!currentQuestion) return undefined;
    return survey.sections.find((s) => s.questionIds.includes(currentQuestion.id));
  }, [currentQuestion, survey.sections]);

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  function validateCurrentStep(): boolean {
    if (!currentQuestion) return true;
    const newErrors: Record<string, string> = {};
    const q = currentQuestion;
    if (q.required) {
      const val = answers[q.id];
      if (!val || val.trim() === '') {
        newErrors[q.id] = '필수 항목입니다.';
      } else if (q.type === 'multi_choice') {
        try {
          const parsed: string[] = JSON.parse(val);
          if (parsed.length === 0) {
            newErrors[q.id] = '최소 하나 이상 선택해 주세요.';
          }
        } catch {
          newErrors[q.id] = '필수 항목입니다.';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePrev() {
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');

    const payload: AnswerEntry[] = survey.questions.map((q) => ({
      questionId: q.id,
      value: answers[q.id] ?? '',
    }));

    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers: payload }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `제출 실패 (${res.status})`);
      }

      const { responseId } = await res.json();
      router.push(`/result?responseId=${responseId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{survey.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isReviewStep
            ? '답변 확인'
            : `${currentStep + 1} / ${sortedQuestions.length} — ${sectionForCurrentQuestion?.title ?? '질문'}`}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>진행률</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step indicators — 질문당 1칸 + 답변 확인 */}
        <div className="mt-3 flex gap-0.5">
          {sortedQuestions.map((q, idx) => {
            const filled = isReviewStep || idx <= currentStep;
            return (
              <div
                key={q.id}
                className={`h-1 min-w-[4px] flex-1 rounded-full transition-colors ${
                  filled ? 'bg-primary-500' : 'bg-gray-200'
                }`}
                title={`질문 ${idx + 1}`}
              />
            );
          })}
          <div
            className={`h-1 min-w-[6px] flex-[1.2] rounded-full transition-colors ${
              isReviewStep ? 'bg-primary-500' : 'bg-gray-200'
            }`}
            title="답변 확인"
          />
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-700">
        <span className="font-medium text-slate-800">안내 · </span>
        납품되는 최종 결과물에 대해 소규모 세부 조정이 필요하신 경우, 별도 협의를 통해 반영할 수 있습니다.
      </div>

      {/* Content */}
      {isReviewStep ? (
        <ReviewStep
          survey={survey}
          sortedQuestions={sortedQuestions}
          answers={answers}
          questionMap={questionMap}
          onGoToQuestion={(stepIndex) => setCurrentStep(stepIndex)}
        />
      ) : (
        currentQuestion && (
          <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            {sectionForCurrentQuestion?.description && (
              <p className="text-sm text-gray-600">{sectionForCurrentQuestion.description}</p>
            )}
            <div className="space-y-1">
              <QuestionRenderer
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? ''}
                onChange={(v) => updateAnswer(currentQuestion.id, v)}
              />
              {errors[currentQuestion.id] && (
                <p className="text-xs font-medium text-red-500">{errors[currentQuestion.id]}</p>
              )}
            </div>
          </div>
        )
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        {isReviewStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                제출 중...
              </span>
            ) : (
              '제출하기'
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            {isLastQuestion ? '답변 확인' : '다음'}
          </button>
        )}
      </div>
    </main>
  );
}

function ReviewStep({
  survey,
  sortedQuestions,
  answers,
  questionMap,
  onGoToQuestion,
}: {
  survey: SurveyData;
  sortedQuestions: SurveyQuestion[];
  answers: Record<string, string>;
  questionMap: Map<string, SurveyQuestion>;
  onGoToQuestion: (stepIndex: number) => void;
}) {
  function stepIndexForQuestionId(qId: string): number {
    return sortedQuestions.findIndex((q) => q.id === qId);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">
        답변을 확인한 후 제출해 주세요. 수정이 필요하면 항목 옆의 &quot;수정&quot;을 누르세요.
      </div>
      {survey.sections.map((section) => {
        const stepIndices = section.questionIds
          .map((id) => stepIndexForQuestionId(id))
          .filter((i) => i >= 0);
        const firstStepInSection =
          stepIndices.length > 0 ? Math.min(...stepIndices) : 0;

        return (
          <div
            key={section.id}
            className="rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
              <button
                type="button"
                onClick={() => onGoToQuestion(firstStepInSection)}
                className="text-sm font-medium text-primary-600 transition hover:text-primary-700"
              >
                이 섹션으로
              </button>
            </div>
            <div className="divide-y divide-gray-50 px-6">
              {section.questionIds.map((qId) => {
                const q = questionMap.get(qId);
                if (!q) return null;
                const stepIdx = stepIndexForQuestionId(qId);
                return (
                  <div key={qId} className="flex gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-600">{q.label}</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {getDisplayValue(q, answers[qId] ?? '')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onGoToQuestion(stepIdx >= 0 ? stepIdx : 0)}
                      className="shrink-0 self-start text-sm font-medium text-primary-600 transition hover:text-primary-700"
                    >
                      수정
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

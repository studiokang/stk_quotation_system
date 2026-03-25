import { Suspense } from 'react';
import { prisma, withDbResilience } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import type { SurveyQuestion, SurveySchema, SurveySection } from '@/lib/types';
import { SurveyForm } from '@/components/SurveyForm';
import Loading from './loading';

interface PageProps {
  searchParams: { token?: string };
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
        <h1 className="text-2xl font-bold text-gray-900">접근할 수 없습니다</h1>
        <p className="text-gray-600">{message}</p>
        <a
          href="/"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          다시 요청하기
        </a>
      </div>
    </main>
  );
}

const DEFAULT_SECTIONS: SurveySection[] = [
  { id: 'intro', title: '소개', description: '기본 정보를 입력해 주세요.', questionIds: [] },
  { id: 'screening', title: '스크리닝', description: '기본 요구사항을 확인합니다.', questionIds: [] },
  { id: 'core', title: '핵심 질문', description: '핵심 요구사항을 파악합니다.', questionIds: [] },
  { id: 'deep_dive', title: '심층 분석', description: '상세 요구사항을 확인합니다.', questionIds: [] },
  { id: 'demographics', title: '기본 정보', description: '마지막 정보를 입력해 주세요.', questionIds: [] },
];

function buildSections(
  schema: unknown,
  questions: SurveyQuestion[],
): SurveySection[] {
  const parsed = schema as SurveySchema | null;

  if (parsed?.sections?.length) {
    return parsed.sections.filter((s) => s.questionIds.length > 0);
  }

  const sectionCount = DEFAULT_SECTIONS.length;
  const perSection = Math.ceil(questions.length / sectionCount);
  const sorted = [...questions].sort((a, b) => a.order - b.order);

  return DEFAULT_SECTIONS.map((section, idx) => ({
    ...section,
    questionIds: sorted
      .slice(idx * perSection, (idx + 1) * perSection)
      .map((q) => q.id),
  })).filter((s) => s.questionIds.length > 0);
}

async function SurveyContent({ token }: { token: string }) {
  const payload = verifyToken(token);

  if (!payload) {
    logger.warn({ module: 'survey-page' }, 'Invalid or expired survey token');
    return <ErrorPage message="유효하지 않거나 만료된 링크입니다. 새로운 설문 링크를 요청해 주세요." />;
  }

  const survey = await withDbResilience(
    () =>
      prisma.survey.findUnique({
        where: { id: payload.surveyId },
        include: { questions: { orderBy: { order: 'asc' } } },
      }),
    'survey-page-load',
  );

  if (!survey) {
    return <ErrorPage message="요청하신 설문을 찾을 수 없습니다." />;
  }

  const questions: SurveyQuestion[] = survey.questions.map((q) => ({
    id: q.id,
    type: q.type as SurveyQuestion['type'],
    label: q.label,
    options: q.options as string[] | null,
    order: q.order,
    required: q.required,
  }));

  const sections = buildSections(survey.schema, questions);

  return (
    <SurveyForm
      survey={{ id: survey.id, title: survey.title, sections, questions }}
      token={token}
    />
  );
}

export default function SurveyPage({ searchParams }: PageProps) {
  const { token } = searchParams;

  if (!token) {
    return <ErrorPage message="설문 토큰이 제공되지 않았습니다. 이메일의 링크를 다시 확인해 주세요." />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <SurveyContent token={token} />
    </Suspense>
  );
}

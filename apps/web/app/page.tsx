import { prisma } from '@/lib/prisma';
import { SurveyStarter } from '@/components/SurveyStarter';

export default async function HomePage() {
  const surveys = await prisma.survey.findMany({
    select: { id: true, title: true },
    orderBy: { id: 'asc' },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Survey Quote System
          </h1>
          <p className="text-lg text-gray-500">설문 기반 맞춤 견적 시스템</p>
        </div>

        {surveys.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <p className="text-gray-500">등록된 설문이 없습니다.</p>
          </div>
        ) : (
          <SurveyStarter surveys={surveys} />
        )}
      </div>
    </main>
  );
}

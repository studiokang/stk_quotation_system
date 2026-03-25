import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-local-secret-key-for-testing-only-32chars!!';

async function main() {
  console.log('Seeding database...');

  await prisma.answer.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.response.deleteMany();
  await prisma.question.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { email: 'demo@example.com' },
  });
  console.log(`User created: ${user.email} (${user.id})`);

  const survey = await prisma.survey.create({
    data: {
      title: '맞춤 영상 제작 견적 설문',
      schema: {
        quoteMode: 'video_production',
        sections: [] as Array<{
          id: string;
          title: string;
          description?: string;
          questionIds: string[];
        }>,
        pricingRules: [] as Array<unknown>,
      },
      questions: {
        create: [
          {
            type: 'single_choice',
            label: '영상 길이를 선택해 주세요.',
            options: ['30초', '60초', '90초 이상'],
            order: 1,
            required: true,
          },
          {
            type: 'single_choice',
            label: '영상 목적을 선택해 주세요.',
            options: ['브랜드 홍보', '제품 소개', 'SNS 광고', '기타'],
            order: 2,
            required: true,
          },
          {
            type: 'text',
            label: '참고할 레퍼런스 영상이나 스타일이 있나요?',
            options: null,
            order: 3,
            required: false,
          },
          {
            type: 'single_choice',
            label: 'AI 나레이션 포함 여부',
            options: ['포함', '미포함'],
            order: 4,
            required: true,
          },
          {
            type: 'single_choice',
            label: 'BGM 포함 여부',
            options: ['포함', '미포함', '보유한 BGM 사용'],
            order: 5,
            required: true,
          },
          {
            type: 'single_choice',
            label: '추가 수정 횟수',
            options: ['기본 1회 무료', '1회 추가(100,000)', '2회 추가(200,000)'],
            order: 6,
            required: true,
          },
          {
            type: 'date',
            label: '희망 납기일',
            options: null,
            order: 7,
            required: true,
          },
          {
            type: 'text',
            label: '기타 요청사항',
            options: null,
            order: 8,
            required: false,
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  console.log(`Survey created: "${survey.title}" (${survey.questions.length} questions)`);

  const q = survey.questions;
  const sections = [
    {
      id: 'basic',
      title: '영상 기본',
      description: '길이와 목적을 알려주세요.',
      questionIds: [q[0]!.id, q[1]!.id],
    },
    {
      id: 'options',
      title: '제작 옵션',
      description: '나레이션, BGM, 수정 횟수 등을 선택해 주세요.',
      questionIds: [q[2]!.id, q[3]!.id, q[4]!.id, q[5]!.id],
    },
    {
      id: 'schedule',
      title: '일정·기타',
      description: '납기와 추가 요청사항을 입력해 주세요.',
      questionIds: [q[6]!.id, q[7]!.id],
    },
  ];

  await prisma.survey.update({
    where: { id: survey.id },
    data: {
      schema: {
        quoteMode: 'video_production',
        sections,
        pricingRules: [],
      },
    },
  });

  console.log('Survey schema updated with sections (video_production)');

  const token = jwt.sign(
    { userId: user.id, surveyId: survey.id },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '30d' },
  );

  console.log('\n========================================');
  console.log('  SEED COMPLETE');
  console.log('========================================');
  console.log(`\n  Survey URL:`);
  console.log(`  http://localhost:3000/survey?token=${token}`);
  console.log('\n========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

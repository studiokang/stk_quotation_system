import { sendQuoteEmail } from '../packages/email/src/sender';

async function main() {
  await sendQuoteEmail({
    to: 'jieuny@promlabs.ai',
    responseId: 'test-response-id',
    quoteId: 'test-quote-id-12345678',
    pdfPath: './test.pdf',
    totalPrice: 3850000,
    summary: 'AI 광고 영상 제작 견적입니다. 30~60초 분량으로 긴급 납기 기준으로 산정되었습니다.',
  });
  console.log('Test email sent!');
}

main().catch(console.error);

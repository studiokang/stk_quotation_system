import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface QuotePdfData {
  quoteId: string;
  userName: string;
  surveyTitle: string;
  totalPrice: number;
  details: Array<{ label: string; value: string; price: number }>;
  createdAt: Date;
}

function buildHtml(data: QuotePdfData): string {
  const rows = data.details
    .map(
      (d) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.label}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.value}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₩${d.price.toLocaleString()}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Pretendard', sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { text-align: left; padding: 8px; background: #f5f5f5; border-bottom: 2px solid #ddd; }
    th:last-child { text-align: right; }
    .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 16px; }
    .footer { margin-top: 40px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>견적서</h1>
  <div class="meta">
    <p>견적 번호: ${data.quoteId}</p>
    <p>고객명: ${data.userName}</p>
    <p>설문: ${data.surveyTitle}</p>
    <p>발행일: ${data.createdAt.toLocaleDateString('ko-KR')}</p>
  </div>
  <table>
    <thead><tr><th>항목</th><th>선택</th><th>금액</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">총 견적 금액: ₩${data.totalPrice.toLocaleString()}</div>
  <div class="footer">본 견적서는 발행일로부터 30일간 유효합니다.</div>
</body>
</html>`;
}

const DEFAULT_PDF_DIR = path.join(os.tmpdir(), 'quotes');

export async function generateQuotePdf(
  data: QuotePdfData,
  outputDir: string = DEFAULT_PDF_DIR,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `quote-${data.quoteId}.pdf`);

  const browser = await puppeteerCore.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(data), { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
  } finally {
    await browser.close();
  }

  return filePath;
}

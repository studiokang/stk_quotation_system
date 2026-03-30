import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { prisma } from '@repo/db';
import { renderQuoteHTML, DEFAULT_ISSUER } from './template';
import type { QuoteData, QuoteLineItem } from './template';

const PDF_DIR = path.join(os.tmpdir(), 'quotes');

/**
 * Full pipeline: load quote from DB → render HTML → generate PDF → save → update DB.
 * Returns the absolute file path of the generated PDF.
 */
export async function generateQuotePDF(quoteId: string): Promise<string> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      response: {
        include: {
          user: true,
          survey: true,
          answers: {
            include: { question: true },
          },
        },
      },
    },
  });

  if (!quote) {
    throw new Error(`Quote not found: ${quoteId}`);
  }

  const { response } = quote;
  const details = quote.detailJson as unknown as QuoteLineItem[];

  const data: QuoteData = {
    quoteId: quote.id,
    clientEmail: response.user.email,
    surveyTitle: response.survey.title,
    totalPrice: quote.totalPrice,
    items: details,
    createdAt: quote.createdAt,
    issuer: DEFAULT_ISSUER,
    docMeta: {
      projectTitle: response.survey.title,
    },
  };

  const html = renderQuoteHTML(data);

  await fs.mkdir(PDF_DIR, { recursive: true });
  const filePath = path.join(PDF_DIR, `${quoteId}.pdf`);

  const browser = await puppeteerCore.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      displayHeaderFooter: false,
    });
  } finally {
    await browser.close();
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { pdfPath: filePath },
  });

  return filePath;
}

/**
 * Resolve the PDF file path for a given quoteId.
 * Returns null if the file doesn't exist on disk.
 */
export async function getQuotePDFPath(quoteId: string): Promise<string | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { pdfPath: true },
  });

  if (!quote?.pdfPath) return null;

  try {
    await fs.access(quote.pdfPath);
    return quote.pdfPath;
  } catch {
    return null;
  }
}

// CRON: 30일 이상 된 PDF 파일 정리
// 권장 스케줄: 매일 03:00 실행
// 0 3 * * * node -e "require('@repo/pdf').cleanupOldPDFs()"
export async function cleanupOldPDFs(maxAgeDays = 30): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  try {
    const files = await fs.readdir(PDF_DIR);
    for (const file of files) {
      if (!file.endsWith('.pdf')) continue;
      const filePath = path.join(PDF_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        deleted++;
      }
    }
  } catch {
    // PDF_DIR doesn't exist yet — nothing to clean
  }

  return deleted;
}

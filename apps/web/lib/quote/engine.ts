import { Prisma } from '@prisma/client';
import { prisma, withDbResilience } from '@/lib/prisma';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendQuoteEmail } from '@repo/email';
import type { QuoteLineItem } from '@repo/pdf';
import { calculateVideoProductionQuote } from '@/lib/quote/video-production-quote';

interface PricingRule {
  questionId: string;
  label: string;
  priceMap: Record<string, number>;
  defaultPrice: number;
}

/**
 * Core quote generation pipeline.
 * Calculates prices from survey answers, creates a Quote record,
 * then triggers PDF generation and email delivery asynchronously.
 * @param responseId - The survey response ID to generate a quote for.
 * @returns The created quote ID.
 */
export async function generateQuote(responseId: string): Promise<string> {
  const log = logger.child({ responseId, module: 'quote-engine' });
  log.info('Quote generation started');

  const response = await withDbResilience(
    () =>
      prisma.response.findUnique({
        where: { id: responseId },
        include: {
          user: true,
          survey: { include: { questions: true } },
          answers: { include: { question: true } },
        },
      }),
    'engine-find-response',
  );

  if (!response) {
    throw new Error(`Response not found: ${responseId}`);
  }

  const existingQuote = await withDbResilience(
    () => prisma.quote.findUnique({ where: { responseId } }),
    'engine-find-existing-quote',
  );
  if (existingQuote) {
    log.info({ quoteId: existingQuote.id }, 'Quote already exists, skipping');
    return existingQuote.id;
  }

  const schemaObj = response.survey.schema as Record<string, unknown> | null;
  const isVideoProduction = schemaObj?.quoteMode === 'video_production';

  const { items, totalPrice } = isVideoProduction
    ? calculateVideoProductionQuote(
        response.answers.map((a) => ({
          value: a.value,
          question: {
            order: a.question.order,
            label: a.question.label,
            type: a.question.type,
          },
        })),
      )
    : calculatePrice(response.answers, extractPricingRules(response.survey.schema));

  const quote = await withDbResilience(
    () =>
      prisma.quote.create({
        data: { responseId, totalPrice, detailJson: items as Prisma.InputJsonValue },
      }),
    'engine-create-quote',
  );

  log.info({ quoteId: quote.id, totalPrice }, 'Quote created, triggering PDF/email');

  generateQuotePDFAndEmail({
    quoteId: quote.id,
    responseId,
    userEmail: response.user.email,
    surveyTitle: response.survey.title,
    totalPrice,
    items,
  }).catch((err) => {
    log.error({ err: String(err), quoteId: quote.id }, 'PDF/email pipeline failed');
  });

  return quote.id;
}

interface PDFEmailParams {
  quoteId: string;
  responseId: string;
  userEmail: string;
  surveyTitle: string;
  totalPrice: number;
  items: QuoteLineItem[];
}

async function generateQuotePDFAndEmail(params: PDFEmailParams): Promise<void> {
  const { quoteId, responseId, userEmail, surveyTitle, totalPrice, items } = params;
  const log = logger.child({ quoteId, responseId, module: 'quote-engine' });

  log.info('PDF generation started');
  const { generateQuotePDF } = await import('@repo/pdf');
  const pdfPath = await generateQuotePDF(quoteId);
  log.info({ pdfPath }, 'PDF generation completed');

  if (!env.RESEND_API_KEY) {
    log.warn('RESEND_API_KEY not set, skipping email');
    return;
  }

  const vat = Math.round(totalPrice * 0.1);
  const grandTotal = totalPrice + vat;
  const lineSupply = (i: QuoteLineItem) => i.amount ?? i.price;
  const summary = items
    .filter((i) => lineSupply(i) > 0)
    .map((i) => `${i.label}: ${i.value}`)
    .join(', ');

  try {
    await sendQuoteEmail({
      from: env.EMAIL_FROM,
      to: userEmail,
      responseId,
      quoteId,
      pdfPath,
      totalPrice: grandTotal,
      summary: `${surveyTitle} 기반 견적입니다. ${summary}`,
    });
    log.info({ to: userEmail }, 'Quote email sent via Resend');
  } catch (err) {
    log.error({ err: String(err), to: userEmail }, 'Failed to send quote email');
  }
}

function extractPricingRules(schema: unknown): PricingRule[] {
  if (!schema || typeof schema !== 'object') return [];
  const s = schema as Record<string, unknown>;
  if (Array.isArray(s.pricingRules)) {
    return s.pricingRules as PricingRule[];
  }
  return [];
}

interface AnswerWithQuestion {
  value: string;
  question: { id: string; label: string; type: string; order?: number };
}

function calculatePrice(
  answers: AnswerWithQuestion[],
  pricingRules: PricingRule[],
): { items: QuoteLineItem[]; totalPrice: number } {
  const ruleMap = new Map(pricingRules.map((r) => [r.questionId, r]));
  const items: QuoteLineItem[] = [];

  for (const answer of answers) {
    if (!answer.value) continue;

    const rule = ruleMap.get(answer.question.id);

    if (rule) {
      const price = resolvePrice(answer.value, answer.question.type, rule);
      const valueText = formatAnswerValue(answer.value, answer.question.type);
      items.push({
        label: rule.label || answer.question.label,
        value: valueText,
        price,
        detail: valueText,
        quantity: price > 0 ? 1 : null,
        unitPrice: price > 0 ? price : null,
      });
    } else {
      const valueText = formatAnswerValue(answer.value, answer.question.type);
      items.push({
        label: answer.question.label,
        value: valueText,
        price: 0,
        detail: valueText,
        quantity: null,
        unitPrice: null,
      });
    }
  }

  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  return { items: items.filter((i) => i.price > 0 || i.value), totalPrice };
}

function resolvePrice(value: string, type: string, rule: PricingRule): number {
  if (type === 'multi_choice') {
    try {
      const selected: string[] = JSON.parse(value);
      return selected.reduce(
        (sum, v) => sum + (rule.priceMap[v] ?? rule.defaultPrice),
        0,
      );
    } catch {
      return rule.defaultPrice;
    }
  }
  return rule.priceMap[value] ?? rule.defaultPrice;
}

function formatAnswerValue(value: string, type: string): string {
  if (type === 'multi_choice') {
    try {
      const parsed: string[] = JSON.parse(value);
      return parsed.join(', ');
    } catch {
      return value;
    }
  }
  if (type === 'scale') {
    return `${value} / 10`;
  }
  return value;
}

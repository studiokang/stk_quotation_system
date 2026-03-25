import { Resend } from 'resend';
import fs from 'node:fs';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendQuoteEmailParams {
  to: string;
  responseId: string;
  quoteId: string;
  pdfPath: string;
  totalPrice: number;
  summary: string;
  /** 발신 주소. 생략 시 `process.env.EMAIL_FROM` 사용. */
  from?: string;
}

function resolveFrom(explicit?: string): string {
  const from = explicit ?? process.env.EMAIL_FROM;
  if (!from?.trim()) {
    throw new Error('EMAIL_FROM is not set: pass `from` or set the EMAIL_FROM environment variable.');
  }
  return from;
}

export async function sendQuoteEmail(params: SendQuoteEmailParams) {
  const { to, responseId, quoteId, pdfPath, totalPrice, summary, from: fromOverride } = params;
  const from = resolveFrom(fromOverride);

  const quoteNumber = `QT-${quoteId.slice(0, 8).toUpperCase()}`;
  const resultUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/result?responseId=${responseId}`;
  const formattedPrice = totalPrice.toLocaleString('ko-KR');

  const pdfBuffer = fs.readFileSync(pdfPath);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `[AI STUDIO] 맞춤 견적서가 도착했습니다`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">견적서가 완성되었습니다</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          안녕하세요! AI STUDIO입니다.<br/>
          요청하신 맞춤 견적서를 보내드립니다.
        </p>

        <div style="background: #f8f8f8; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="color: #999; font-size: 14px; margin: 0 0 8px;">견적 번호: ${quoteNumber}</p>
          <p style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">
            ₩${formattedPrice}
          </p>
          <p style="color: #999; font-size: 13px; margin: 8px 0 0;">VAT 포함</p>
        </div>

        <p style="color: #444; font-size: 15px; line-height: 1.7;">${summary}</p>

        <a href="${resultUrl}"
           style="display: inline-block; background: #2563eb; color: white;
                  padding: 14px 28px; border-radius: 8px; text-decoration: none;
                  font-size: 16px; font-weight: bold; margin: 24px 0;">
          견적서 온라인으로 확인하기
        </a>

        <p style="color: #555; font-size: 14px; line-height: 1.65; margin: 24px 0 0; padding: 16px; background: #f4f4f5; border-radius: 8px;">
          납품되는 최종 결과물에 대해 소규모 세부 조정이 필요하신 경우, 별도 협의를 통해 반영할 수 있습니다.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;"/>
        <p style="color: #999; font-size: 13px;">
          본 견적서는 발행일로부터 30일간 유효합니다.<br/>
          궁금하신 점은 언제든지 문의해주세요.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${quoteNumber}_견적서.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error('[Email] Resend error:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log('[Email] Sent successfully:', data?.id);
}

export async function sendSurveyEmail(to: string, token: string, fromOverride?: string) {
  const from = resolveFrom(fromOverride);
  const surveyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/survey?token=${token}`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: '맞춤 견적을 위한 설문을 작성해 주세요',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">설문 링크가 도착했습니다</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          아래 버튼을 눌러 설문을 작성해주시면<br/>
          AI가 맞춤 견적서를 자동으로 생성해드립니다.
        </p>
        <a href="${surveyUrl}"
           style="display: inline-block; background: #2563eb; color: white;
                  padding: 14px 28px; border-radius: 8px; text-decoration: none;
                  font-size: 16px; font-weight: bold; margin: 24px 0;">
          설문 작성하기
        </a>
        <p style="color: #999; font-size: 13px;">
          링크는 7일 동안 유효합니다.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Email] Survey invite error:', error);
    throw new Error(`Survey email failed: ${error.message}`);
  }
}

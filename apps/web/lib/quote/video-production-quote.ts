import type { QuoteLineItem } from '@repo/pdf';

/** 스키마 플래그: Survey.schema.quoteMode === 'video_production' 일 때 사용 */

export const VIDEO_LENGTH_TO_IMAGES: Record<string, number> = {
  '30초': 12,
  '60초': 20,
  '90초 이상': 30,
};

const UNIT = {
  imageGenerate: 50_000,
  imageRetouching: 30_000,
  imageToVideo: 70_000,
} as const;

/** Edit 단가 (90초 이상은 별도 협의 → 금액 0) */
const EDIT_PRICE: Record<string, number> = {
  '30초': 400_000,
  '60초': 500_000,
  '90초 이상': 0,
};

/** 2D 단가 */
const D2_PRICE: Record<string, number> = {
  '30초': 1_000_000,
  '60초': 1_500_000,
  '90초 이상': 0,
};

const NARRATION_PRICE = 200_000;
const BGM_INCLUDED_PRICE = 100_000;

const REVISION_EXTRA: Record<string, number> = {
  '기본 1회 무료': 0,
  '1회 추가(100,000)': 100_000,
  '2회 추가(200,000)': 200_000,
};

interface AnswerRow {
  value: string;
  question: { order: number; label: string; type: string };
}

function line(
  partial: Omit<QuoteLineItem, 'label' | 'value' | 'price'> & {
    label: string;
    value: string;
    price: number;
  },
): QuoteLineItem {
  const price = partial.price;
  const amount = partial.amount ?? price;
  const tax = partial.tax ?? (amount > 0 ? Math.round(amount * 0.1) : 0);
  return {
    label: partial.label,
    value: partial.value,
    price,
    detail: partial.detail ?? partial.value,
    quantity: partial.quantity ?? null,
    unitPrice: partial.unitPrice ?? null,
    amount,
    tax,
  };
}

/**
 * 영상 제작 견적: 고정 항목 구조 + 답변 기반 수량/옵션
 */
export function calculateVideoProductionQuote(
  answers: AnswerRow[],
): { items: QuoteLineItem[]; totalPrice: number } {
  const orderToValue = new Map<number, string>();
  for (const a of answers) {
    if (a.value && a.value.trim() !== '') {
      orderToValue.set(a.question.order, a.value);
    }
  }

  const videoLen = orderToValue.get(1) ?? '30초';
  const images = VIDEO_LENGTH_TO_IMAGES[videoLen] ?? 12;
  const purpose = orderToValue.get(2) ?? '';
  const refText = orderToValue.get(3) ?? '';
  const narration = orderToValue.get(4) ?? '';
  const bgmChoice = orderToValue.get(5) ?? '';
  const revisionChoice = orderToValue.get(6) ?? '기본 1회 무료';
  const dueDate = orderToValue.get(7) ?? '';
  const otherReq = orderToValue.get(8) ?? '';

  const promptDetail = [
    `영상 목적: ${purpose || '-'}`,
    refText ? `레퍼런스/스타일: ${refText}` : null,
    dueDate ? `희망 납기: ${dueDate}` : null,
    otherReq ? `기타 요청: ${otherReq}` : null,
  ]
    .filter(Boolean)
    .join(' / ');

  const items: QuoteLineItem[] = [];

  items.push(
    line({
      label: 'Prompt Engineering',
      value: purpose || '—',
      price: 0,
      detail: promptDetail || '이미지 제작을 위한 프롬프트 최적화 설계',
      quantity: null,
      unitPrice: null,
      amount: 0,
      tax: 0,
    }),
  );

  const imgGen = images * UNIT.imageGenerate;
  items.push(
    line({
      label: 'Image Generate',
      value: `${images}장`,
      price: imgGen,
      detail: '베이스 이미지 생성',
      quantity: images,
      unitPrice: UNIT.imageGenerate,
      amount: imgGen,
      tax: Math.round(imgGen * 0.1),
    }),
  );

  const imgRet = images * UNIT.imageRetouching;
  items.push(
    line({
      label: 'Image Retouching',
      value: `${images}장`,
      price: imgRet,
      detail: 'AI 생성물 정밀 보정',
      quantity: images,
      unitPrice: UNIT.imageRetouching,
      amount: imgRet,
      tax: Math.round(imgRet * 0.1),
    }),
  );

  const imgVid = images * UNIT.imageToVideo;
  items.push(
    line({
      label: 'Image to Video',
      value: `${images}장`,
      price: imgVid,
      detail: '이미지를 영상으로 변환',
      quantity: images,
      unitPrice: UNIT.imageToVideo,
      amount: imgVid,
      tax: Math.round(imgVid * 0.1),
    }),
  );

  const editUnit = EDIT_PRICE[videoLen] ?? 0;
  const editDetail =
    videoLen === '90초 이상'
      ? '90초 이상 — 금액 별도 협의'
      : `영상 편집 (${videoLen} 기준)`;
  items.push(
    line({
      label: 'Edit',
      value: videoLen === '90초 이상' ? '별도 협의' : '1건',
      price: editUnit,
      detail: editDetail,
      quantity: videoLen === '90초 이상' ? null : 1,
      unitPrice: editUnit > 0 ? editUnit : null,
      amount: editUnit,
      tax: Math.round(editUnit * 0.1),
    }),
  );

  const d2Unit = D2_PRICE[videoLen] ?? 0;
  const d2Detail =
    videoLen === '90초 이상'
      ? '90초 이상 — 금액 별도 협의'
      : `영상 합성 및 자막 2D (${videoLen})`;
  items.push(
    line({
      label: '2D',
      value: videoLen === '90초 이상' ? '별도 협의' : '1건',
      price: d2Unit,
      detail: d2Detail,
      quantity: d2Unit > 0 ? 1 : null,
      unitPrice: d2Unit > 0 ? d2Unit : null,
      amount: d2Unit,
      tax: Math.round(d2Unit * 0.1),
    }),
  );

  const narrOn = narration === '포함';
  items.push(
    line({
      label: 'AI Narration',
      value: narrOn ? '포함' : '미포함',
      price: narrOn ? NARRATION_PRICE : 0,
      detail: 'AI 나레이션',
      quantity: narrOn ? 1 : null,
      unitPrice: narrOn ? NARRATION_PRICE : null,
      amount: narrOn ? NARRATION_PRICE : 0,
      tax: narrOn ? Math.round(NARRATION_PRICE * 0.1) : 0,
    }),
  );

  let bgmAmount = 0;
  let bgmDetail = 'BGM 구입';
  if (bgmChoice === '포함') {
    bgmAmount = BGM_INCLUDED_PRICE;
  } else if (bgmChoice === '보유한 BGM 사용') {
    bgmDetail = '고객 보유 BGM 사용 (별도 구입 비용 없음)';
  } else if (bgmChoice === '미포함') {
    bgmDetail = 'BGM 미포함';
  }
  items.push(
    line({
      label: 'BGM',
      value: bgmChoice || '—',
      price: bgmAmount,
      detail: bgmDetail,
      quantity: bgmAmount > 0 ? 1 : null,
      unitPrice: bgmAmount > 0 ? BGM_INCLUDED_PRICE : null,
      amount: bgmAmount,
      tax: bgmAmount > 0 ? Math.round(bgmAmount * 0.1) : 0,
    }),
  );

  const revExtra = REVISION_EXTRA[revisionChoice] ?? 0;
  items.push(
    line({
      label: '추가 수정',
      value: revisionChoice,
      price: revExtra,
      detail: '기본 1회 무료 외 추가 수정 비용',
      quantity: revExtra > 0 ? 1 : null,
      unitPrice: revExtra > 0 ? revExtra : null,
      amount: revExtra,
      tax: revExtra > 0 ? Math.round(revExtra * 0.1) : 0,
    }),
  );

  const totalPrice = items.reduce((sum, i) => sum + (i.amount ?? i.price), 0);
  return { items, totalPrice };
}

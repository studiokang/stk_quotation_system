/**
 * 견적 상세 줄 — DB `Quote.detailJson` 배열 요소.
 * 기존 `{ label, value, price }` 만 있어도 되고, 아래 선택 필드로 실제 견적서 형식을 채울 수 있습니다.
 */
export interface QuoteLineItem {
  label: string;
  value: string;
  /** 공급가 합산에 쓰는 줄 금액(부가세 전, 엔진 기본값) */
  price: number;
  /** 세부내용 — 없으면 `value` 사용 */
  detail?: string;
  /** 수량 — 없으면 `price`가 있으면 1, 없으면 표시용 `-` */
  quantity?: number | null;
  /** 단가 — 없으면 수량 1일 때 `price`와 동일하게 표시 */
  unitPrice?: number | null;
  /** 해당 줄 공급가(금액 컬럼) — 없으면 `price` */
  amount?: number;
  /** 해당 줄 세액 — 없으면 `round(amount*0.1)` */
  tax?: number;
}

/** 발행처(공급자) — PDF 기본값은 PROMLABS 스타일 */
export interface QuoteIssuerMeta {
  companyName: string;
  ceoName: string;
  bizNumber: string;
  phone: string;
  address: string;
  email: string;
}

/** 문서 상단 메타 */
export interface QuoteDocMeta {
  /** 수신 (예: 고객사명) — 없으면 이메일 @ 앞부분 */
  recipient?: string;
  /** 견적명 — 없으면 surveyTitle */
  projectTitle?: string;
  /** 유효기간 문구 */
  validityNote?: string;
}

export interface QuoteData {
  quoteId: string;
  clientEmail: string;
  surveyTitle: string;
  /** 공급가 합계 (부가세 전) — 엔진의 totalPrice */
  totalPrice: number;
  items: QuoteLineItem[];
  createdAt: Date;
  issuer?: QuoteIssuerMeta;
  docMeta?: QuoteDocMeta;
}

/** 기본 발행처 — ㈜프롬랩스 (예시, 운영 시 env/설정으로 교체 가능) */
export const DEFAULT_ISSUER: QuoteIssuerMeta = {
  companyName: '㈜프롬랩스',
  ceoName: '강동훈',
  bizNumber: '681-81-02558',
  phone: '0502-1913-3341',
  address: '경기도 수원시 영통구 광교산로 154-42, 507, 508호',
  email: 'business@promlabs.ai',
};

function formatQuoteNumber(quoteId: string): string {
  return `QT-${quoteId.slice(0, 8).toUpperCase()}`;
}

/** 예: 2026. 3. 9. */
function formatDateDots(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}. ${m}. ${d}.`;
}

function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

function formatCellNum(n: number | null | undefined, empty: string): string {
  if (n === null || n === undefined || (typeof n === 'number' && n === 0 && empty === '-')) {
    return empty;
  }
  if (typeof n === 'number' && n !== 0) {
    return n.toLocaleString('ko-KR');
  }
  return empty;
}

const NUM = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

/** 1~9999 한글 (금액용 단순 변환) */
function readUnder10000(n: number): string {
  if (n <= 0 || n >= 10000) return '';
  let rest = n;
  let s = '';
  if (rest >= 1000) {
    const d = Math.floor(rest / 1000);
    s += (d === 1 ? '' : NUM[d]) + '천';
    rest %= 1000;
  }
  if (rest >= 100) {
    const d = Math.floor(rest / 100);
    s += NUM[d] + '백';
    rest %= 100;
  }
  if (rest >= 10) {
    const d = Math.floor(rest / 10);
    if (d === 1) s += '십';
    else s += NUM[d] + '십';
    rest %= 10;
  }
  if (rest > 0) s += NUM[rest];
  return s;
}

/** 정수 원 단위 → 한글 금액 (일금 … 원) */
export function amountToKoreanWon(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '영';
  if (amount === 0) return '영';
  const n = Math.floor(amount);
  const uk = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const rest = n % 10000;
  let parts: string[] = [];
  if (uk > 0) parts.push(readUnder10000(uk) + '억');
  if (man > 0) parts.push(readUnder10000(man) + '만');
  if (rest > 0) parts.push(readUnder10000(rest));
  return parts.join(' ') || '영';
}

function recipientFromEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  return email.slice(0, at);
}

export interface NormalizedLine {
  label: string;
  detail: string;
  qtyDisplay: string;
  unitDisplay: string;
  amount: number;
  tax: number;
  isDashRow: boolean;
}

function normalizeLines(items: QuoteLineItem[]): NormalizedLine[] {
  return items.map((item) => {
    const detail = item.detail ?? item.value;
    const baseAmount = item.amount ?? item.price;
    const hasMoney = baseAmount > 0;
    const qty = item.quantity ?? (hasMoney ? 1 : null);
    const unitPrice = item.unitPrice ?? (hasMoney && qty === 1 ? item.price : item.unitPrice);
    const amount = hasMoney ? baseAmount : 0;
    const tax = item.tax ?? (hasMoney ? Math.round(amount * 0.1) : 0);

    const isDashRow = !hasMoney;
    const qtyDisplay = isDashRow ? '-' : qty !== null && qty !== undefined ? String(qty) : '1';
    let unitDisplay = '-';
    if (!isDashRow) {
      if (unitPrice !== null && unitPrice !== undefined && unitPrice > 0) {
        unitDisplay = unitPrice.toLocaleString('ko-KR');
      } else if (qty === 1 || qty === null) {
        unitDisplay = amount.toLocaleString('ko-KR');
      } else {
        unitDisplay = amount > 0 && qty ? Math.round(amount / qty).toLocaleString('ko-KR') : '-';
      }
    }

    return {
      label: item.label,
      detail,
      qtyDisplay,
      unitDisplay,
      amount,
      tax,
      isDashRow,
    };
  });
}

export function renderQuoteHTML(data: QuoteData): string {
  const issuer = data.issuer ?? DEFAULT_ISSUER;
  const doc = data.docMeta ?? {};
  const recipient = doc.recipient ?? recipientFromEmail(data.clientEmail);
  const projectTitle = doc.projectTitle ?? data.surveyTitle;
  const validityNote = doc.validityNote ?? '견적일로부터 3개월';
  const quoteNumber = formatQuoteNumber(data.quoteId);
  const issueDateDots = formatDateDots(data.createdAt);

  const subtotal = data.totalPrice;
  const vat = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + vat;

  const lines = normalizeLines(data.items);
  const rows = lines
    .map(
      (row, idx) => `
      <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
        <td class="cell cell-item">${escapeHtml(row.label)}</td>
        <td class="cell cell-detail">${escapeHtml(row.detail)}</td>
        <td class="cell cell-num">${row.isDashRow ? '-' : escapeHtml(row.qtyDisplay)}</td>
        <td class="cell cell-right">${row.isDashRow ? '-' : row.unitDisplay}</td>
        <td class="cell cell-right">${row.isDashRow ? '-' : row.amount.toLocaleString('ko-KR')}</td>
        <td class="cell cell-right">${row.isDashRow ? '-' : row.tax.toLocaleString('ko-KR')}</td>
      </tr>`,
    )
    .join('');

  const totalAmountDisplay = subtotal.toLocaleString('ko-KR');
  const totalTaxDisplay = vat.toLocaleString('ko-KR');

  const koreanGrand = amountToKoreanWon(grandTotal);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>견적서 ${quoteNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm 18mm 12mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-size: 9px;
        color: #888;
        font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.08em;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid #111;
    }
    .top-grid {
      display: table;
      width: 100%;
      margin-bottom: 14px;
    }
    .top-left, .top-right {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .top-right { padding-left: 16px; }
    .kv { margin-bottom: 5px; font-size: 11px; }
    .kv .k { color: #555; display: inline-block; min-width: 72px; }
    .kv .v { font-weight: 600; color: #111; }
    .issuer-box {
      border: 1px solid #ccc;
      padding: 10px 12px;
      font-size: 10px;
      line-height: 1.55;
    }
    .issuer-box .co { font-weight: 700; font-size: 12px; margin-bottom: 6px; }
    .stamp {
      display: inline-block;
      margin-left: 6px;
      padding: 2px 8px;
      border: 1px solid #c00;
      color: #b00;
      font-size: 9px;
      border-radius: 50%;
      transform: rotate(-12deg);
      opacity: 0.85;
    }
    .amount-banner {
      background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 100%);
      border: 1px solid #d1d5db;
      padding: 12px 16px;
      margin-bottom: 14px;
      text-align: center;
    }
    .amount-banner .hangul { font-size: 15px; font-weight: 700; letter-spacing: 0.05em; }
    .amount-banner .num { font-size: 13px; margin-top: 6px; color: #333; }
    .amount-banner .note { font-size: 10px; color: #666; margin-top: 4px; }
    table.quote-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .quote-table thead th {
      background: #f0f0f0;
      border: 1px solid #bbb;
      padding: 8px 6px;
      font-weight: 600;
      text-align: center;
      color: #333;
    }
    .quote-table .cell {
      border: 1px solid #ccc;
      padding: 8px 6px;
      vertical-align: top;
    }
    .cell-item { width: 14%; font-weight: 600; }
    .cell-detail { width: 32%; }
    .cell-num { width: 8%; text-align: center; }
    .cell-right { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .row-alt { background: #fafafa; }
    .sum-row td {
      font-weight: 700;
      background: #f5f5f5;
      border: 1px solid #bbb;
      padding: 8px 6px;
      text-align: right;
    }
    .sum-row .sum-label { text-align: center; }
    .bottom-totals {
      margin-top: 12px;
      float: right;
      width: 240px;
      border: 1px solid #bbb;
      border-collapse: collapse;
      font-size: 11px;
    }
    .bottom-totals td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e5e5;
    }
    .bottom-totals td:first-child {
      background: #fafafa;
      color: #555;
      width: 42%;
    }
    .bottom-totals td:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .bottom-totals tr:last-child td {
      border-bottom: none;
      font-size: 13px;
      background: #f0f0f0;
    }
    .clear { clear: both; }
    .footer-note {
      margin-top: 56px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #666;
      line-height: 1.7;
    }
    .footer-ref { font-size: 9px; color: #999; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="doc-title">PROMLABS 견적서</div>

  <div class="top-grid">
    <div class="top-left">
      <div class="kv"><span class="k">수신</span><span class="v">${escapeHtml(recipient)}</span></div>
      <div class="kv"><span class="k">견적명</span><span class="v">${escapeHtml(projectTitle)}</span></div>
      <div class="kv"><span class="k">견적날짜</span><span class="v">${issueDateDots}</span></div>
      <div class="kv"><span class="k">유효기간</span><span class="v">${escapeHtml(validityNote)}</span></div>
      <div class="kv"><span class="k">견적번호</span><span class="v">${quoteNumber}</span></div>
    </div>
    <div class="top-right">
      <div class="issuer-box">
        <div class="co">${escapeHtml(issuer.companyName)} <span class="stamp">인</span></div>
        <div>대표 ${escapeHtml(issuer.ceoName)}</div>
        <div>사업자번호 ${escapeHtml(issuer.bizNumber)}</div>
        <div>전화 ${escapeHtml(issuer.phone)}</div>
        <div>${escapeHtml(issuer.address)}</div>
        <div>E-mail ${escapeHtml(issuer.email)}</div>
      </div>
    </div>
  </div>

  <div class="amount-banner">
    <div class="hangul">일금 ${koreanGrand} 원</div>
    <div class="num">(${formatCurrency(grandTotal)})</div>
    <div class="note">※ 부가세포함</div>
  </div>

  <table class="quote-table">
    <thead>
      <tr>
        <th>항목</th>
        <th>세부내용</th>
        <th>수량</th>
        <th>단가</th>
        <th>금액</th>
        <th>세액</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="sum-row">
        <td colspan="4" class="sum-label">합계</td>
        <td class="cell-right">${totalAmountDisplay}</td>
        <td class="cell-right">${totalTaxDisplay}</td>
      </tr>
    </tbody>
  </table>

  <table class="bottom-totals">
    <tr><td>공급가</td><td>${subtotal.toLocaleString('ko-KR')}</td></tr>
    <tr><td>부가세</td><td>${vat.toLocaleString('ko-KR')}</td></tr>
    <tr><td>소계</td><td>${grandTotal.toLocaleString('ko-KR')}</td></tr>
  </table>
  <div class="clear"></div>

  <div class="footer-note">
    · 본 견적서는 견적일로부터 유효기간 내에 한해 효력이 있습니다.<br/>
    · 금액은 공급가 합계에 부가세 10%를 가산한 금액입니다.<br/>
    · 프로젝트 범위 변경 시 견적이 조정될 수 있습니다.<br/>
    · 완성된 결과물에 대한 세부 조정은 별도 협의를 통해 진행할 수 있습니다.
  </div>
  <div class="footer-ref">문의: ${escapeHtml(issuer.email)} · ${escapeHtml(issuer.phone)}</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

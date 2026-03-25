# 운영(Vercel·Supabase) 환경 변수 가이드

노출된 비밀번호·API 키·JWT는 **반드시 교체**한 뒤, Vercel **Environment Variables**에만 등록하세요. 저장소에 실제 값을 커밋하지 마세요.

---

## 1. 보안 절차 (필수)

1. **Supabase**: Database → Settings → **비밀번호 재설정** (또는 새 비밀번호로 연결 문자열 재생성)
2. **Resend**: API Keys에서 **기존 키 폐기** 후 새 키 발급
3. **JWT**: 아래 명령으로 새 시크릿 생성 후 Vercel에 반영

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

PowerShell에서 OpenSSL을 쓸 수 있으면:

```powershell
openssl rand -base64 48
```

출력 문자열 전체를 `JWT_SECRET`으로 사용합니다. **최소 32자**여야 합니다.

---

## 2. Supabase: Pooler(앱) vs Direct(마이그레이션)

| 용도 | 연결 방식 | 포트 예시 | 비고 |
|------|-----------|-----------|------|
| **Vercel(Next.js·서버리스)** | **Transaction Pooler** | `6543` | `?pgbouncer=true` 등 쿼리 포함 문자열이 흔함 |
| **로컬에서 `prisma migrate deploy`** | **Direct** (직접 DB) | `5432` | Pooler로 마이그레이션이 실패하거나 불안정할 때 |

- Supabase 대시보드 **Project Settings → Database → Connection string**에서  
  **URI**를 복사할 때 모드( Transaction / Session / Direct )를 구분합니다.
- **앱(Vercel)** 에 넣는 `DATABASE_URL`은 보통 **Pooler** 문자열을 사용합니다.
- **마이그레이션만** 로컬 PC에서 돌릴 때는, 같은 화면의 **Direct** 또는 Session용 문자열을  
  로컬 `packages/db/.env`의 `DATABASE_URL`에 잠시 넣고 실행하는 방법이 많습니다.

(Prisma에서 `directUrl`을 스키마에 추가하면 Pooler + Direct를 동시에 둘 수 있습니다. 필요 시 Prisma 공식 문서의 *Connection pooling* / *Direct connection*을 참고하세요.)

---

## 3. Vercel에 넣을 변수 목록

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | **Pooler** 기준 PostgreSQL URL (앱·빌드 시 Prisma generate용) |
| `JWT_SECRET` | 운영 전용 랜덤 긴 문자열 |
| `RESEND_API_KEY` | Resend 대시보드에서 발급 |
| `EMAIL_FROM` | Resend에 **도메인·발신 주소 검증**된 이메일 |
| `NEXT_PUBLIC_BASE_URL` | 배포 URL, 예: `https://<프로젝트>.vercel.app` |
| `USE_AI_QUOTE` | `false` 권장 (미사용 시) |

선택: `UPSTASH_REDIS_*` (레이트 리밋 등 사용 시)

---

## 4. 비밀번호에 특수문자가 있을 때

연결 문자열 안 비밀번호는 **URL 인코딩**해야 합니다.  
예: `@` → `%40`, `!` → `%21`

---

## 5. 체크리스트

- [ ] 노출된 DB 비밀번호·Resend 키·JWT 교체
- [ ] `JWT_SECRET`을 로컬 테스트용과 다른 값으로 설정
- [ ] `NEXT_PUBLIC_BASE_URL`이 실제 Vercel 도메인과 일치
- [ ] `EMAIL_FROM` 도메인이 Resend에서 검증됨
- [ ] 마이그레이션은 Pooler가 아닌 **Direct**로 로컬/CI에서 실행 여부 확인

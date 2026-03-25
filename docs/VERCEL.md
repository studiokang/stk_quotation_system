# Vercel 배포 체크리스트

## 권장 설정 (이 레포 구조 기준)

| 항목 | 권장 값 |
|------|---------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js (자동 인식) |
| **Install Command** | *(비워 두거나)* `apps/web/vercel.json`의 `cd ../.. && pnpm install --frozen-lockfile` 사용 |
| **Build Command** | *(비워 두거나)* `cd ../.. && pnpm exec turbo run build --filter=web` |
| **Node.js Version** | 18.x 또는 20.x (Project Settings → General) |

`apps/web/vercel.json`에 install/build가 정의되어 있으면, Vercel이 이를 사용합니다.  
**Root Directory를 `apps/web`로 두지 않으면** 이 파일이 적용되지 않습니다.

---

## 환경 변수

`turbo.json`의 **`globalEnv`** 에 나열된 변수를 Vercel **Environment Variables**에 모두 등록해야 합니다.  
Turborepo **strict** 모드에서는 `globalEnv` / `env`에 선언된 변수만 태스크에 전달되므로, `DATABASE_URL` 누락 시 `@repo/db#db:generate` 가 실패할 수 있습니다.

---

## 배포가 느린 흔한 이유

1. **첫 배포 / 캐시 없음** — 두 번째부터는 의존성·Turbo 캐시로 단축되는 경우가 많습니다.
2. **모노레포 전체 `pnpm install`** — 워크스페이스 패키지가 많아 설치 자체가 큽니다.
3. **`@repo/pdf`의 `puppeteer`** — 설치 시 Chromium 다운로드로 **시간·용량**이 크게 늘 수 있습니다. (PDF 기능이 필요하면 당분간 감수하거나, 이후 `@sparticuz/chromium` 등 서버리스용 구성 검토)

---

## 로컬과 동일하게 맞추기

- **빌드**: 루트에서 `pnpm exec turbo run build --filter=web` 가 성공하면 Vercel과 거의 동일합니다.
- **Prisma**: `packages/db`의 `db:generate`는 `prisma generate`만 실행합니다. 로컬은 `packages/db/.env` 또는 상위 `.env`를 Prisma가 읽습니다. Vercel은 대시보드의 `DATABASE_URL`을 사용합니다.

---

## Root Directory를 레포 루트로 둔 경우

이때는 Vercel에서 **어느 앱이 Next.js인지** 직접 지정해야 합니다. 가장 단순한 방법은 **Root Directory를 `apps/web`로 바꾸는 것**입니다.

# JH Hedge Fund Data Pack V1

호행처럼 관리자 안에서 공식 FRED 지표 40개를 수집하고, 기간별 변화와 이상신호를 계산해 `COPY FOR GPT` 형식으로 제공한다.

## 데이터 흐름

1. Vercel Cron이 매일 `GET /api/cron/fred`를 호출한다.
2. 서버 전용 FRED 수집기가 지표별 신규 구간을 조회한다.
3. 와이프 계정의 별도 Supabase `historical_data`에 `(series_id, observed_at)` 기준으로 upsert한다.
4. `/admin/jh-market`이 원본 시계열에서 변화율, 백분위, Z-Score, 추세, 이상신호와 중요도를 계산한다.
5. 수집 시점의 계산 결과와 COPY Pack을 해당 `collection_runs.metadata`에 일별 아카이브로 보관한다.
6. 관리자는 과거 날짜를 선택하거나 `COPY FOR GPT` 버튼으로 구조화된 Morning Meeting Pack을 복사한다.

기존 호행처럼 콘텐츠 Supabase와 JH 데이터 Supabase는 서로 분리한다. JH 비밀키는 서버 전용 코드에서만 사용하며 브라우저 번들에는 포함하지 않는다.

## 환경변수

Vercel 프로젝트에 다음 값이 필요하다.

- `JH_SUPABASE_URL`
- `JH_SUPABASE_SECRET_KEY`
- `FRED_API_KEY`
- `CRON_SECRET`
- 기존 관리자 인증용 `NEXT_PUBLIC_SUPABASE_URL`
- 기존 관리자 인증용 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 자동수집

`vercel.json`의 `30 23 * * *`는 UTC 기준이며 한국시간으로 다음 날 오전 8시 30분이다. `CRON_SECRET`이 설정되면 Vercel이 자동 호출에 `Authorization: Bearer ...` 헤더를 붙인다.

수집 모드:

- `auto`: 해당 지표의 계산용 이력이 부족하면 과거 구간 적재, 충분하면 최근 구간 갱신
- `backfill`: 모든 활성 지표의 과거 구간 재확인
- `daily`: 모든 활성 지표의 최근 구간만 갱신

관리자 화면의 `지금 데이터 수집`은 `auto`를 사용한다. 일부 지표가 실패하거나 이력이 덜 채워져도 다음 실행에서 해당 지표만 다시 과거 적재한다.

## 분석 규칙

- 일간: 1D / 5D / 20D / 60D
- 주간: 1W / 4W / 13W / 52W
- 월간: 1M / 3M / 6M / 12M
- 분기: 1Q / 2Q / 4Q / 8Q
- 백분위와 Z-Score는 지표 빈도에 맞는 과거 관측 구간으로 계산한다.
- 금리·신용의 변화는 bp, 물가 YoY와 GDP 연율의 변화는 pp로 표시한다.
- Importance Score는 변화 크기 30%, 역사적 극단 25%, 교차자산 확인 20%, 추세 영향 15%, 지속성 10%를 사용한다.
- 오래된 값은 0으로 바꾸지 않고 실제 관측일과 지연 상태를 표시한다.

## 보안

- Cron API는 `CRON_SECRET`으로 보호한다.
- 관리자 데이터 API는 기존 호행처럼 Supabase 로그인 토큰을 Auth 서버에서 다시 검증한다.
- `JH_SUPABASE_SECRET_KEY`와 `FRED_API_KEY`는 클라이언트에 전달하지 않는다.
- 관리자 화면이 보내는 응답은 표시에 필요한 지표와 계산 결과만 포함한다.

## 운영 확인

1. `/admin` 로그인
2. `JH 투자 레이더` 선택
3. 최초 한 번 `지금 데이터 수집` 실행
4. 커버리지 `40 / 40`과 최근 자동수집 `정상 완료` 확인
5. `COPY FOR GPT` 실행

일부 FRED 시리즈가 일시적으로 응답하지 않으면 전체 화면을 막지 않고 성공 지표만 보여주며, 실패 수를 커버리지와 최근 실행 기록에 표시한다.

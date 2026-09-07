# HOHAENG Daily SEO Keyword Picks

매일 한국시간 06:05에 Search Console과 Google 자동완성을 바탕으로 새 글 후보를 만들고 Google Rank Predictor V3로 예상 순위를 계산합니다.

## 선별 순서

1. 최근 90일 Search Console에서 기존 노출·평균 순위·CTR 여지가 있는 검색어를 찾습니다.
2. 주제 중복을 줄인 상위 검색어를 Google 자동완성 seed로 사용합니다.
3. 최근 21일 추천 키워드를 제외합니다.
4. 롱테일 구체성, GSC 신호, 빠른 상위진입 가능성을 1차 점수화합니다.
5. 상위 후보를 Rank Predictor V3로 다시 분석합니다.
6. 예상 순위, TOP10 확률, 기회 점수, SERP 난이도를 합산해 최종 5개를 저장합니다.

## 관리자 화면

- `/admin/seo/daily`: 오늘 추천 5개
- `/admin/seo`: 제목 단건 상세 분석

추천 카드에는 키워드, 추천 제목, 현재 예상 순위, 글 보강 후 예상 순위, TOP10 확률, SERP 난이도, GSC 주제 신호, Pillar/Cluster 구조와 후속 Cluster를 표시합니다.

## 자동 실행

Vercel Cron `/api/cron/seo-keywords`가 매일 `21:05 UTC`에 실행됩니다. 한국시간으로는 매일 06:05입니다.

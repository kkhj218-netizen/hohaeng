import { makeAdditionalSource, type AdditionalPostSpec } from './preparedPostFactory';

const SPECS: AdditionalPostSpec[] = [
  {
    "seedSlug": "prepared-month5-dividend-retirement-pillar",
    "title": "배당 현금흐름부터 은퇴자금까지, 노후 준비 총정리",
    "keyword": "배당 은퇴자금 관리",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "현재자산·월저축·은퇴시점·생활비를 연결해야 필요한 은퇴자금과 부족액을 볼 수 있습니다.",
    "comparison": "배당만 사용하는 계획과 자산을 단계적으로 인출하는 계획을 비교합니다.",
    "action": "보수적 수익률과 물가를 넣어 매년 은퇴계획 업데이트하기"
  },
  {
    "seedSlug": "prepared-month5-after-tax-dividend",
    "title": "배당금 세후 계산｜통장에 실제 들어오는 금액",
    "keyword": "세후 배당금 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "표시 배당금에서 원천징수와 계좌별 과세조건을 반영해야 실제 현금흐름을 알 수 있습니다.",
    "comparison": "세전 연간배당과 세후 입금액, 월평균 환산액을 비교합니다.",
    "action": "배당명세서의 세전·세금·세후 금액을 각각 기록하기"
  },
  {
    "seedSlug": "prepared-month5-monthly-dividend",
    "title": "월 10만 원 배당 받으려면 투자금이 얼마 필요할까?",
    "keyword": "월 10만원 배당 투자금",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "목표 월배당을 연간금액으로 바꾸고 세후 배당수익률로 나누어 필요한 투자금을 추정합니다.",
    "comparison": "배당률 3%·4%·5%에서 필요한 원금과 위험차이를 비교합니다.",
    "action": "높은 배당률 하나보다 지속가능성과 분산을 먼저 확인하기"
  },
  {
    "seedSlug": "prepared-month5-quarterly-dividend",
    "title": "분기배당을 월배당처럼 계획하는 현금흐름 관리법",
    "keyword": "분기배당 월평균 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "분기배당은 실제 입금월이 몰릴 수 있으므로 월평균 숫자와 입금달력을 구분해야 합니다.",
    "comparison": "연간배당을 12로 나눈 평균과 실제 분기별 입금액을 비교합니다.",
    "action": "배당달력을 만들고 생활비용 현금버퍼 따로 두기"
  },
  {
    "seedSlug": "prepared-month5-dividend-yield",
    "title": "배당수익률 계산법｜주가가 바뀌면 왜 달라질까?",
    "keyword": "배당수익률 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "연간 주당배당을 현재주가로 나누므로 배당금이 같아도 주가가 움직이면 수익률이 달라집니다.",
    "comparison": "매수가 기준 수익률과 현재가 기준 표시수익률을 비교합니다.",
    "action": "배당수익률과 총수익률을 같은 표에 기록하기"
  },
  {
    "seedSlug": "prepared-month5-yield-trap",
    "title": "배당수익률 10%, 정말 좋은 투자일까? 고배당 함정",
    "keyword": "고배당 수익률 함정",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "주가급락으로 표시수익률이 높아졌거나 배당삭감 가능성이 반영됐을 수 있습니다.",
    "comparison": "현재 배당 유지와 절반 삭감 시 현금흐름을 비교합니다.",
    "action": "배당재원·현금흐름·삭감이력을 확인한 뒤 수익률 판단하기"
  },
  {
    "seedSlug": "prepared-month5-dividend-growth",
    "title": "배당성장률 계산｜배당이 매년 늘면 현금흐름은 어떻게 될까?",
    "keyword": "배당성장률 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/cagr-calc",
    "calculatorLabel": "CAGR 계산기",
    "focus": "과거 배당의 시작값과 종료값, 기간으로 연평균 성장률을 볼 수 있습니다.",
    "comparison": "과거 성장률 유지와 성장정체·삭감 시나리오를 비교합니다.",
    "action": "과거수치를 미래보장으로 보지 말고 보수적 성장률 사용하기"
  },
  {
    "seedSlug": "prepared-month5-dividend-reinvest",
    "title": "배당 재투자 복리, 세후 입금액으로 계산해야 하는 이유",
    "keyword": "배당 재투자 복리",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/compound-calc",
    "calculatorLabel": "복리 계산기",
    "focus": "재투자에 쓰는 금액은 세전배당이 아니라 실제 계좌에 들어온 세후금액입니다.",
    "comparison": "배당 소비와 전액 재투자에서 보유수량·미래현금흐름을 비교합니다.",
    "action": "입금일·세후금액·재투자수량을 거래기록에 남기기"
  },
  {
    "seedSlug": "prepared-month5-target-dividend",
    "title": "연 1,200만 원 배당 목표, 필요한 원금 역산하기",
    "keyword": "연 1200만원 배당",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "목표 세후배당과 예상 세후수익률을 이용해 필요한 투자원금을 역산합니다.",
    "comparison": "배당률을 높이는 경우와 저축기간을 늘리는 경우의 위험을 비교합니다.",
    "action": "목표원금까지 연도별 저축액과 배당재투자 계획 세우기"
  },
  {
    "seedSlug": "prepared-month5-one-million-month",
    "title": "월 100만 원 배당 만들기, 수익률별 필요 투자금",
    "keyword": "월 100만원 배당 투자금",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "월 100만 원은 연 1,200만 원의 세후현금흐름이므로 세금과 지급변동을 반영해야 합니다.",
    "comparison": "세후수익률 3%·4%·5%에서 필요원금을 비교합니다.",
    "action": "목표배당보다 먼저 최대종목비중과 손실감당범위 정하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-fund-formula",
    "title": "은퇴자금 얼마가 필요할까? 현재자산부터 계산하는 법",
    "keyword": "은퇴자금 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "노후자금 목표 도구",
    "focus": "은퇴 후 월생활비와 예상기간, 물가·연금·수익률을 연결해 필요금액을 추정합니다.",
    "comparison": "연금소득을 뺀 부족생활비와 전체생활비 기준 목표를 비교합니다.",
    "action": "현재자산과 월저축액으로 은퇴시점 예상잔액 계산하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-living-cost",
    "title": "은퇴 후 생활비, 현재 지출의 몇 %로 잡아야 할까?",
    "keyword": "은퇴 생활비 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "출퇴근비는 줄어도 의료·여가·주거수선비가 늘 수 있어 현재지출을 단순비율로만 줄이면 부족할 수 있습니다.",
    "comparison": "필수생활비와 선택생활비, 의료예비비를 나눈 시나리오를 비교합니다.",
    "action": "최근 1년 지출에서 은퇴 후 사라질 항목과 늘 항목 표시하기"
  },
  {
    "seedSlug": "prepared-month5-withdrawal-rate",
    "title": "은퇴자금 인출률 계산｜매년 얼마까지 꺼내 쓸까?",
    "keyword": "은퇴자금 인출률",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "연간인출액을 은퇴자산으로 나눈 비율은 자산이 버틸 가능성을 점검하는 출발점입니다.",
    "comparison": "3%·4%·5% 인출에서 첫해 생활비와 자산소진 위험을 비교합니다.",
    "action": "물가와 시장상황에 따라 인출액을 조정할 규칙 정하기"
  },
  {
    "seedSlug": "prepared-month5-four-percent-rule",
    "title": "4% 룰이란? 한국 은퇴생활에 그대로 적용하면 안 되는 이유",
    "keyword": "은퇴 4퍼센트 룰",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "4% 규칙은 특정 시장과 기간의 연구에서 나온 참고기준으로 세금·수수료·연금과 개인수명을 반영해야 합니다.",
    "comparison": "4% 고정인출과 시장하락 때 인출을 줄이는 유연한 방식을 비교합니다.",
    "action": "내 자산배분과 고정소득을 넣어 별도 인출계획 만들기"
  },
  {
    "seedSlug": "prepared-month5-retirement-inflation",
    "title": "물가 2%·3%면 20년 뒤 은퇴생활비는 얼마일까?",
    "keyword": "은퇴 생활비 물가 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/inflation-calc",
    "calculatorLabel": "물가상승 계산기",
    "focus": "현재 월생활비를 미래 은퇴시점 가격으로 바꾸어야 필요한 명목소득을 알 수 있습니다.",
    "comparison": "물가 2%와 3%에서 10년·20년 뒤 생활비를 비교합니다.",
    "action": "목표생활비를 매년 실제물가에 맞춰 업데이트하기"
  },
  {
    "seedSlug": "prepared-month5-pension-gap",
    "title": "국민연금·퇴직연금으로 부족한 은퇴생활비 계산",
    "keyword": "연금 부족액 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "목표생활비에서 예상 공적·퇴직·개인연금 월수령액을 빼면 자산에서 충당할 부족액이 보입니다.",
    "comparison": "연금 개시 전 공백기간과 개시 후 부족액을 따로 비교합니다.",
    "action": "예상연금 조회값과 수령시점을 표에 입력하기"
  },
  {
    "seedSlug": "prepared-month5-current-assets",
    "title": "현재 5천만 원, 은퇴 때 얼마가 될까? 장기복리 계산",
    "keyword": "현재자산 은퇴 복리",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "현재자산과 남은기간, 월추가저축, 보수적 수익률을 함께 넣어 미래잔액을 계산합니다.",
    "comparison": "수익률을 높이는 경우와 월저축을 늘리는 경우의 확실성을 비교합니다.",
    "action": "3%·5% 수익률 두 경우로 은퇴잔액 저장하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-monthly-saving",
    "title": "은퇴까지 매달 얼마를 모아야 할까? 부족액 역산",
    "keyword": "은퇴 월저축액 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "목표은퇴자금에서 현재자산의 예상미래가치를 뺀 뒤 남은기간의 월저축액을 계산합니다.",
    "comparison": "은퇴시점을 3년 늦추는 경우와 월저축을 늘리는 경우를 비교합니다.",
    "action": "자동저축액을 정하고 소득인상 때 절반을 추가하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-years",
    "title": "은퇴 10년 전과 20년 전, 필요한 월저축액 차이",
    "keyword": "은퇴 준비 기간",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "시작이 빠르면 같은 목표를 더 긴 기간에 나누고 복리기회를 늘릴 수 있습니다.",
    "comparison": "10년·20년 준비기간에서 월납입원금과 예상수익을 비교합니다.",
    "action": "완벽한 금액을 기다리지 말고 가능한 금액으로 즉시 시작하기"
  },
  {
    "seedSlug": "prepared-month5-early-retirement",
    "title": "조기은퇴 목표, 생활비 25배만 모으면 충분할까?",
    "keyword": "조기은퇴 자금 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "은퇴기간이 길수록 물가·의료비·시장하락과 연금개시 전 공백을 더 보수적으로 봐야 합니다.",
    "comparison": "생활비 25배 단순목표와 추가예비비·세금을 포함한 목표를 비교합니다.",
    "action": "최소생활비와 원하는생활비 두 단계의 은퇴목표 만들기"
  },
  {
    "seedSlug": "prepared-month5-sequence-risk",
    "title": "은퇴 직후 주가가 폭락하면 위험한 이유, 수익률 순서 위험",
    "keyword": "은퇴 수익률 순서 위험",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "평균수익률이 같아도 인출 초기에 큰 손실이 오면 회복할 원금이 줄어 자산수명이 짧아질 수 있습니다.",
    "comparison": "상승이 먼저 온 경우와 하락이 먼저 온 경우의 잔액경로를 비교합니다.",
    "action": "은퇴초기 생활비 버퍼와 인출조정 규칙 준비하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-cash-buffer",
    "title": "은퇴생활비 현금 버퍼, 몇 개월치를 둘까?",
    "keyword": "은퇴 현금 버퍼",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "시장하락 때 자산을 억지로 팔지 않도록 필수생활비 일부를 현금성자산으로 둘 수 있습니다.",
    "comparison": "6개월·12개월·24개월 버퍼의 안정성과 기회비용을 비교합니다.",
    "action": "연금 등 고정소득을 뺀 부족생활비 기준으로 목표정하기"
  },
  {
    "seedSlug": "prepared-month5-bonds-role",
    "title": "은퇴 포트폴리오에서 채권과 현금이 하는 역할",
    "keyword": "은퇴 자산배분 채권",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "성장자산과 변동이 다른 자산을 섞으면 인출 중 계좌변동을 완화하는 데 도움이 될 수 있습니다.",
    "comparison": "주식집중과 분산자산배분의 기대수익·최대손실을 비교합니다.",
    "action": "필요생활비와 위험감당범위를 기준으로 목표비중 정하기"
  },
  {
    "seedSlug": "prepared-month5-medical-expense",
    "title": "은퇴 의료비, 생활비와 별도로 준비해야 하는 이유",
    "keyword": "은퇴 의료비 준비",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "나이가 들수록 의료·돌봄비가 늘 수 있어 현재 보험료만으로 전체비용을 추정하기 어렵습니다.",
    "comparison": "평상시 생활비와 의료비가 크게 늘어난 해의 지출을 비교합니다.",
    "action": "보험보장과 별도 의료예비비 목표를 각각 확인하기"
  },
  {
    "seedSlug": "prepared-month5-couple-retirement",
    "title": "부부 은퇴시점이 다를 때 연금과 생활비 계산법",
    "keyword": "부부 은퇴자금 계산",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "각자의 은퇴일과 연금개시일이 다르면 소득공백 구간을 연도별로 나누어야 합니다.",
    "comparison": "한 사람이 먼저 은퇴한 기간과 두 사람 모두 은퇴한 기간의 현금흐름을 비교합니다.",
    "action": "부부 연령축에 소득·연금·큰 지출을 표시하기"
  },
  {
    "seedSlug": "prepared-month5-nominal-real-retirement",
    "title": "명목 은퇴자금과 실질가치, 1억 원의 구매력 차이",
    "keyword": "은퇴자금 실질가치",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/inflation-calc",
    "calculatorLabel": "물가상승 계산기",
    "focus": "미래 1억 원은 현재 1억 원과 구매력이 다를 수 있으므로 물가를 반영해야 합니다.",
    "comparison": "명목잔액 증가와 현재가치로 환산한 실질잔액을 비교합니다.",
    "action": "모든 장기목표에 기준연도와 물가가정 표시하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-account-tax",
    "title": "연금계좌 세금, 납입 혜택과 수령 조건 함께 보기",
    "keyword": "연금계좌 세금 이해",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "연금계좌는 납입·운용·수령 단계의 세금과 제한이 달라 최신 공식조건을 확인해야 합니다.",
    "comparison": "일반계좌와 연금계좌의 유동성·과세시점·수령조건을 비교합니다.",
    "action": "공식기관 안내에서 현재한도와 수령요건을 확인해 기록하기"
  },
  {
    "seedSlug": "prepared-month5-dividend-vs-withdrawal",
    "title": "배당으로 생활비 받기 vs 자산 일부 매도하기",
    "keyword": "배당 인출 전략 비교",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/dividend-calc",
    "calculatorLabel": "배당금 계산기",
    "focus": "배당만 고집하면 고배당자산에 치우칠 수 있고 매도전략은 시장변동과 세금을 고려해야 합니다.",
    "comparison": "배당현금흐름과 총수익 기반 정기인출을 비교합니다.",
    "action": "자산배분을 해치지 않는 현금흐름 방식을 선택하기"
  },
  {
    "seedSlug": "prepared-month5-annual-retirement-review",
    "title": "은퇴계획은 1년에 한 번 무엇을 수정해야 할까?",
    "keyword": "연간 은퇴계획 점검",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "현재잔액·저축액·예상연금·생활비·은퇴시점의 변화를 같은 기준으로 갱신해야 합니다.",
    "comparison": "작년 계획과 실제성과 차이를 원금·수익·지출로 나누어 비교합니다.",
    "action": "매년 생일이나 연말에 계산기 값을 새로 저장하기"
  },
  {
    "seedSlug": "prepared-month5-retirement-action-plan",
    "title": "30대·40대·50대 은퇴 준비, 지금 할 일 한 가지",
    "keyword": "연령별 은퇴 준비",
    "cluster": "배당·은퇴",
    "calculatorHref": "/money/retirement-calc",
    "calculatorLabel": "은퇴자금 계산기",
    "focus": "나이보다 남은기간과 현재자산, 월저축여력이 계획을 더 직접적으로 결정합니다.",
    "comparison": "월저축액 증가·은퇴연기·생활비조정 세 선택의 영향을 비교합니다.",
    "action": "이번 달에는 자동저축과 예상연금 조회 중 한 가지 완료하기"
  }
];

export const MONTH_5_SOURCES = SPECS.map(makeAdditionalSource);

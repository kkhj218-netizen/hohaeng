import { makeAdditionalSource, type AdditionalPostSpec } from './preparedPostFactory';

const SPECS: AdditionalPostSpec[] = [
  {
    "seedSlug": "prepared-month2-savings-living-cost-pillar",
    "title": "월급 저축부터 생활비 관리까지, 처음 만드는 돈 관리 시스템",
    "keyword": "저축 생활비 관리",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "수입에서 저축과 필수지출, 선택지출을 분리하면 매달 남는 돈이 어디로 가는지 보입니다.",
    "comparison": "월 단위 예산과 연간 비정기 지출을 함께 비교해야 실제 저축 가능액을 과대평가하지 않습니다.",
    "action": "급여일 기준 자동저축액과 생활비 상한을 정하고 30일 뒤 실제값으로 수정하기"
  },
  {
    "seedSlug": "prepared-month2-savings-rate-formula",
    "title": "월급 저축률 계산법｜저축액은 월급의 몇 %가 적당할까?",
    "keyword": "월급 저축률 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "세후소득에서 소비하지 않고 남긴 저축·투자액의 비율을 같은 기준으로 계산해야 합니다.",
    "comparison": "상여금 포함 여부와 대출 원금상환을 저축에 넣는지에 따라 저축률이 크게 달라집니다.",
    "action": "최근 3개월 세후소득과 실제 저축액으로 평균 저축률 계산하기"
  },
  {
    "seedSlug": "prepared-month2-savings-rate-10-20-30",
    "title": "저축률 10%·20%·30%, 내 월급에는 얼마일까?",
    "keyword": "저축률 10% 20% 30%",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "같은 비율도 월 실수령액과 고정비에 따라 체감 부담이 달라집니다.",
    "comparison": "10%부터 시작한 경우와 30%를 목표로 한 경우의 생활비 여유와 목표기간을 비교합니다.",
    "action": "감당 가능한 비율을 선택해 다음 급여일부터 자동이체하기"
  },
  {
    "seedSlug": "prepared-month2-fixed-cost-ratio",
    "title": "고정비 비율이 높으면 저축이 어려운 이유와 줄이는 순서",
    "keyword": "고정비 비율 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "월세·보험·통신·구독처럼 매달 자동으로 나가는 돈을 세후소득과 비교해야 합니다.",
    "comparison": "고정비를 5만 원 줄이는 경우와 변동비를 매달 의지로 줄이는 경우의 지속성을 비교합니다.",
    "action": "자동결제 목록을 뽑아 금액이 큰 세 항목부터 갱신일 확인하기"
  },
  {
    "seedSlug": "prepared-month2-variable-budget",
    "title": "변동비 예산은 어떻게 잡을까? 식비·쇼핑비 상한 정하기",
    "keyword": "변동비 예산 설정",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "식비와 쇼핑처럼 달마다 달라지는 비용은 최근 평균과 최대값을 함께 봐야 합니다.",
    "comparison": "주간 한도와 월간 한도 중 어느 방식이 소비 속도를 파악하기 쉬운지 비교합니다.",
    "action": "생활비를 주 단위로 나누고 주말마다 남은 금액 확인하기"
  },
  {
    "seedSlug": "prepared-month2-emergency-fund-formula",
    "title": "비상금 얼마가 필요할까? 생활비 기준 계산법",
    "keyword": "비상금 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 목표 도구",
    "focus": "비상금 목표는 월급이 아니라 실직해도 반드시 내야 하는 필수생활비를 기준으로 잡습니다.",
    "comparison": "필수생활비 3개월분과 6개월분을 각각 계산해 준비기간과 안정성을 비교합니다.",
    "action": "현재 비상금으로 버틸 수 있는 개월 수를 계산하고 부족액 자동저축하기"
  },
  {
    "seedSlug": "prepared-month2-emergency-fund-3-vs-6",
    "title": "비상금 3개월치와 6개월치, 누구에게 더 필요할까?",
    "keyword": "비상금 3개월 6개월",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "고용 안정성, 맞벌이 여부, 부양가족과 보험 보장에 따라 필요한 안전망이 달라집니다.",
    "comparison": "3개월 목표를 먼저 채운 뒤 6개월로 늘리는 방식과 처음부터 6개월을 모으는 방식을 비교합니다.",
    "action": "내 소득 중단 위험을 적어 목표 개월 수를 한 단계씩 정하기"
  },
  {
    "seedSlug": "prepared-month2-couple-emergency-fund",
    "title": "맞벌이 부부 비상금, 각자와 공동으로 얼마를 둘까?",
    "keyword": "부부 비상금 관리",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "공동생활비 비상금과 개인적인 긴급자금을 구분하면 사용 기준이 분명해집니다.",
    "comparison": "한 사람 소득만 중단된 경우와 두 사람 모두 영향을 받는 경우를 나누어 비교합니다.",
    "action": "공동 비상금 사용 조건과 보충 규칙을 문장으로 합의하기"
  },
  {
    "seedSlug": "prepared-month2-payday-auto-saving",
    "title": "월급날 자동저축, 날짜와 금액을 정하는 가장 쉬운 방법",
    "keyword": "월급날 자동저축",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "급여가 들어온 직후 저축을 분리하면 월말에 남은 돈을 저축하는 방식보다 실행이 쉽습니다.",
    "comparison": "정액 자동이체와 실수령액의 일정 비율 자동저축을 비교합니다.",
    "action": "급여일 다음 날 필수저축 한 건부터 자동이체 등록하기"
  },
  {
    "seedSlug": "prepared-month2-save-first-spend-later",
    "title": "선저축 후소비가 실패하는 이유와 현실적인 비율",
    "keyword": "선저축 후소비",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "생활비를 지나치게 낮게 잡으면 중간에 저축을 깨는 일이 반복될 수 있습니다.",
    "comparison": "높은 저축률을 짧게 유지하는 경우와 낮은 비율을 1년 유지하는 경우를 비교합니다.",
    "action": "필수지출 뒤에도 유지 가능한 최소 저축액부터 고정하기"
  },
  {
    "seedSlug": "prepared-month2-50-30-20-rule",
    "title": "50·30·20 예산법, 한국 월급에 그대로 적용해도 될까?",
    "keyword": "50 30 20 예산법",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "필수비 50%, 선택비 30%, 저축 20%는 출발점이며 주거비가 높은 가구에는 조정이 필요합니다.",
    "comparison": "권장 비율과 실제 내 비율의 차이를 확인해 가장 큰 한 항목만 바꿉니다.",
    "action": "세후 월급을 세 구간으로 나눠 실제 비율 표 만들기"
  },
  {
    "seedSlug": "prepared-month2-living-cost-account",
    "title": "생활비 통장 따로 쓰면 돈이 모일까? 계좌 분리 방법",
    "keyword": "생활비 통장 관리",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "고정비·생활비·저축 계좌를 분리하면 사용 가능한 금액을 잔액으로 확인할 수 있습니다.",
    "comparison": "계좌를 너무 많이 나눈 경우의 관리 부담과 세 계좌만 사용하는 단순 방식을 비교합니다.",
    "action": "급여·고정비·생활비·저축의 이체 흐름을 한 장에 적기"
  },
  {
    "seedSlug": "prepared-month2-credit-vs-debit",
    "title": "신용카드와 체크카드, 생활비 관리에는 무엇이 나을까?",
    "keyword": "신용카드 체크카드 생활비",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "결제수단보다 결제 시점과 누적 사용액을 확인하는 습관이 예산 준수에 더 중요합니다.",
    "comparison": "혜택을 얻는 신용카드와 즉시 잔액이 줄어드는 체크카드의 관리 차이를 비교합니다.",
    "action": "결제수단을 한두 개로 줄이고 주간 누적액 알림 설정하기"
  },
  {
    "seedSlug": "prepared-month2-subscription-audit",
    "title": "구독료 정리만으로 매달 얼마를 아낄 수 있을까?",
    "keyword": "구독료 절약 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "월 구독료는 작아 보여도 연간금액으로 바꾸면 우선순위를 판단하기 쉽습니다.",
    "comparison": "모든 구독을 해지하는 방식과 사용 빈도가 낮은 항목부터 정리하는 방식을 비교합니다.",
    "action": "카드 명세서 3개월치에서 자동결제를 찾아 연간비용 계산하기"
  },
  {
    "seedSlug": "prepared-month2-insurance-budget",
    "title": "보험료는 월급의 몇 %? 보장과 생활비 균형 잡기",
    "keyword": "보험료 예산 비율",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "보험료는 단순 비율보다 중복 보장, 갱신 여부와 실제 현금흐름을 함께 봐야 합니다.",
    "comparison": "현재 보험료와 갱신 후 예상 보험료가 저축률에 미치는 영향을 비교합니다.",
    "action": "보험 목록을 정리하고 같은 보장의 중복 여부부터 확인하기"
  },
  {
    "seedSlug": "prepared-month2-food-budget",
    "title": "2인 가구 식비 예산, 외식비까지 포함해 계산하는 법",
    "keyword": "2인 가구 식비 예산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "장보기·배달·외식·카페를 같은 식비 범위에 넣어야 새는 돈을 정확히 볼 수 있습니다.",
    "comparison": "주간 장보기 한도와 외식 횟수 한도를 각각 설정했을 때의 차이를 비교합니다.",
    "action": "한 달 식비를 네 항목으로 분류하고 가장 큰 항목 하나만 조정하기"
  },
  {
    "seedSlug": "prepared-month2-transportation-budget",
    "title": "교통비·자동차 유지비, 월 예산에 빠짐없이 넣는 법",
    "keyword": "교통비 자동차 유지비 예산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "주유비뿐 아니라 보험·세금·정비·주차비를 12개월로 나눠 월비용에 넣어야 합니다.",
    "comparison": "대중교통 중심과 자동차 보유 시 총비용을 같은 기간으로 비교합니다.",
    "action": "연간 차량비를 합산해 매월 별도 통장에 적립하기"
  },
  {
    "seedSlug": "prepared-month2-housing-cost-ratio",
    "title": "월세·관리비까지 포함한 주거비 비율 계산법",
    "keyword": "주거비 비율 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "주거비에는 월세나 대출상환뿐 아니라 관리비와 공과금도 포함해 봐야 합니다.",
    "comparison": "현재 주거를 유지하는 경우와 이사 후 예상비용을 보증금 기회비용까지 나누어 비교합니다.",
    "action": "세후소득 대비 총주거비 비율을 계산해 상한 정하기"
  },
  {
    "seedSlug": "prepared-month2-annual-expense-fund",
    "title": "자동차보험·명절비 같은 연간지출, 매달 나눠 모으는 법",
    "keyword": "연간지출 적립",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "1년에 한두 번 나가는 비용도 발생월의 생활비가 아니라 매달 준비할 고정항목으로 봅니다.",
    "comparison": "한꺼번에 카드로 결제하는 경우와 12개월 적립 후 현금으로 내는 경우를 비교합니다.",
    "action": "올해 큰 지출을 달력에 적고 합계를 12로 나눠 자동이체하기"
  },
  {
    "seedSlug": "prepared-month2-bonus-allocation",
    "title": "성과급·보너스가 들어오면 저축과 소비를 어떻게 나눌까?",
    "keyword": "보너스 돈 관리",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "일회성 소득은 평소 월생활비에 포함하지 않아야 고정비가 함께 커지는 것을 막을 수 있습니다.",
    "comparison": "부채상환·비상금·투자·보상소비에 정한 비율로 나눈 경우를 비교합니다.",
    "action": "입금 전에 네 가지 용도의 배분 비율을 미리 적기"
  },
  {
    "seedSlug": "prepared-month2-deposit-interest-basics",
    "title": "예금이자 계산법｜세전 금리와 실제 수령액 차이",
    "keyword": "예금이자 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/deposit-interest-calc",
    "calculatorLabel": "세후 예금이자 도구",
    "focus": "표시금리는 연 기준 세전금리이므로 기간과 세금을 반영해야 실제 만기금액을 알 수 있습니다.",
    "comparison": "세전이자와 일반과세 후 세후이자를 나란히 계산합니다.",
    "action": "가입 전 원금·기간·금리·세율을 넣어 만기수령액 저장하기"
  },
  {
    "seedSlug": "prepared-month2-simple-vs-compound-interest",
    "title": "단리와 복리 차이, 같은 금리인데 만기금액이 다른 이유",
    "keyword": "단리 복리 차이",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/deposit-interest-calc",
    "calculatorLabel": "예금이자 계산기",
    "focus": "단리는 원금에만, 복리는 이전 이자를 포함한 금액에 다시 이자가 붙는 구조입니다.",
    "comparison": "1년과 5년에서 단리·복리 결과가 얼마나 벌어지는지 비교합니다.",
    "action": "상품설명서의 이자 계산방식과 지급주기를 확인하기"
  },
  {
    "seedSlug": "prepared-month2-after-tax-interest",
    "title": "연 4% 예금, 세후 이자는 실제로 얼마일까?",
    "keyword": "예금 세후 이자",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/deposit-interest-calc",
    "calculatorLabel": "예금이자 계산기",
    "focus": "같은 금리라도 세율과 가입기간에 따라 통장에 들어오는 이자가 달라집니다.",
    "comparison": "세전 연 4% 결과와 세금 공제 후 만기금액을 비교합니다.",
    "action": "광고금리 대신 세후수령액을 기준으로 상품 비교하기"
  },
  {
    "seedSlug": "prepared-month2-savings-account-rate",
    "title": "적금 금리, 예금 금리처럼 원금 전체에 붙지 않는 이유",
    "keyword": "적금 이자 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/deposit-interest-calc",
    "calculatorLabel": "예금이자 계산기",
    "focus": "매월 납입하는 적금은 각 회차의 예치기간이 달라 표시금리만큼 원금 전체가 1년 운용되지 않습니다.",
    "comparison": "월납입 적금과 목돈 예금의 평균 예치기간을 비교합니다.",
    "action": "월납입액과 납입일을 기준으로 세후 만기액 계산하기"
  },
  {
    "seedSlug": "prepared-month2-maturity-amount",
    "title": "1년 뒤 예금 만기금액, 원금과 이자 분리해서 보는 법",
    "keyword": "예금 만기금액 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/deposit-interest-calc",
    "calculatorLabel": "예금이자 계산기",
    "focus": "만기금액을 원금·세전이자·세금·세후이자로 나누면 상품별 차이가 선명해집니다.",
    "comparison": "금리 0.5%포인트 차이와 중도해지 가능성의 영향을 비교합니다.",
    "action": "만기일과 자동재예치 여부를 달력에 기록하기"
  },
  {
    "seedSlug": "prepared-month2-savings-goal-date",
    "title": "목표저축액 달성일 계산｜매달 얼마를 모아야 할까?",
    "keyword": "목표저축액 계산",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "현재자산·목표금액·남은기간을 알면 필요한 월저축액을 역산할 수 있습니다.",
    "comparison": "기간을 1년 늘리는 경우와 월저축액을 높이는 경우의 부담을 비교합니다.",
    "action": "목표 날짜를 정하고 월자동이체액을 역산해 등록하기"
  },
  {
    "seedSlug": "prepared-month2-save-ten-million-year",
    "title": "1년에 1,000만 원 모으기, 월급별 현실적인 계획",
    "keyword": "1년에 천만 원 모으기",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "1,000만 원을 12개월로 나눈 기본금액에 현재저축과 보너스 계획을 반영해야 합니다.",
    "comparison": "월 83만 원 정액저축과 상여금을 포함한 단계형 저축을 비교합니다.",
    "action": "월 최소액과 보너스 추가액을 분리해 계획표 만들기"
  },
  {
    "seedSlug": "prepared-month2-expense-tracking",
    "title": "가계부를 매일 쓰지 않아도 지출을 파악하는 방법",
    "keyword": "간단한 지출 기록",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "모든 영수증보다 고정비·생활비·예외지출 세 범주만 정확히 기록해도 흐름이 보입니다.",
    "comparison": "매일 기록과 주 1회 카드·계좌 합산 방식의 지속성을 비교합니다.",
    "action": "일요일 10분 동안 세 범주 합계만 업데이트하기"
  },
  {
    "seedSlug": "prepared-month2-personal-cashflow",
    "title": "개인 현금흐름표 만들기｜월급이 남지 않는 이유 찾기",
    "keyword": "개인 현금흐름표",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "세후수입에서 고정비·변동비·부채상환·저축을 순서대로 빼면 실제 잉여현금이 보입니다.",
    "comparison": "예산상 잔액과 통장 실제잔액의 차이를 비교해 누락항목을 찾습니다.",
    "action": "급여일부터 다음 급여일까지 모든 계좌의 순변동 적기"
  },
  {
    "seedSlug": "prepared-month2-monthly-money-review",
    "title": "한 달 돈 관리 점검표｜저축률과 생활비를 수정하는 순서",
    "keyword": "월간 돈 관리 점검",
    "cluster": "저축·생활비",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "월말에는 목표 달성 여부보다 계획과 실제의 차이가 생긴 원인을 확인해야 합니다.",
    "comparison": "수입감소·예외지출·예산과소평가를 구분해 다음 달 수정안을 비교합니다.",
    "action": "매월 같은 날짜에 저축률·고정비·비상금 세 숫자 기록하기"
  }
];

export const MONTH_2_SOURCES = SPECS.map(makeAdditionalSource);

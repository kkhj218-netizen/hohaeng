import { makeAdditionalSource, type AdditionalPostSpec } from './preparedPostFactory';

const SPECS: AdditionalPostSpec[] = [
  {
    "seedSlug": "prepared-month6-couple-finance-pillar",
    "title": "부부 통장부터 공동목표까지, 싸우지 않는 재정관리 총정리",
    "keyword": "부부 재정관리",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "공동생활비·각자소비·저축·부채를 어떤 원칙으로 나눌지 합의해야 돈의 흐름이 보입니다.",
    "comparison": "완전합산·완전분리·공동통장 방식의 장단점을 비교합니다.",
    "action": "월 1회 숫자만 확인하는 부부 돈회의 일정 정하기"
  },
  {
    "seedSlug": "prepared-month6-combined-vs-separate",
    "title": "부부 돈 합치기 vs 각자 관리, 우리에게 맞는 방식",
    "keyword": "부부 돈 합치기",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "신뢰와 자율성, 공동목표와 기존부채에 따라 적합한 관리방식이 달라집니다.",
    "comparison": "모든소득 합산과 공동비만 분담하는 방식의 투명성·편의성을 비교합니다.",
    "action": "각 방식에서 반드시 공유할 숫자와 개인영역을 문장으로 정하기"
  },
  {
    "seedSlug": "prepared-month6-joint-account",
    "title": "부부 공동통장 만들기｜생활비·저축 계좌 나누는 법",
    "keyword": "부부 공동통장",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "공동통장 목적을 생활비·고정비·목표저축 중 무엇으로 할지 먼저 정해야 합니다.",
    "comparison": "한 통장에 모두 넣는 경우와 목적별 두세 통장만 쓰는 경우를 비교합니다.",
    "action": "공동입금일·금액·결제항목·잔액처리 규칙 정하기"
  },
  {
    "seedSlug": "prepared-month6-expense-split-half",
    "title": "생활비 반반 부담, 소득이 다를 때도 공평할까?",
    "keyword": "부부 생활비 반반",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "같은 금액을 내는 방식은 단순하지만 소득차가 크면 각자의 저축여력이 달라질 수 있습니다.",
    "comparison": "정액반반과 소득비례 분담 후 개인가처분소득을 비교합니다.",
    "action": "공평의 기준을 같은금액·같은비율·같은잔액 중에서 합의하기"
  },
  {
    "seedSlug": "prepared-month6-income-proportional",
    "title": "부부 생활비 소득 비율대로 나누는 계산법",
    "keyword": "부부 생활비 소득비례",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "각자 세후소득이 전체부부소득에서 차지하는 비율로 공동비를 나눌 수 있습니다.",
    "comparison": "월급비례와 근무시간·가사기여를 함께 고려한 방식의 차이를 비교합니다.",
    "action": "소득변동 때 분담률을 다시 계산할 날짜 정하기"
  },
  {
    "seedSlug": "prepared-month6-fixed-contribution",
    "title": "부부 공동생활비 정액제, 매달 얼마씩 넣어야 할까?",
    "keyword": "부부 생활비 정액 분담",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "공동고정비와 평균생활비, 연간비정기비를 합쳐 월필요액을 먼저 구합니다.",
    "comparison": "필요액만 입금하는 방식과 예비비를 더해 잔액을 쌓는 방식을 비교합니다.",
    "action": "최근 3개월 공동지출 평균에 10% 예비비 더하기"
  },
  {
    "seedSlug": "prepared-month6-shared-saving-goal",
    "title": "부부 공동저축 목표, 각자 얼마씩 모아야 할까?",
    "keyword": "부부 공동저축 계산",
    "cluster": "부부 재정",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "목표금액·마감일·현재잔액을 공유하면 필요한 월저축액을 역산할 수 있습니다.",
    "comparison": "동일금액 분담과 소득비례 분담에서 각자의 부담을 비교합니다.",
    "action": "자동이체 뒤 남은 개인생활비까지 확인하고 금액 확정하기"
  },
  {
    "seedSlug": "prepared-month6-emergency-fund",
    "title": "맞벌이·외벌이 부부 비상금 목표 다르게 잡기",
    "keyword": "부부 비상금 계산",
    "cluster": "부부 재정",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "소득원이 하나인지 둘인지와 고용안정성, 부양가족에 따라 필요한 개월 수가 달라집니다.",
    "comparison": "한 사람 소득중단과 전체소득중단 시나리오의 필수생활비를 비교합니다.",
    "action": "공동 비상금과 개인 비상금의 사용조건을 따로 적기"
  },
  {
    "seedSlug": "prepared-month6-debt-disclosure",
    "title": "결혼 후 대출·카드빚, 어디까지 서로 공개해야 할까?",
    "keyword": "부부 부채 공개",
    "cluster": "부부 재정",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "공동주거와 저축목표에 영향을 주는 잔액·금리·상환일은 정확히 공유해야 합니다.",
    "comparison": "각자책임 상환과 공동자금 상환이 목표기간에 미치는 영향을 비교합니다.",
    "action": "비난 없이 사실표를 만들고 변경사항을 월회의에서 업데이트하기"
  },
  {
    "seedSlug": "prepared-month6-investment-risk",
    "title": "부부 투자성향이 다를 때 공동자금은 어떻게 투자할까?",
    "keyword": "부부 투자성향 차이",
    "cluster": "부부 재정",
    "calculatorHref": "/money/position-size-calc",
    "calculatorLabel": "포지션 수량 계산기",
    "focus": "공동목표의 기간과 손실감당범위를 먼저 정하고 개인투자와 분리해야 합니다.",
    "comparison": "안전자산 선호와 공격투자 선호를 섞은 목표비중을 비교합니다.",
    "action": "공동자금 최대손실과 각자 자유투자 한도를 합의하기"
  },
  {
    "seedSlug": "prepared-month6-asset-snapshot",
    "title": "부부 자산현황표 만들기｜통장·투자·대출 한눈에 보기",
    "keyword": "부부 자산현황표",
    "cluster": "부부 재정",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "현금·투자·보증금·연금·대출을 기준일 하나로 모아야 전체재산을 볼 수 있습니다.",
    "comparison": "각자 명의와 공동목적을 구분한 자산표를 비교합니다.",
    "action": "매월 말 잔액을 업데이트하고 계좌 비밀번호는 공유하지 않기"
  },
  {
    "seedSlug": "prepared-month6-net-worth",
    "title": "부부 순자산 계산법｜자산에서 빚을 빼면 얼마일까?",
    "keyword": "부부 순자산 계산",
    "cluster": "부부 재정",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "총자산에서 모든 부채잔액을 빼면 현재 순자산을 확인할 수 있습니다.",
    "comparison": "집값 상승만 본 자산증가와 대출을 반영한 순자산변화를 비교합니다.",
    "action": "분기마다 순자산과 전분기 증감원인 기록하기"
  },
  {
    "seedSlug": "prepared-month6-monthly-money-meeting",
    "title": "부부 돈회의 월 1회, 30분이면 충분한 진행 순서",
    "keyword": "부부 돈회의",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "잔액확인·예외지출·목표진도·다음달 결정을 정해진 순서로 보면 감정싸움을 줄일 수 있습니다.",
    "comparison": "잘못을 찾는 대화와 숫자를 함께 수정하는 회의방식을 비교합니다.",
    "action": "같은 날짜와 네 가지 안건으로 30분 타이머 설정하기"
  },
  {
    "seedSlug": "prepared-month6-weekly-check",
    "title": "매주 10분 부부 생활비 점검, 무엇만 보면 될까?",
    "keyword": "부부 주간 생활비 점검",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "공동통장 잔액·이번주 큰 지출·다음주 예정비용 세 가지만 확인해도 초과지출을 빨리 발견합니다.",
    "comparison": "매일 간섭하는 방식과 주 1회 합의된 점검의 부담을 비교합니다.",
    "action": "일요일에 잔액과 예정지출만 공유하고 평가하지 않기"
  },
  {
    "seedSlug": "prepared-month6-financial-goals",
    "title": "집·여행·투자, 부부 돈 목표 우선순위 정하는 법",
    "keyword": "부부 재정 목표",
    "cluster": "부부 재정",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "목표마다 금액·기한·필요이유를 적으면 동시에 진행 가능한지 판단할 수 있습니다.",
    "comparison": "세 목표를 모두 조금씩 모으는 경우와 1순위에 집중하는 경우를 비교합니다.",
    "action": "각자 1순위를 적고 공통점이 큰 목표부터 월저축 배정하기"
  },
  {
    "seedSlug": "prepared-month6-travel-fund",
    "title": "부부 여행비 통장, 카드 할부 없이 모으는 방법",
    "keyword": "부부 여행비 저축",
    "cluster": "부부 재정",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "여행예산과 출발일, 현재모은금액을 알면 필요한 월적립액을 정할 수 있습니다.",
    "comparison": "예산을 낮추는 경우와 출발일을 늦추는 경우의 월부담을 비교합니다.",
    "action": "항공·숙박·현지비·예비비로 목표금액 세분화하기"
  },
  {
    "seedSlug": "prepared-month6-gift-budget",
    "title": "기념일·선물비, 부부가 서운하지 않게 예산 정하기",
    "keyword": "부부 선물비 예산",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "금액보다 서로 기대하는 방식과 공동생활비에서 쓸지 개인비에서 쓸지 합의가 필요합니다.",
    "comparison": "매번 즉흥결제와 연간기념일 예산을 월적립하는 방식을 비교합니다.",
    "action": "기념일 달력과 연간상한을 정하고 월별로 나눠 적립하기"
  },
  {
    "seedSlug": "prepared-month6-parent-support",
    "title": "부모님 용돈·경조사비, 부부 공동예산에 넣는 기준",
    "keyword": "부모님 용돈 부부 예산",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "양가 지원은 금액·빈도·예외상황을 미리 공유해야 갑작스러운 갈등을 줄일 수 있습니다.",
    "comparison": "정액지원과 필요할 때마다 지원하는 경우의 현금흐름을 비교합니다.",
    "action": "양가에 같은기준을 적용할지와 개인추가지원 범위 합의하기"
  },
  {
    "seedSlug": "prepared-month6-housing-plan",
    "title": "전세·월세·매매, 부부 주거자금 목표 세우는 법",
    "keyword": "부부 주거자금 계획",
    "cluster": "부부 재정",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "보증금·취득비용·이사비·대출상환액을 함께 계산해야 실제 필요한 현금을 알 수 있습니다.",
    "comparison": "주거형태별 초기자금과 월현금흐름, 부채부담을 비교합니다.",
    "action": "최대주거비와 이사희망시점을 먼저 정해 목표저축 역산하기"
  },
  {
    "seedSlug": "prepared-month6-baby-plan",
    "title": "출산 준비비와 육아휴직, 부부 현금흐름 미리 계산하기",
    "keyword": "출산 준비 부부 재정",
    "cluster": "부부 재정",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "일회성 출산준비비와 소득감소기간의 필수생활비를 따로 계산해야 합니다.",
    "comparison": "한 사람 휴직과 두 사람 순차휴직에서 월부족액을 비교합니다.",
    "action": "예상소득감소와 고정비를 기준으로 별도비상금 목표 정하기"
  },
  {
    "seedSlug": "prepared-month6-insurance-review",
    "title": "부부 보험 합쳐 보기｜중복보장과 총보험료 점검",
    "keyword": "부부 보험 점검",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "각자 계약을 존중하면서 공동생활에 필요한 보장과 총월보험료를 함께 확인합니다.",
    "comparison": "중복가능성이 있는 보장과 서로 보완되는 보장을 구분합니다.",
    "action": "보장내역표를 만들고 변경은 전문가·공식자료 확인 후 결정하기"
  },
  {
    "seedSlug": "prepared-month6-tax-refund",
    "title": "연말정산 환급금, 부부가 어떻게 나누고 쓸까?",
    "keyword": "부부 연말정산 환급금",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "환급은 공짜돈이 아니라 미리 낸 세금의 정산이므로 일회성소득으로 다루는 편이 안전합니다.",
    "comparison": "각자사용·공동목표·부채상환으로 나눈 경우를 비교합니다.",
    "action": "환급 전 공동기여와 개인세금 차이를 고려한 배분규칙 정하기"
  },
  {
    "seedSlug": "prepared-month6-bonus-plan",
    "title": "부부 성과급이 다른 달에 들어올 때 공동목표 배분법",
    "keyword": "부부 성과급 관리",
    "cluster": "부부 재정",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "성과급을 월생활비에 섞지 않고 개인보상과 공동목표 비율을 정하면 계획이 흔들리지 않습니다.",
    "comparison": "금액동일 배분과 각자성과급의 같은비율 기여를 비교합니다.",
    "action": "입금 전 비상금·부채·목표·자유비 비율 합의하기"
  },
  {
    "seedSlug": "prepared-month6-income-gap",
    "title": "부부 소득차가 클 때 저축과 개인용돈 정하는 법",
    "keyword": "부부 소득차 돈관리",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "기여금액뿐 아니라 각자에게 남는 자유돈과 비금전기여를 함께 고려해야 합니다.",
    "comparison": "같은용돈·소득비례용돈·공동비후잔액 방식의 체감을 비교합니다.",
    "action": "서로 통제받지 않는 최소개인비와 공동저축률 정하기"
  },
  {
    "seedSlug": "prepared-month6-job-loss",
    "title": "한 사람이 퇴사·실직하면 부부 예산은 어떻게 바꿀까?",
    "keyword": "부부 실직 대비",
    "cluster": "부부 재정",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "한 사람 소득으로 유지할 필수지출과 즉시 줄일 선택지출을 미리 구분해야 합니다.",
    "comparison": "평소예산과 비상예산에서 버틸 수 있는 개월 수를 비교합니다.",
    "action": "소득중단 시 자동으로 적용할 비상예산표 만들기"
  },
  {
    "seedSlug": "prepared-month6-personal-allowance",
    "title": "부부 개인용돈, 얼마가 적당하고 어디까지 자유일까?",
    "keyword": "부부 용돈 기준",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "개인용돈은 금액과 함께 포함항목, 미사용잔액, 큰 개인구매의 공유기준을 정해야 합니다.",
    "comparison": "같은금액과 소득비례, 생활비후잔액 방식의 자율성을 비교합니다.",
    "action": "상대가 묻지 않는 자유범위와 사전논의 기준금액 합의하기"
  },
  {
    "seedSlug": "prepared-month6-financial-privacy",
    "title": "부부라도 계좌를 모두 공개해야 할까? 투명성과 사생활 균형",
    "keyword": "부부 계좌 공개 범위",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "공동목표와 위험에 영향을 주는 잔액·부채는 공유하되 거래내역 전부 공개는 별도합의가 필요합니다.",
    "comparison": "잔액요약 공유와 모든결제내역 공유의 신뢰·통제감을 비교합니다.",
    "action": "필수공유 숫자와 개인영역을 명확한 문장으로 정하기"
  },
  {
    "seedSlug": "prepared-month6-money-conflict",
    "title": "돈 때문에 싸웠을 때 숫자부터 다시 정리하는 대화법",
    "keyword": "부부 돈 갈등 해결",
    "cluster": "부부 재정",
    "calculatorHref": "/money/savings-rate-calc",
    "calculatorLabel": "저축률 계산기",
    "focus": "누가 잘못했는지보다 기대했던 규칙과 실제지출의 차이를 분리해야 해결점을 찾을 수 있습니다.",
    "comparison": "성격평가 중심 대화와 기준·금액·다음행동 중심 대화를 비교합니다.",
    "action": "감정이 가라앉은 뒤 사실 한 개와 요청 한 개씩 말하기"
  },
  {
    "seedSlug": "prepared-month6-finance-dashboard",
    "title": "부부 재정 대시보드, 매달 볼 숫자 5가지",
    "keyword": "부부 재정 대시보드",
    "cluster": "부부 재정",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "세후소득·저축률·공동생활비·비상금개월·순자산만 모아도 큰 흐름을 볼 수 있습니다.",
    "comparison": "세부거래를 모두 보는 방식과 핵심지표만 월별추세로 보는 방식을 비교합니다.",
    "action": "매월 말 같은 날 다섯 숫자를 한 줄로 저장하기"
  },
  {
    "seedSlug": "prepared-month6-annual-review",
    "title": "부부 연간 재정결산｜올해 돈과 내년 목표 정리하기",
    "keyword": "부부 연간 재정결산",
    "cluster": "부부 재정",
    "calculatorHref": "/money/goal-calc",
    "calculatorLabel": "목표금액 계산기",
    "focus": "연초대비 순자산·부채·저축액·큰지출·목표진도를 함께 봐야 한 해의 변화를 이해할 수 있습니다.",
    "comparison": "계획과 실제의 차이를 수입·지출·수익률·예외사건으로 나누어 비교합니다.",
    "action": "서로의 기여를 확인하고 내년 공동목표 세 개 이하로 정하기"
  }
];

export const MONTH_6_SOURCES = SPECS.map(makeAdditionalSource);


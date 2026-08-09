import { makeAdditionalSource, type AdditionalPostSpec } from './preparedPostFactory';

const SPECS: AdditionalPostSpec[] = [
  {
    "seedSlug": "prepared-month3-debt-payoff-pillar",
    "title": "대출부터 카드빚까지, 부채를 줄이는 상환 계획 총정리",
    "keyword": "부채 상환 계획",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "모든 부채의 잔액·금리·월납입액·만기를 한 표에 모아야 우선순위를 정할 수 있습니다.",
    "comparison": "월부담을 낮추는 계획과 총이자를 줄이는 계획을 나란히 비교합니다.",
    "action": "연체를 막을 최소납입액을 확보한 뒤 추가상환 순서 정하기"
  },
  {
    "seedSlug": "prepared-month3-debt-ratio",
    "title": "내 월급에서 빚 상환액은 몇 %? 부채상환비율 계산",
    "keyword": "부채상환비율 계산",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "세후소득 대비 매달 갚는 원금과 이자의 비율을 계산하면 현금흐름 압박을 확인할 수 있습니다.",
    "comparison": "현재 비율과 금리가 오르거나 소득이 줄었을 때의 비율을 비교합니다.",
    "action": "모든 자동이체 상환액을 합쳐 세후소득과 나누기"
  },
  {
    "seedSlug": "prepared-month3-monthly-interest",
    "title": "대출이자 한 달에 얼마일까? 원금·금리로 계산하는 법",
    "keyword": "월 대출이자 계산",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "단순 월이자는 남은 원금에 연금리를 적용해 12로 나누지만 실제 납부액은 상환방식에 따라 달라집니다.",
    "comparison": "이자만 낼 때와 원금까지 함께 갚을 때 잔액 감소 속도를 비교합니다.",
    "action": "대출별 다음 달 이자와 원금상환액을 분리해 기록하기"
  },
  {
    "seedSlug": "prepared-month3-equal-payment-vs-principal",
    "title": "원리금균등과 원금균등, 월 상환액과 총이자 비교",
    "keyword": "원리금균등 원금균등 비교",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "원리금균등은 월납입액이 비교적 일정하고 원금균등은 초반 부담이 크지만 원금이 빠르게 줄어듭니다.",
    "comparison": "같은 원금·금리·기간으로 첫 달 납입액과 총이자를 비교합니다.",
    "action": "현재 소득으로 초반 상환액을 감당할 수 있는지 먼저 확인하기"
  },
  {
    "seedSlug": "prepared-month3-prepayment",
    "title": "대출 중도상환, 수수료를 내도 이득일까?",
    "keyword": "대출 중도상환 계산",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "중도상환으로 줄어드는 미래이자와 남은 중도상환수수료를 같은 기간으로 비교해야 합니다.",
    "comparison": "지금 일부상환하는 경우와 비상금을 유지하며 예정대로 갚는 경우를 비교합니다.",
    "action": "수수료 면제시점과 상환 후 남을 비상금을 함께 적기"
  },
  {
    "seedSlug": "prepared-month3-payoff-period",
    "title": "월 50만 원씩 갚으면 빚은 언제 끝날까? 상환기간 계산",
    "keyword": "빚 상환기간 계산",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "부채 완납기간 도구",
    "focus": "잔액·연금리·월상환액을 알면 원리금이 모두 사라질 때까지 필요한 개월 수를 추정할 수 있습니다.",
    "comparison": "월상환액을 10만 원 늘렸을 때 기간과 총이자가 얼마나 줄어드는지 비교합니다.",
    "action": "현재 자동이체액으로 예상 완납월을 달력에 표시하기"
  },
  {
    "seedSlug": "prepared-month3-minimum-payment",
    "title": "최소납입만 하면 카드빚은 얼마나 오래 갈까?",
    "keyword": "최소납입 부채 상환",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "최소납입액이 이자와 수수료에 가까우면 원금은 매우 느리게 줄어듭니다.",
    "comparison": "최소납입만 하는 경우와 정액 추가상환을 하는 경우의 완납기간을 비교합니다.",
    "action": "이자를 넘는 고정 추가상환액을 월예산에 먼저 넣기"
  },
  {
    "seedSlug": "prepared-month3-revolving-risk",
    "title": "카드 리볼빙, 이번 달 부담이 줄어도 빚이 커지는 이유",
    "keyword": "카드 리볼빙 상환",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "이월된 결제대금에는 높은 수수료율이 적용될 수 있어 잔액과 다음 달 청구액을 함께 봐야 합니다.",
    "comparison": "리볼빙을 계속 이용하는 경우와 고정상환계획으로 종료하는 경우를 비교합니다.",
    "action": "이월잔액·수수료율·약정비율을 확인하고 종료 목표월 정하기"
  },
  {
    "seedSlug": "prepared-month3-card-loan",
    "title": "카드론 먼저 갚아야 할까? 금리와 신용 부담 확인",
    "keyword": "카드론 상환 순서",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "카드론은 금리와 월상환액뿐 아니라 다른 대출 심사와 현금흐름에 미칠 영향도 확인해야 합니다.",
    "comparison": "카드론 우선상환과 더 높은 금리 부채 우선상환을 비교합니다.",
    "action": "모든 부채의 실질금리를 적어 가장 비싼 순서로 정렬하기"
  },
  {
    "seedSlug": "prepared-month3-overdraft-account",
    "title": "마이너스통장 이자, 사용한 금액 기준으로 계산하기",
    "keyword": "마이너스통장 이자 계산",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "한도 전체가 아니라 실제 사용잔액과 사용일수에 따라 이자가 달라질 수 있습니다.",
    "comparison": "평균사용잔액을 줄이는 경우와 금리만 낮추는 경우의 이자절감액을 비교합니다.",
    "action": "급여가 들어오면 사용잔액을 먼저 줄이는 자동규칙 만들기"
  },
  {
    "seedSlug": "prepared-month3-rate-rise-payment",
    "title": "대출금리 1%포인트 오르면 월이자는 얼마나 늘까?",
    "keyword": "대출금리 상승 이자",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "금리 변화는 남은 원금과 잔여기간이 클수록 월납입액과 총이자에 큰 영향을 줍니다.",
    "comparison": "현재금리와 1%포인트 높은 금리에서 월상환액을 비교합니다.",
    "action": "금리상승분만큼 매달 별도 예비비를 쌓아보기"
  },
  {
    "seedSlug": "prepared-month3-fixed-vs-variable-rate",
    "title": "고정금리와 변동금리, 무엇이 더 유리할까?",
    "keyword": "고정금리 변동금리 비교",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "초기금리 차이뿐 아니라 변동주기, 기준금리와 상환기간 동안의 불확실성을 봐야 합니다.",
    "comparison": "금리가 유지·상승·하락하는 세 경우의 총부담을 비교합니다.",
    "action": "변동금리가 올라도 감당할 수 있는 월상환 상한 정하기"
  },
  {
    "seedSlug": "prepared-month3-refinancing",
    "title": "대환대출 갈아타기, 금리 차이만 보면 안 되는 이유",
    "keyword": "대환대출 비교",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "새 금리와 함께 취급비용, 중도상환수수료, 기간 연장으로 늘어나는 총이자를 확인해야 합니다.",
    "comparison": "기존 대출 유지와 대환 후 같은 완납일을 유지하는 경우를 비교합니다.",
    "action": "두 상품의 총상환액과 완납일을 같은 표에 적기"
  },
  {
    "seedSlug": "prepared-month3-dsr-basics",
    "title": "DSR이란? 내 소득에서 연간 원리금 비율 이해하기",
    "keyword": "DSR 계산 원리",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "DSR은 연간소득과 여러 대출의 연간 원리금 상환액을 비교하는 지표입니다.",
    "comparison": "금융기관 심사기준과 개인 현금흐름 안전선은 같지 않을 수 있음을 비교합니다.",
    "action": "공식 심사는 금융기관에 확인하고 개인표에는 세후소득도 함께 보기"
  },
  {
    "seedSlug": "prepared-month3-ltv-dti-dsr",
    "title": "LTV·DTI·DSR 차이, 주택대출 전에 알아둘 핵심",
    "keyword": "LTV DTI DSR 차이",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "담보가치·소득·원리금이라는 서로 다른 기준을 구분해야 대출 가능액과 감당 가능액을 혼동하지 않습니다.",
    "comparison": "규정상 가능한 한도와 내 생활비를 남긴 실제 상환한도를 비교합니다.",
    "action": "최신 규정은 공식기관과 금융회사에서 확인하고 개인예산은 별도로 계산하기"
  },
  {
    "seedSlug": "prepared-month3-emergency-debt",
    "title": "비상금이 없을 때 빚부터 갚아도 될까?",
    "keyword": "비상금 부채 상환 우선순위",
    "cluster": "대출·부채",
    "calculatorHref": "/money/emergency-fund-calc",
    "calculatorLabel": "비상금 계산기",
    "focus": "모든 현금을 상환에 쓰면 예상치 못한 지출 때 다시 고금리 빚을 낼 수 있습니다.",
    "comparison": "소액 비상금을 먼저 확보하는 경우와 즉시 전액상환하는 경우의 위험을 비교합니다.",
    "action": "최소 한 달 필수생활비를 확보한 뒤 추가상환 시작하기"
  },
  {
    "seedSlug": "prepared-month3-high-interest-first",
    "title": "고금리 대출부터 갚는 이자 절약 전략",
    "keyword": "고금리 부채 우선상환",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "모든 대출의 최소납입을 지키면서 금리가 가장 높은 잔액에 추가상환하면 총이자를 줄이기 쉽습니다.",
    "comparison": "고금리 우선법과 잔액이 작은 빚 우선법의 비용과 동기를 비교합니다.",
    "action": "금리순 목록 맨 위 대출에 월 추가상환액 집중하기"
  },
  {
    "seedSlug": "prepared-month3-debt-snowball",
    "title": "작은 빚부터 없애는 눈덩이 상환법, 장단점",
    "keyword": "부채 눈덩이 상환법",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "잔액이 작은 빚을 먼저 끝내면 계좌 수가 줄고 성취감을 얻을 수 있습니다.",
    "comparison": "눈덩이 방식과 이자절감이 큰 고금리 우선방식을 비교합니다.",
    "action": "중도 포기를 줄이는 방식과 추가이자 비용을 함께 판단하기"
  },
  {
    "seedSlug": "prepared-month3-debt-avalanche",
    "title": "이자를 가장 많이 줄이는 부채 눈사태 상환법",
    "keyword": "부채 눈사태 상환법",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "금리가 높은 순서로 추가상환하면 수학적으로 총이자를 줄이는 데 유리합니다.",
    "comparison": "완납 체감이 느린 단점과 실제 절약되는 이자액을 비교합니다.",
    "action": "자동이체로 최소납입을 지키고 최고금리 부채에 추가입금하기"
  },
  {
    "seedSlug": "prepared-month3-multiple-loans",
    "title": "대출이 여러 개일 때 상환 우선순위 정하는 표",
    "keyword": "다중 대출 상환 순서",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "잔액·금리·월납입·만기·담보 여부를 한 줄씩 적어야 전체 위험을 볼 수 있습니다.",
    "comparison": "금리순·잔액순·만기임박순으로 정렬했을 때 우선대상이 어떻게 달라지는지 비교합니다.",
    "action": "최소납입일을 캘린더에 넣고 추가상환 대상 한 개만 선택하기"
  },
  {
    "seedSlug": "prepared-month3-repayment-calendar",
    "title": "대출 상환 스케줄표, 원금이 줄어드는 과정 기록하기",
    "keyword": "대출 상환 스케줄",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "매월 납입액을 원금과 이자로 나누어 기록하면 잔액 감소 속도를 확인할 수 있습니다.",
    "comparison": "예정표와 실제 납입내역의 차이를 비교해 금리변경이나 추가상환을 반영합니다.",
    "action": "매월 납입 후 남은 원금과 다음 결제일 업데이트하기"
  },
  {
    "seedSlug": "prepared-month3-grace-period",
    "title": "거치기간이 끝나면 월 상환액이 얼마나 늘어날까?",
    "keyword": "대출 거치기간 종료",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "거치기간에는 이자만 내다가 종료 후 원금상환이 시작되어 월부담이 크게 늘 수 있습니다.",
    "comparison": "거치 중 납입액과 종료 후 예상 원리금을 비교합니다.",
    "action": "종료 3개월 전부터 증가분만큼 예비비로 따로 모으기"
  },
  {
    "seedSlug": "prepared-month3-balloon-payment",
    "title": "만기일시상환 대출, 만기 원금을 어떻게 준비할까?",
    "keyword": "만기일시상환 계획",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "매달 이자만 냈다면 만기에는 원금 전체가 남아 있으므로 별도 적립계획이 필요합니다.",
    "comparison": "만기까지 정액저축하는 경우와 중간중간 원금을 줄이는 경우를 비교합니다.",
    "action": "남은 개월 수로 원금을 나눠 월준비액 계산하기"
  },
  {
    "seedSlug": "prepared-month3-credit-score-payment",
    "title": "대출 상환과 신용점수, 무엇부터 관리해야 할까?",
    "keyword": "대출 상환 신용점수",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "연체를 피하고 약속한 납입을 지키는 것이 우선이며 단기 점수만 보고 무리한 거래를 할 필요는 없습니다.",
    "comparison": "대출잔액 감소와 결제일 준수, 한도사용 관리의 영향을 구분합니다.",
    "action": "모든 결제일 자동납부와 잔액알림을 먼저 설정하기"
  },
  {
    "seedSlug": "prepared-month3-late-payment-response",
    "title": "대출 연체가 예상될 때 먼저 해야 할 일",
    "keyword": "대출 연체 대응",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "결제일을 넘기기 전에 금융회사와 상담하고 필요한 금액과 가능한 납입일을 확인해야 합니다.",
    "comparison": "침묵한 채 연체하는 경우와 사전에 조정가능성을 문의하는 경우를 비교합니다.",
    "action": "당일 금융회사 공식창구에 연락하고 생활비·상환 우선순위 재작성하기"
  },
  {
    "seedSlug": "prepared-month3-total-interest",
    "title": "대출 총이자 계산｜월 상환액보다 더 중요한 숫자",
    "keyword": "대출 총이자 계산",
    "cluster": "대출·부채",
    "calculatorHref": "/money/loan-calc",
    "calculatorLabel": "대출 원리금 상환 계산기",
    "focus": "총상환액에서 빌린 원금을 빼면 전체 기간 부담할 예상이자를 확인할 수 있습니다.",
    "comparison": "기간을 늘려 월납입을 낮춘 경우와 짧게 갚아 총이자를 줄인 경우를 비교합니다.",
    "action": "대출 선택표에 첫 달 납입액과 총이자를 함께 적기"
  },
  {
    "seedSlug": "prepared-month3-affordable-payment",
    "title": "월 대출상환액 상한, 생활비를 남기고 정하는 법",
    "keyword": "감당 가능한 대출상환액",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "세후소득에서 필수생활비·보험·최소저축을 뺀 금액 안에서 상환액을 정해야 합니다.",
    "comparison": "소득이 20% 줄어든 경우에도 연체 없이 버틸 수 있는지 비교합니다.",
    "action": "보수적 소득 기준으로 월상환 상한을 먼저 계산하기"
  },
  {
    "seedSlug": "prepared-month3-bonus-prepayment",
    "title": "보너스로 대출 갚기, 전액상환과 분할 사용 비교",
    "keyword": "보너스 대출 상환",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "보너스를 상환에 쓰기 전 비상금과 가까운 시기의 큰 지출을 남겨야 합니다.",
    "comparison": "보너스 전액상환과 비상금·상환을 나눈 경우의 이자와 유동성을 비교합니다.",
    "action": "입금 전 배분비율과 상환할 대출을 미리 정하기"
  },
  {
    "seedSlug": "prepared-month3-couple-debt",
    "title": "부부 대출과 카드빚, 어디까지 함께 공개하고 갚을까?",
    "keyword": "부부 부채 관리",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "공동목표에 영향을 주는 잔액·금리·연체위험은 함께 확인하되 책임과 상환방식은 합의가 필요합니다.",
    "comparison": "각자 상환과 공동상환에서 목표기간과 생활비 부담을 비교합니다.",
    "action": "비난 없이 숫자표를 공유하고 공동자금 사용범위 정하기"
  },
  {
    "seedSlug": "prepared-month3-debt-free-plan",
    "title": "빚 없는 날 정하기｜12개월 부채 탈출 계획",
    "keyword": "부채 탈출 계획",
    "cluster": "대출·부채",
    "calculatorHref": "/money/debt-payoff-calc",
    "calculatorLabel": "빚 상환기간 계산기",
    "focus": "목표 완납일을 정하면 필요한 월상환액과 추가소득 목표를 역산할 수 있습니다.",
    "comparison": "12개월 완납과 24개월 완납에서 월부담과 총이자를 비교합니다.",
    "action": "한 달 단위 목표잔액을 정하고 매월 같은 날 업데이트하기"
  }
];

export const MONTH_3_SOURCES = SPECS.map(makeAdditionalSource);

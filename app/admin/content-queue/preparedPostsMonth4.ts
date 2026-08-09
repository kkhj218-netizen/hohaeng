import { makeAdditionalSource, type AdditionalPostSpec } from './preparedPostFactory';

const SPECS: AdditionalPostSpec[] = [
  {
    "seedSlug": "prepared-month4-return-risk-pillar",
    "title": "투자 수익률 계산부터 손실관리까지, 계좌 관리 총정리",
    "keyword": "투자 수익률 손실관리",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "원금·추가입금·출금·평가액을 구분해야 실제 투자성과와 현금흐름을 혼동하지 않습니다.",
    "comparison": "수익률뿐 아니라 최대손실·보유기간·수수료를 함께 비교합니다.",
    "action": "월말마다 원금과 손익, 위험지표를 같은 양식으로 기록하기"
  },
  {
    "seedSlug": "prepared-month4-roi-formula",
    "title": "투자 수익률 계산법｜원금과 평가금액으로 ROI 구하기",
    "keyword": "투자 수익률 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "ROI 확인 도구",
    "focus": "단순수익률은 평가금액에서 투자원금을 뺀 손익을 원금으로 나누어 계산합니다.",
    "comparison": "추가입금이 없는 경우와 입출금이 섞인 경우의 계산 차이를 비교합니다.",
    "action": "거래내역에서 순입금액과 현재평가액을 따로 적기"
  },
  {
    "seedSlug": "prepared-month4-annualized-return",
    "title": "3개월 수익률을 연 수익률로 바꿔도 될까?",
    "keyword": "연환산 수익률 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/cagr-calc",
    "calculatorLabel": "CAGR 계산기",
    "focus": "짧은 기간 수익을 단순히 12개월로 곱하면 복리와 변동을 무시할 수 있습니다.",
    "comparison": "단순연환산과 복리연환산 결과, 실제 1년 성과의 차이를 비교합니다.",
    "action": "기간이 짧을수록 연환산 수치를 예측처럼 사용하지 않기"
  },
  {
    "seedSlug": "prepared-month4-cagr-basics",
    "title": "CAGR 계산법｜첫 투자금이 몇 년 동안 얼마나 성장했을까?",
    "keyword": "CAGR 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/cagr-calc",
    "calculatorLabel": "연평균 성장률 도구",
    "focus": "CAGR은 시작금액과 종료금액, 기간으로 연평균 복리성장률을 구합니다.",
    "comparison": "단순평균수익률과 CAGR이 다른 이유를 같은 예시로 비교합니다.",
    "action": "시작·종료 기준일을 정확히 맞춰 장기성과 기록하기"
  },
  {
    "seedSlug": "prepared-month4-monthly-vs-annual-return",
    "title": "월 수익률 5%와 연 수익률 60%가 같지 않은 이유",
    "keyword": "월 수익률 연 수익률 변환",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/cagr-calc",
    "calculatorLabel": "CAGR 계산기",
    "focus": "월수익률이 반복된다고 가정하면 복리 때문에 단순 12배와 다른 연환산 결과가 나옵니다.",
    "comparison": "월 5% 단순합과 월복리 연환산, 실제 변동경로를 비교합니다.",
    "action": "높은 월수익률을 장기 기대치로 그대로 쓰지 않기"
  },
  {
    "seedSlug": "prepared-month4-loss-recovery-formula",
    "title": "손실 복구 수익률 계산｜-20% 뒤에는 왜 +25%가 필요할까?",
    "keyword": "손실 복구 수익률",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/loss-recovery-calc",
    "calculatorLabel": "손실 복구 계산기",
    "focus": "손실 뒤 원금이 작아졌기 때문에 같은 퍼센트 상승으로는 이전 금액에 돌아오지 못합니다.",
    "comparison": "손실률별 필요한 회복률과 필요한 금액을 함께 비교합니다.",
    "action": "현재손실에서 본전까지 필요한 금액을 계산하고 위험한 만회매매 피하기"
  },
  {
    "seedSlug": "prepared-month4-recover-minus-10",
    "title": "투자 손실 -10%, 본전까지 필요한 수익률과 대응",
    "keyword": "마이너스 10프로 복구",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/loss-recovery-calc",
    "calculatorLabel": "손실 복구 계산기",
    "focus": "100이 90이 된 뒤 다시 100이 되려면 약 11.1%의 상승이 필요합니다.",
    "comparison": "즉시 추가매수와 포지션 유지·축소의 계좌위험을 비교합니다.",
    "action": "손실원인과 최대허용손실을 먼저 적고 대응 결정하기"
  },
  {
    "seedSlug": "prepared-month4-recover-minus-20",
    "title": "투자 손실 -20%, +20%로는 본전이 안 되는 이유",
    "keyword": "마이너스 20프로 복구",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/loss-recovery-calc",
    "calculatorLabel": "손실 복구 계산기",
    "focus": "100이 80이 되면 원래금액으로 돌아가기 위해 25%의 상승이 필요합니다.",
    "comparison": "손실을 방치하는 경우와 사전에 정한 리스크 기준으로 줄이는 경우를 비교합니다.",
    "action": "포지션 크기와 손절기준을 다음 진입 전에 다시 설정하기"
  },
  {
    "seedSlug": "prepared-month4-recover-minus-50",
    "title": "투자 손실 -50%에서 본전까지 +100%가 필요한 이유",
    "keyword": "마이너스 50프로 복구",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/loss-recovery-calc",
    "calculatorLabel": "손실 복구 계산기",
    "focus": "자산이 절반이 되면 남은 금액을 두 배로 만들어야 원금에 돌아옵니다.",
    "comparison": "큰 손실을 한 번 피하는 것과 높은 수익을 반복해서 내는 것의 영향을 비교합니다.",
    "action": "한 종목·한 거래의 최대손실 상한을 계좌 기준으로 정하기"
  },
  {
    "seedSlug": "prepared-month4-break-even-price",
    "title": "주식 손익분기점 계산｜평단가만 보면 부족한 이유",
    "keyword": "주식 손익분기점 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/average-price-calc",
    "calculatorLabel": "주식 평균단가 계산기",
    "focus": "실제 본전가격은 평균매수가에 수수료와 세금 등 거래비용이 더해질 수 있습니다.",
    "comparison": "증권사 표시평단과 세후손익이 0원이 되는 가격을 비교합니다.",
    "action": "매수·매도 예상비용을 포함한 목표가격 기록하기"
  },
  {
    "seedSlug": "prepared-month4-position-size",
    "title": "포지션 사이즈 계산｜한 번의 거래에 몇 주를 사야 할까?",
    "keyword": "포지션 사이즈 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/position-size-calc",
    "calculatorLabel": "포지션 수량 계산기",
    "focus": "계좌에서 감당할 손실금액을 진입가와 손절가의 차이로 나누면 최대수량을 계산할 수 있습니다.",
    "comparison": "같은 손실한도에서 손절폭이 넓고 좁을 때 매수수량 차이를 비교합니다.",
    "action": "진입 전에 계좌위험률·손절가·수량 세 값을 확정하기"
  },
  {
    "seedSlug": "prepared-month4-one-percent-risk",
    "title": "계좌의 1%만 위험에 노출하는 리스크 관리법",
    "keyword": "1프로 리스크 관리",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/position-size-calc",
    "calculatorLabel": "포지션 수량 계산기",
    "focus": "계좌의 1% 규칙은 한 거래가 실패해도 전체계좌 손실을 제한하려는 기준입니다.",
    "comparison": "0.5%·1%·2% 위험에서 연속손실 후 계좌잔액을 비교합니다.",
    "action": "내 변동성과 전략에 맞는 최대위험률을 숫자로 고정하기"
  },
  {
    "seedSlug": "prepared-month4-stop-distance-size",
    "title": "손절가가 멀수록 매수수량을 줄여야 하는 이유",
    "keyword": "손절폭 포지션 수량",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/position-size-calc",
    "calculatorLabel": "포지션 수량 계산기",
    "focus": "진입가와 손절가의 가격차가 커지면 같은 계좌손실 한도에서 수량은 줄어야 합니다.",
    "comparison": "고정수량 거래와 위험금액 고정 거래의 손실변동을 비교합니다.",
    "action": "차트 손절근거를 먼저 정한 뒤 수량을 마지막에 계산하기"
  },
  {
    "seedSlug": "prepared-month4-leverage-risk",
    "title": "레버리지 2배·3배, 수익보다 손실 속도를 먼저 계산하기",
    "keyword": "레버리지 위험 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/position-size-calc",
    "calculatorLabel": "포지션 수량 계산기",
    "focus": "레버리지는 가격변동이 계좌에 미치는 영향을 확대하고 비용과 청산위험도 만들 수 있습니다.",
    "comparison": "현물과 2배 레버리지에서 같은 시장하락이 계좌에 주는 손실을 비교합니다.",
    "action": "최악 변동에서 계좌손실과 추가증거금 가능성 확인하기"
  },
  {
    "seedSlug": "prepared-month4-max-drawdown",
    "title": "최대낙폭 MDD란? 수익률과 함께 봐야 하는 이유",
    "keyword": "최대낙폭 MDD",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/loss-recovery-calc",
    "calculatorLabel": "손실 복구 계산기",
    "focus": "MDD는 고점에서 이후 저점까지 계좌가 얼마나 하락했는지 보여줍니다.",
    "comparison": "최종수익률이 같은 두 전략의 최대낙폭과 회복기간을 비교합니다.",
    "action": "월별 고점·저점·회복일을 투자일지에 기록하기"
  },
  {
    "seedSlug": "prepared-month4-win-rate-profit",
    "title": "승률이 높아도 돈을 잃을 수 있는 이유",
    "keyword": "투자 승률 손익비",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "승률과 평균이익·평균손실을 함께 봐야 전략의 결과를 이해할 수 있습니다.",
    "comparison": "높은승률·낮은손익비와 낮은승률·높은손익비를 비교합니다.",
    "action": "최근 20회 거래의 승률과 평균손익을 함께 계산하기"
  },
  {
    "seedSlug": "prepared-month4-expectancy",
    "title": "트레이딩 기대값 계산｜한 번 거래할 때 평균 얼마를 버나",
    "keyword": "트레이딩 기대값 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "기대값은 승률×평균이익에서 패배확률×평균손실을 뺀 값으로 볼 수 있습니다.",
    "comparison": "수수료 전 기대값과 비용을 뺀 실제 기대값을 비교합니다.",
    "action": "충분한 거래표본을 모아 분기마다 기대값 업데이트하기"
  },
  {
    "seedSlug": "prepared-month4-profit-factor",
    "title": "Profit Factor 계산법과 1보다 커야 하는 이유",
    "keyword": "프로핏 팩터 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "총이익을 총손실로 나눈 값이 1보다 크면 기록기간의 이익이 손실보다 컸다는 뜻입니다.",
    "comparison": "한두 번 큰 이익에 의존한 결과와 고르게 쌓인 결과를 비교합니다.",
    "action": "거래별 손익분포와 최대손실도 함께 확인하기"
  },
  {
    "seedSlug": "prepared-month4-sharpe-ratio",
    "title": "샤프지수란? 수익률만으로 전략을 평가하면 안 되는 이유",
    "keyword": "샤프지수 이해",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "샤프지수는 초과수익을 변동성으로 나눠 위험 대비 성과를 보는 지표입니다.",
    "comparison": "기간과 무위험수익률 가정이 다른 샤프지수를 직접 비교하지 않습니다.",
    "action": "같은 데이터기간과 빈도로 계산한 전략끼리 비교하기"
  },
  {
    "seedSlug": "prepared-month4-fee-impact",
    "title": "매매수수료가 장기 수익률을 얼마나 깎을까?",
    "keyword": "매매수수료 수익률 영향",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "거래횟수가 많을수록 작은 수수료와 스프레드가 누적되어 순수익을 줄입니다.",
    "comparison": "매매 전 총손익과 모든 비용을 뺀 순손익을 비교합니다.",
    "action": "월별 거래비용 합계와 총거래대금 대비 비율 기록하기"
  },
  {
    "seedSlug": "prepared-month4-tax-after-return",
    "title": "세전 수익률과 세후 수익률, 계좌에 남는 돈으로 비교하기",
    "keyword": "세후 투자 수익률",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "상품과 계좌, 거주지에 따라 세금구조가 달라 표면수익률이 같아도 실수령성과는 다를 수 있습니다.",
    "comparison": "세전평가액과 실제 세후현금흐름을 분리해 비교합니다.",
    "action": "세율은 최신 공식안내를 확인하고 계산가정을 기록하기"
  },
  {
    "seedSlug": "prepared-month4-real-return",
    "title": "물가를 뺀 실질수익률, 내 돈의 구매력은 늘었을까?",
    "keyword": "실질수익률 계산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/inflation-calc",
    "calculatorLabel": "물가상승 계산기",
    "focus": "명목수익률이 플러스여도 물가상승률보다 낮으면 구매력은 줄 수 있습니다.",
    "comparison": "명목수익과 물가를 반영한 실질가치 변화를 비교합니다.",
    "action": "장기목표에는 예상물가를 반영해 목표금액 다시 계산하기"
  },
  {
    "seedSlug": "prepared-month4-time-weighted-return",
    "title": "시간가중수익률이란? 입출금 영향을 분리하는 방법",
    "keyword": "시간가중수익률",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "외부입출금 전후의 구간수익을 연결하면 자금 이동의 영향을 줄이고 운용성과를 볼 수 있습니다.",
    "comparison": "단순수익률과 입금시점 영향을 줄인 시간가중 결과를 비교합니다.",
    "action": "큰 입출금 날짜를 기준으로 성과기간을 나누어 기록하기"
  },
  {
    "seedSlug": "prepared-month4-money-weighted-return",
    "title": "금액가중수익률은 왜 내 실제 투자경험에 가까울까?",
    "keyword": "금액가중수익률",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "투자자가 언제 얼마를 넣고 뺐는지 현금흐름까지 반영하면 개인의 실제 경험에 가까운 결과를 볼 수 있습니다.",
    "comparison": "운용전략 평가용 지표와 개인계좌 경험을 보여주는 지표를 구분합니다.",
    "action": "모든 입출금 날짜와 금액을 빠짐없이 저장하기"
  },
  {
    "seedSlug": "prepared-month4-benchmark",
    "title": "내 투자수익률, 어떤 벤치마크와 비교해야 할까?",
    "keyword": "투자 벤치마크 비교",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/cagr-calc",
    "calculatorLabel": "CAGR 계산기",
    "focus": "자산군·통화·위험수준이 비슷한 기준과 비교해야 의미가 있습니다.",
    "comparison": "현금성 자산과 주가지수를 같은 위험으로 단순비교하지 않습니다.",
    "action": "전략 시작 전에 비교기준 한 개와 비교기간을 정하기"
  },
  {
    "seedSlug": "prepared-month4-rebalancing",
    "title": "리밸런싱하면 수익률과 위험은 어떻게 달라질까?",
    "keyword": "포트폴리오 리밸런싱",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "목표비중에서 벗어난 자산을 조정하면 위험수준을 원래계획에 가깝게 되돌릴 수 있습니다.",
    "comparison": "정기리밸런싱과 허용범위 이탈 때만 조정하는 방식을 비교합니다.",
    "action": "목표비중과 허용오차를 적고 분기별로 확인하기"
  },
  {
    "seedSlug": "prepared-month4-dca-return",
    "title": "적립식 투자 수익률, 총입금액만으로 계산하면 왜 틀릴까?",
    "keyword": "적립식 투자 수익률",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/monthly-investment-calc",
    "calculatorLabel": "적립식 투자 계산기",
    "focus": "매달 다른 가격과 시점에 투자하므로 각 입금액의 운용기간이 다릅니다.",
    "comparison": "단순 손익률과 현금흐름을 반영한 결과의 차이를 비교합니다.",
    "action": "월별 입금일·금액·평가액을 같은 표에 기록하기"
  },
  {
    "seedSlug": "prepared-month4-trading-journal-template",
    "title": "투자일지에 꼭 적어야 할 숫자 7가지",
    "keyword": "투자일지 작성법",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "진입근거·가격·수량·손절·목표·비용·결과를 기록하면 반복되는 실수를 찾을 수 있습니다.",
    "comparison": "수익거래와 손실거래를 같은 양식으로 기록해 판단과 결과를 구분합니다.",
    "action": "거래 직후 3분 안에 숫자와 한 줄 복기 남기기"
  },
  {
    "seedSlug": "prepared-month4-return-scenarios",
    "title": "연 3%·5%·7% 수익률, 10년 뒤 자산 차이",
    "keyword": "투자 수익률 시나리오",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/compound-calc",
    "calculatorLabel": "복리 계산기",
    "focus": "장기계획은 한 수익률보다 보수·기준·낙관 세 경우로 보는 편이 안전합니다.",
    "comparison": "연 3%·5%·7%에서 원금과 예상수익, 목표달성시점을 비교합니다.",
    "action": "계획은 낮은 수익률 기준으로 세우고 높은 경우는 참고만 하기"
  },
  {
    "seedSlug": "prepared-month4-monthly-review",
    "title": "월간 투자 결산｜수익보다 먼저 확인할 항목",
    "keyword": "월간 투자 결산",
    "cluster": "투자·손실관리",
    "calculatorHref": "/money/investment-return-calc",
    "calculatorLabel": "투자 수익률 계산기",
    "focus": "월말에는 순입금·실현손익·평가손익·비용·최대낙폭을 분리해야 합니다.",
    "comparison": "목표수익률 달성 여부와 매매원칙 준수 여부를 따로 비교합니다.",
    "action": "매월 마지막 거래일에 같은 양식으로 계좌 스냅샷 저장하기"
  }
];

export const MONTH_4_SOURCES = SPECS.map(makeAdditionalSource);

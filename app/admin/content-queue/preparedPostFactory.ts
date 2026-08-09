import type { PreparedPost, PreparedPostSource } from './preparedPosts';

export type AdditionalPostSpec = {
  seedSlug: string;
  title: string;
  keyword: string;
  cluster: Extract<
    PreparedPost['cluster'],
    '저축·생활비' | '대출·부채' | '투자·손실관리' | '배당·은퇴' | '부부 재정'
  >;
  calculatorHref: string;
  calculatorLabel: string;
  focus: string;
  comparison: string;
  action: string;
};

const CLUSTER_CONTEXT: Record<AdditionalPostSpec['cluster'], string> = {
  '저축·생활비':
    '월급과 생활비는 매달 반복되지만 연간보험료·명절·경조사처럼 불규칙한 지출도 함께 움직입니다. 한 달 숫자만 보지 말고 최소 3개월 평균과 1년 동안 예정된 비용을 나누어 확인해야 계획이 오래 유지됩니다.',
  '대출·부채':
    '대출은 금리뿐 아니라 남은 원금, 상환방식, 중도상환수수료, 만기와 현금흐름을 함께 봐야 합니다. 월 납입액이 낮아 보여도 기간이 길어지면 총이자가 커질 수 있으므로 두 숫자를 따로 기록하는 편이 안전합니다.',
  '투자·손실관리':
    '투자 결과는 수익률 하나로 설명되지 않습니다. 투입 시점, 추가 입금, 수수료·세금, 보유기간과 최대 손실폭이 다르면 같은 수익률도 체감 위험이 달라집니다. 계산 결과는 예측이 아니라 비교를 위한 가정으로 사용해야 합니다.',
  '배당·은퇴':
    '배당과 은퇴자금은 긴 기간을 다루므로 물가, 세금, 지급 변동과 인출 순서를 함께 고려해야 합니다. 표시 배당률이나 평균수익률이 미래에도 그대로 이어진다고 단정하지 말고 보수적인 경우를 별도로 확인해야 합니다.',
  '부부 재정':
    '부부 재정은 정답보다 합의가 중요합니다. 소득과 자산을 전부 합칠지보다 공동목표, 각자 책임 범위, 확인 주기와 예외 상황을 먼저 정하면 돈 이야기가 평가나 통제로 흐르는 것을 줄일 수 있습니다.',
};

export function makeAdditionalSource(
  spec: AdditionalPostSpec
): PreparedPostSource {
  const context = CLUSTER_CONTEXT[spec.cluster];

  return {
    seedSlug: spec.seedSlug,
    title: spec.title,
    keyword: spec.keyword,
    cluster: spec.cluster,
    description: `${spec.keyword}의 계산 기준과 비교 방법, 실제 생활에 적용할 체크리스트를 한 번에 정리했습니다.`,
    calculatorHref: spec.calculatorHref,
    calculatorLabel: spec.calculatorLabel,
    introduction: `${spec.keyword}을 제대로 활용하려면 인터넷의 평균값보다 내 숫자를 먼저 적어야 합니다. ${spec.focus} 이 글에서는 계산 결과가 왜 달라지는지 살펴보고, 오늘 바로 확인할 항목과 다음 달에 다시 점검할 기준까지 순서대로 정리합니다.`,
    summary: [
      `${spec.focus}`,
      `${spec.comparison}`,
      `${spec.action}`,
    ],
    sections: [
      {
        heading: '계산 전에 기준부터 정하기',
        paragraphs: [
          `${spec.focus} 같은 단어를 사용해도 사람마다 포함하는 금액과 기간이 다르면 결과를 비교하기 어렵습니다. 먼저 기준일, 계산 기간, 포함할 수입·지출 또는 원금·수익을 한 줄로 적어두세요. 숫자가 바뀌었을 때 어떤 조건 때문인지 추적하기도 쉬워집니다.`,
        ],
      },
      {
        heading: '두 가지 시나리오로 비교하기',
        paragraphs: [
          `${spec.comparison} 계산기에는 현재 조건을 먼저 넣고, 두 번째에는 금액·기간·수익률 가운데 한 가지만 바꿔보세요. 여러 조건을 동시에 바꾸면 무엇이 결과에 가장 큰 영향을 줬는지 알기 어렵습니다.`,
        ],
      },
      {
        heading: '결과에서 빠지기 쉬운 변수',
        paragraphs: [
          context,
        ],
      },
      {
        heading: '생활에 적용하고 다시 점검하는 법',
        paragraphs: [
          `${spec.action} 처음부터 완벽한 비율을 만들기보다 다음 급여일이나 결제일처럼 확인 날짜를 정하고 작은 금액으로 실행해보세요. 실제 잔액과 계획의 차이를 기록하면 내 생활에 맞는 기준이 쌓입니다.`,
        ],
      },
    ],
    checklist: [
      '기준일·기간·포함 항목을 계산 결과와 함께 적기',
      '현재안과 보수안에서 조건을 하나씩만 바꿔 비교하기',
      spec.action,
    ],
    questions: [
      `${spec.keyword}에서 지금 가장 불확실한 조건은 무엇인가요?`,
      '금액·기간·목표 가운데 이번 달에 직접 바꿀 수 있는 것은 무엇인가요?',
    ],
  };
}

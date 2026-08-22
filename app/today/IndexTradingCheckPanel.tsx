import type { JhMarketMetric } from "@/app/lib/jhMarketTypes";
import {
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  type PublicRelease,
} from "@/app/lib/publicMarket";

type Props = {
  metrics: JhMarketMetric[];
  regime: "Risk-On" | "Neutral" | "Risk-Off" | null;
  regimeConfidence: number | null;
  releases: PublicRelease[];
};

function metric(metrics: JhMarketMetric[], symbol: string) {
  return metrics.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

function regimeKo(regime: Props["regime"]) {
  if (regime === "Risk-On") return "위험선호";
  if (regime === "Risk-Off") return "위험회피";
  if (regime === "Neutral") return "중립";
  return "판단 대기";
}

function vixState(value: number | null) {
  if (value === null) return { label: "확인 필요", text: "변동성 수준을 확인할 데이터가 부족합니다." };
  if (value < 15) return { label: "낮은 변동성", text: "변동성이 낮은 구간입니다. 작은 변동 뒤 급격한 확대가 나오는지 함께 봅니다." };
  if (value < 20) return { label: "보통", text: "통상적인 변동성 구간입니다. 방향성은 금리·달러·지수선물과 같이 확인합니다." };
  if (value < 30) return { label: "높은 변동성", text: "변동성이 높아진 구간입니다. 진입 간격과 손절 폭을 평소보다 보수적으로 볼 필요가 있습니다." };
  return { label: "매우 높은 변동성", text: "급격한 가격 변동이 나타날 수 있는 구간입니다. 레버리지와 포지션 크기 관리가 특히 중요합니다." };
}

function signedDirection(value: number | null) {
  if (value === null || Math.abs(value) < 0.0001) return 0;
  return value > 0 ? 1 : -1;
}

function rateText(item: JhMarketMetric | null) {
  if (!item) return "미국 10년물 방향을 확인할 데이터가 부족합니다.";
  const change = firstChange(item);
  const direction = signedDirection(change?.value ?? null);
  if (direction > 0) return "10년물 금리 상승 방향입니다. 나스닥·성장주 선물의 금리 민감도를 함께 체크합니다.";
  if (direction < 0) return "10년물 금리 하락 방향입니다. 성장주 부담 완화가 실제 지수 강세로 이어지는지 확인합니다.";
  return "10년물 금리 변화가 크지 않습니다. 다른 위험지표와 함께 봅니다.";
}

function dollarText(item: JhMarketMetric | null) {
  if (!item) return "DXY 방향을 확인할 데이터가 부족합니다.";
  const change = firstChange(item);
  const direction = signedDirection(change?.value ?? null);
  if (direction > 0) return "달러 강세 방향입니다. 위험자산과 원자재에 부담으로 작용하는지 확인합니다.";
  if (direction < 0) return "달러 약세 방향입니다. 위험선호 흐름과 함께 나타나는지 확인합니다.";
  return "달러 방향성이 크지 않습니다.";
}

function releaseLabel(release: PublicRelease) {
  const date = release.date.replaceAll("-", ".");
  return release.timeKst ? `${date} ${release.timeKst}` : date;
}

function MetricBox({ title, item, description }: { title: string; item: JhMarketMetric | null; description: string }) {
  const change = item ? firstChange(item) : null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-500">{title}</p>
      {item ? (
        <>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-lg font-black tabular-nums text-slate-950">{formatMetricValue(item)}</p>
            <p className={`text-xs font-black ${changeTone(change)}`}>{formatChange(change)}</p>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{formatObservedDate(item.observedAt)} 기준</p>
        </>
      ) : (
        <p className="mt-2 text-sm font-bold text-slate-400">데이터 확인 중</p>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}

export default function IndexTradingCheckPanel({ metrics, regime, regimeConfidence, releases }: Props) {
  const vix = metric(metrics, "VIXCLS");
  const us10y = metric(metrics, "DGS10");
  const dxy = metric(metrics, "DXY");
  const vixInfo = vixState(vix?.currentValue ?? null);
  const importantReleases = releases.filter((item) => item.importanceScore >= 50).slice(0, 2);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">02 · INDEX TRADING CHECK</p>
          <h2 className="mt-1 text-xl font-black">주가지수·선물 거래 체크보드</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            방향 하나만 보지 않고 변동성·금리·달러·이벤트 리스크를 같이 확인하는 참고판입니다.
          </p>
        </div>
        <div className="rounded-xl bg-slate-950 px-3 py-2 text-right text-white">
          <p className="text-[10px] font-bold text-slate-400">시장 국면</p>
          <p className="mt-0.5 text-sm font-black">{regimeKo(regime)}</p>
          {regimeConfidence !== null && <p className="text-[10px] text-slate-400">신뢰도 {regimeConfidence}</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MetricBox title={`VIX · ${vixInfo.label}`} item={vix} description={vixInfo.text} />
        <MetricBox title="미국 10년물 금리" item={us10y} description={rateText(us10y)} />
        <MetricBox title="달러 인덱스 DXY" item={dxy} description={dollarText(dxy)} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black text-slate-700">매매 전 빠른 체크 순서</p>
          <ol className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="text-slate-900">1.</strong> 현물과 NQ·ES·YM·RTY 방향이 같은지 확인</li>
            <li><strong className="text-slate-900">2.</strong> 전일 현물 고가·저가·종가를 다음 세션 기준 레벨로 확인</li>
            <li><strong className="text-slate-900">3.</strong> VIX가 급등 중인지 확인해 변동성 확대 여부 체크</li>
            <li><strong className="text-slate-900">4.</strong> 10년물과 DXY가 지수 방향을 지지하는지 또는 역행하는지 확인</li>
            <li><strong className="text-slate-900">5.</strong> CPI·고용·FOMC 등 큰 발표 직전인지 확인</li>
          </ol>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs font-black text-cyan-300">다가오는 이벤트 리스크</p>
          {importantReleases.length > 0 ? (
            <div className="mt-3 space-y-3">
              {importantReleases.map((release) => (
                <div key={`${release.date}-${release.title}`} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-black">{release.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {releaseLabel(release)} · {release.sourceAgency ?? release.categoryLabel}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-400">가까운 핵심 발표 일정을 확인 중입니다.</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-4 text-slate-400">
        이 체크보드는 방향성과 시장환경을 정리하기 위한 참고 정보입니다. 특정 지표 하나를 매수·매도 신호로 사용하지 않고, 가격 구조와 리스크 관리와 함께 보는 용도로 설계했습니다.
      </p>
    </section>
  );
}

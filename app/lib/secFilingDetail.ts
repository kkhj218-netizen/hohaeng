import "server-only";

import { unstable_cache } from "next/cache";

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT ?? "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)";
const FETCH_TIMEOUT_MS = 15_000;

export type SecCoreMetric = {
  key: "revenue" | "operatingIncome" | "netIncome" | "epsDiluted";
  label: string;
  value: number;
  unit: "USD" | "USD/shares";
  start: string | null;
  end: string | null;
  concept: string;
};

export type SecFilingDetail = {
  cik: string;
  accession: string;
  company: string;
  ticker: string | null;
  form: string;
  filingDate: string;
  reportDate: string | null;
  acceptedAt: string | null;
  items: string[];
  primaryDocument: string | null;
  sourceUrl: string;
  metrics: SecCoreMetric[];
};

type SecSubmissions = {
  name?: string;
  tickers?: string[];
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      acceptanceDateTime?: string[];
      form?: string[];
      items?: string[];
      primaryDocument?: string[];
    };
  };
};

type FactValue = {
  start?: string;
  end?: string;
  val?: number;
  accn?: string;
  form?: string;
  filed?: string;
  frame?: string;
};

type FactConcept = {
  label?: string;
  units?: Record<string, FactValue[]>;
};

type CompanyFacts = {
  facts?: {
    "us-gaap"?: Record<string, FactConcept>;
  };
};

type MetricDefinition = {
  key: SecCoreMetric["key"];
  label: string;
  unit: SecCoreMetric["unit"];
  concepts: string[];
};

const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: "revenue",
    label: "매출",
    unit: "USD",
    concepts: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ],
  },
  {
    key: "operatingIncome",
    label: "영업이익",
    unit: "USD",
    concepts: ["OperatingIncomeLoss"],
  },
  {
    key: "netIncome",
    label: "순이익",
    unit: "USD",
    concepts: ["NetIncomeLoss", "ProfitLoss"],
  },
  {
    key: "epsDiluted",
    label: "희석 EPS",
    unit: "USD/shares",
    concepts: ["EarningsPerShareDiluted"],
  },
];

function paddedCik(value: string): string {
  const numeric = value.replace(/\D/g, "");
  return numeric.padStart(10, "0").slice(-10);
}

function archiveCik(value: string): string {
  const numeric = Number(value.replace(/\D/g, ""));
  return Number.isFinite(numeric) ? String(numeric) : value.replace(/\D/g, "");
}

function normalizeAccession(value: string): string {
  return value.trim().replace(/[^0-9-]/g, "");
}

async function secJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": SEC_USER_AGENT,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`SEC 요청 실패 (${response.status})`);
  }

  return (await response.json()) as T;
}

function durationDays(value: FactValue): number | null {
  if (!value.start || !value.end) return null;
  const start = new Date(`${value.start}T12:00:00Z`).getTime();
  const end = new Date(`${value.end}T12:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

function chooseFact(values: FactValue[], form: string): FactValue | null {
  const withValue = values.filter(
    (item) => typeof item.val === "number" && Number.isFinite(item.val),
  );
  if (withValue.length === 0) return null;

  const normalized = form.toUpperCase().replace(/\/A$/, "");
  let preferred = withValue;

  if (normalized === "10-Q") {
    const quarterOnly = withValue.filter((item) => {
      const days = durationDays(item);
      return days !== null && days >= 55 && days <= 125;
    });
    if (quarterOnly.length > 0) preferred = quarterOnly;
  } else if (["10-K", "20-F", "40-F"].includes(normalized)) {
    const annual = withValue.filter((item) => {
      const days = durationDays(item);
      return days !== null && days >= 280 && days <= 410;
    });
    if (annual.length > 0) preferred = annual;
  }

  return preferred.sort((left, right) => {
    const endOrder = (right.end ?? "").localeCompare(left.end ?? "");
    if (endOrder !== 0) return endOrder;
    return (right.start ?? "").localeCompare(left.start ?? "");
  })[0] ?? null;
}

function extractMetric(
  facts: CompanyFacts,
  accession: string,
  form: string,
  definition: MetricDefinition,
): SecCoreMetric | null {
  const usGaap = facts.facts?.["us-gaap"] ?? {};

  for (const conceptName of definition.concepts) {
    const concept = usGaap[conceptName];
    const entries = concept?.units?.[definition.unit] ?? [];
    const matching = entries.filter((entry) => entry.accn === accession);
    const selected = chooseFact(matching, form);
    if (!selected || typeof selected.val !== "number") continue;

    return {
      key: definition.key,
      label: definition.label,
      value: selected.val,
      unit: definition.unit,
      start: selected.start ?? null,
      end: selected.end ?? null,
      concept: conceptName,
    };
  }

  return null;
}

async function buildSecFilingDetail(
  cikInput: string,
  accessionInput: string,
): Promise<SecFilingDetail | null> {
  const cik = paddedCik(cikInput);
  const accession = normalizeAccession(accessionInput);
  if (!accession) return null;

  const [submissions, facts] = await Promise.all([
    secJson<SecSubmissions>(`https://data.sec.gov/submissions/CIK${cik}.json`),
    secJson<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`).catch(
      () => ({ facts: {} }) as CompanyFacts,
    ),
  ]);

  const recent = submissions.filings?.recent;
  const accessions = recent?.accessionNumber ?? [];
  const index = accessions.findIndex((item) => item === accession);
  if (index < 0) return null;

  const form = recent?.form?.[index] ?? "SEC Filing";
  const primaryDocument = recent?.primaryDocument?.[index] || null;
  const sourceUrl = primaryDocument
    ? `https://www.sec.gov/Archives/edgar/data/${archiveCik(cik)}/${accession.replaceAll("-", "")}/${encodeURIComponent(primaryDocument)}`
    : `https://www.sec.gov/edgar/browse/?CIK=${archiveCik(cik)}`;

  const metrics = METRIC_DEFINITIONS.map((definition) =>
    extractMetric(facts, accession, form, definition),
  ).filter((metric): metric is SecCoreMetric => metric !== null);

  const itemString = recent?.items?.[index] ?? "";
  return {
    cik,
    accession,
    company: submissions.name?.trim() || "SEC 등록 기업",
    ticker: submissions.tickers?.[0]?.trim() || null,
    form,
    filingDate: recent?.filingDate?.[index] ?? "",
    reportDate: recent?.reportDate?.[index] || null,
    acceptedAt: recent?.acceptanceDateTime?.[index] || null,
    items: itemString
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    primaryDocument,
    sourceUrl,
    metrics,
  };
}

const loadSecFilingDetail = unstable_cache(
  buildSecFilingDetail,
  ["hohaeng-sec-filing-detail-v1"],
  {
    revalidate: 24 * 60 * 60,
    tags: ["hohaeng-sec-filing-detail"],
  },
);

export async function getSecFilingDetail(cik: string, accession: string) {
  return loadSecFilingDetail(cik, accession);
}

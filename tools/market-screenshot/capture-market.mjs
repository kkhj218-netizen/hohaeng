import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MARKET_MAP_URL = process.env.HOHAENG_MARKET_MAP_URL || "https://hohaeng.vercel.app/data/market-map";
const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const headed = args.has("--headed");

const INDEXES = [
  {
    key: "nasdaq100",
    buttonName: "NASDAQ 100",
    fileLabel: "NASDAQ100",
    files: {
      breadth: "01_NASDAQ100_상승하락.png",
      heatmap: "02_NASDAQ100_히트맵.png",
      sector: "03_NASDAQ100_섹터.png",
    },
  },
  {
    key: "sp500",
    buttonName: "S&P 500",
    fileLabel: "SP500",
    files: {
      breadth: "04_SP500_상승하락.png",
      heatmap: "05_SP500_히트맵.png",
      sector: "06_SP500_섹터.png",
    },
  },
];

function resolveDesktopPath() {
  if (process.platform === "win32") {
    try {
      const desktop = execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"],
        { encoding: "utf8", windowsHide: true },
      ).trim();
      if (desktop) return desktop;
    } catch {
      // Fall back to the conventional Desktop path below.
    }
  }

  return path.join(os.homedir(), "Desktop");
}

const outputRoot = process.env.HOHAENG_SCREENSHOT_DIR
  ? path.resolve(process.env.HOHAENG_SCREENSHOT_DIR)
  : path.join(resolveDesktopPath(), "HOHAENG_시황_스크린샷");
const stateDir = path.join(os.homedir(), ".hohaeng");
const statePath = path.join(stateDir, "market-screenshot-state.json");
const logDir = path.join(outputRoot, "_logs");
const logPath = path.join(logDir, "market-screenshot.log");
const errorDir = path.join(outputRoot, "_errors");

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function fileTimestamp() {
  return timestamp().replaceAll(":", "-").replace(" ", "_");
}

async function log(message) {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  await fs.mkdir(logDir, { recursive: true });
  await fs.appendFile(logPath, `${line}\n`, "utf8");
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(statePath, "utf8"));
  } catch {
    return {};
  }
}

async function writeState(state) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForMarketMap(page) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    await page.goto(MARKET_MAP_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });

    const nasdaqButton = page.getByRole("button", { name: "NASDAQ 100", exact: true });
    if (await nasdaqButton.isVisible().catch(() => false)) {
      await page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
      });
      await page.waitForTimeout(900);
      return;
    }

    await log(`시장지도 준비 대기 중 (${attempt}/6)...`);
    await page.waitForTimeout(5_000);
  }

  throw new Error("MARKET MAP 화면이 준비되지 않았습니다. 사이트에서 /data/market-map이 정상 표시되는지 확인해주세요.");
}

async function selectIndex(page, index) {
  const button = page.getByRole("button", { name: index.buttonName, exact: true });
  await button.waitFor({ state: "visible", timeout: 30_000 });
  await button.click();
  await page.waitForTimeout(500);

  const breadth = page.locator("section").filter({ hasText: "MARKET BREADTH" }).first();
  await breadth.waitFor({ state: "visible", timeout: 30_000 });

  const text = await breadth.innerText();
  const expected = index.key === "nasdaq100" ? /NASDAQ\s*100/i : /S&P\s*500/i;
  if (!expected.test(text)) {
    throw new Error(`${index.buttonName} 전환 확인에 실패했습니다.`);
  }
}

async function getMarketDate(page) {
  const breadth = page.locator("section").filter({ hasText: "MARKET BREADTH" }).first();
  const text = await breadth.innerText();
  const match = text.match(/(20\d{2})[.-](\d{2})[.-](\d{2})\s*장마감/);

  if (!match) {
    throw new Error("페이지에서 장마감 날짜를 찾지 못했습니다.");
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function captureTargets(page) {
  return {
    breadth: page.locator("section").filter({ hasText: "MARKET BREADTH" }).first(),
    heatmap: page.locator("section").filter({ hasText: "HEATMAP" }).first(),
    sector: page.locator("section").filter({ hasText: "SECTOR BREADTH" }).first(),
  };
}

async function captureSection(locator, destination) {
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: destination,
    animations: "disabled",
    caret: "hide",
    scale: "css",
    timeout: 60_000,
  });
}

async function allScreenshotsExist(outputDir) {
  const filenames = INDEXES.flatMap((index) => Object.values(index.files));
  const checks = await Promise.all(filenames.map((filename) => exists(path.join(outputDir, filename))));
  return checks.every(Boolean);
}

let browser;
let page;

try {
  await fs.mkdir(outputRoot, { recursive: true });
  await log(`HOHAENG MARKET MAP 자동 캡처 시작${force ? " (강제 촬영)" : ""}`);
  await log(`대상: ${MARKET_MAP_URL}`);

  browser = await chromium.launch({ headless: !headed });
  page = await browser.newPage({
    viewport: { width: 1440, height: 1800 },
    deviceScaleFactor: 1,
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitForMarketMap(page);
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });

  const marketDates = {};
  for (const index of INDEXES) {
    await selectIndex(page, index);
    marketDates[index.key] = await getMarketDate(page);
    await log(`${index.buttonName} 기준일 확인: ${marketDates[index.key]}`);
  }

  if (marketDates.nasdaq100 !== marketDates.sp500) {
    throw new Error(
      `NASDAQ100(${marketDates.nasdaq100})과 S&P500(${marketDates.sp500})의 기준일이 달라 촬영을 중단합니다. 같은 거래일 데이터가 준비되면 자동으로 다시 시도합니다.`,
    );
  }

  const marketDate = marketDates.nasdaq100;
  const outputDir = path.join(outputRoot, marketDate);
  const state = await readState();

  if (!force && state.lastMarketDate === marketDate && await allScreenshotsExist(outputDir)) {
    await log(`${marketDate} 스크린샷이 이미 완성되어 있습니다. 중복 촬영 없이 종료합니다.`);
    process.exitCode = 0;
  } else {
    await fs.mkdir(outputDir, { recursive: true });

    for (const index of INDEXES) {
      await selectIndex(page, index);
      const targets = captureTargets(page);

      await log(`${index.buttonName} 상승·하락 카드 촬영`);
      await captureSection(targets.breadth, path.join(outputDir, index.files.breadth));

      await log(`${index.buttonName} 히트맵 촬영`);
      await captureSection(targets.heatmap, path.join(outputDir, index.files.heatmap));

      await log(`${index.buttonName} 섹터 흐름 촬영`);
      await captureSection(targets.sector, path.join(outputDir, index.files.sector));
    }

    await writeState({
      lastMarketDate: marketDate,
      completedAt: new Date().toISOString(),
      sourceUrl: MARKET_MAP_URL,
      outputDir,
    });

    await log(`완료: ${outputDir}`);
    await log("총 6장의 PNG가 저장되었습니다.");
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await log(`오류: ${message}`).catch(() => console.error(message));

  if (page) {
    try {
      await fs.mkdir(errorDir, { recursive: true });
      const errorScreenshot = path.join(errorDir, `ERROR_${fileTimestamp()}.png`);
      await page.screenshot({ path: errorScreenshot, fullPage: true, animations: "disabled" });
      await log(`오류 확인용 전체화면 저장: ${errorScreenshot}`);
    } catch {
      // Ignore secondary screenshot errors.
    }
  }

  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
}

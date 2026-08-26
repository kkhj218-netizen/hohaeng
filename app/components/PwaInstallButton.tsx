"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type DeviceType = "ios" | "android" | "desktop";
type ButtonVariant = "header" | "hero";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

type Props = {
  variant?: ButtonVariant;
  source?: string;
};

function detectDevice(): DeviceType {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIos =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIos) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "desktop";
}

function isStandaloneMode() {
  const iosStandalone = Boolean((navigator as NavigatorWithStandalone).standalone);
  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayStandalone;
}

function track(eventName: string, params: Record<string, string | boolean | number>) {
  if (typeof window === "undefined") return;
  (window as GtagWindow).gtag?.("event", eventName, params);
}

export default function PwaInstallButton({ variant = "header", source = "header" }: Props) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const detectedDevice = detectDevice();
    setDevice(detectedDevice);
    setIsInstalled(isStandaloneMode());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setIsOpen(false);
      track("pwa_installed", { source, device: detectDevice() });
    };

    const media = window.matchMedia("(display-mode: standalone)");
    const handleDisplayMode = () => setIsInstalled(isStandaloneMode());

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    media.addEventListener?.("change", handleDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      media.removeEventListener?.("change", handleDisplayMode);
    };
  }, [source]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const guide = useMemo(() => {
    if (device === "ios") {
      return {
        eyebrow: "iPhone · iPad",
        title: "호행처럼을 앱처럼 저장하기",
        description: "iOS에서는 웹사이트가 설치를 자동 완료할 수 없어 아래 3단계만 직접 눌러주면 됩니다.",
        steps: [
          ["1", "Safari의 공유 버튼 누르기", "화면 아래 또는 주소창의 □↑ 공유 버튼을 눌러주세요."],
          ["2", "‘홈 화면에 추가’ 선택", "공유 메뉴를 아래로 내려 ‘홈 화면에 추가’를 선택하세요."],
          ["3", "‘웹 앱으로 열기’ 확인 후 추가", "오른쪽 위 ‘추가’를 누르면 홈 화면에 호행처럼 아이콘이 생깁니다."],
        ],
      };
    }

    if (device === "android") {
      return {
        eyebrow: "Android",
        title: "호행처럼 앱 설치하기",
        description: "설치창이 지원되지 않는 브라우저에서는 Chrome 메뉴에서 직접 추가할 수 있습니다.",
        steps: [
          ["1", "Chrome 오른쪽 위 ⋮ 누르기", "브라우저 메뉴를 열어주세요."],
          ["2", "‘앱 설치’ 또는 ‘홈 화면에 추가’ 선택", "표시는 Chrome 버전에 따라 조금 다를 수 있습니다."],
          ["3", "설치 확인", "설치를 누르면 일반 앱처럼 홈 화면에서 바로 실행할 수 있습니다."],
        ],
      };
    }

    return {
      eyebrow: "Desktop",
      title: "호행처럼 앱으로 설치하기",
      description: "Chrome 또는 Edge의 주소창 설치 아이콘이나 브라우저 메뉴에서 앱으로 설치할 수 있습니다.",
      steps: [
        ["1", "주소창의 설치 아이콘 확인", "설치 아이콘이 보이면 바로 눌러주세요."],
        ["2", "아이콘이 없으면 브라우저 메뉴 열기", "Chrome/Edge 메뉴의 앱 설치 항목을 선택하세요."],
        ["3", "설치 확인", "독립된 창으로 호행처럼을 실행할 수 있습니다."],
      ],
    };
  }, [device]);

  async function requestInstall() {
    if (isInstalled) return;

    const detectedDevice = detectDevice();
    track("pwa_install_click", {
      source,
      device: detectedDevice,
      native_prompt: Boolean(installPrompt),
    });

    if (installPrompt) {
      setInstalling(true);
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        track("pwa_install_result", {
          source,
          device: detectedDevice,
          outcome: choice.outcome,
        });
        setInstallPrompt(null);
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setIsOpen(false);
        }
      } finally {
        setInstalling(false);
      }
      return;
    }

    setDevice(detectedDevice);
    setIsOpen(true);
    track("pwa_install_guide_open", { source, device: detectedDevice });
  }

  const hero = variant === "hero";
  const buttonClass = hero
    ? `flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-black shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isInstalled
          ? "cursor-default bg-emerald-100 text-emerald-800 focus:ring-emerald-400"
          : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
      }`
    : `shrink-0 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isInstalled
          ? "cursor-default bg-emerald-100 text-emerald-700 focus:ring-emerald-400"
          : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
      }`;

  const label = isInstalled
    ? "설치됨"
    : installing
      ? "설치 중..."
      : hero
        ? "호행처럼을 홈 화면에 저장"
        : "앱으로 저장";

  return (
    <>
      <button
        type="button"
        onClick={() => void requestInstall()}
        disabled={isInstalled || installing}
        className={buttonClass}
        aria-haspopup={isInstalled ? undefined : "dialog"}
        aria-label={isInstalled ? "호행처럼 앱 설치됨" : "호행처럼 앱으로 저장하기"}
      >
        <span aria-hidden="true">{isInstalled ? "✓" : "💾"}</span>{" "}
        {hero ? (
          <span className="ml-1">{label}</span>
        ) : (
          <>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{isInstalled ? "설치됨" : installing ? "설치중" : "저장"}</span>
          </>
        )}
      </button>

      {isOpen && !isInstalled && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-2xl"
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pb-6 pt-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">{guide.eyebrow}</p>
                  <h2 id="pwa-install-title" className="mt-2 text-2xl font-black tracking-tight">{guide.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-white/15 px-3 py-2 text-sm font-black text-white hover:bg-white/25"
                  aria-label="설치 안내 닫기"
                >
                  ✕
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-blue-50">{guide.description}</p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="space-y-3">
                {guide.steps.map(([number, title, detail]) => (
                  <div key={number} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">{number}</span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {device === "ios" && (
                <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                  <strong>팁:</strong> 인스타·Threads·X의 앱 내부 브라우저라면 Safari로 열고 진행하는 것이 가장 확실합니다.
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                확인했어요
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

type SymbolTab = {
  label: string;
  symbol: string; // e.g. "BTCUSDT"
};

const DEFAULT_TABS: SymbolTab[] = [
  { label: "BTC / USDT", symbol: "BTCUSDT" },
  { label: "ETH / USDT", symbol: "ETHUSDT" },
  { label: "ICP / USDT", symbol: "ICPUSDT" },
];

interface TradingDeskProps {
  principal: string | null;
}

export const TradingDesk: React.FC<TradingDeskProps> = ({ principal }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<SymbolTab>(DEFAULT_TABS[0]);
  const [ready, setReady] = useState(false);

  // Load TradingView script once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.TradingView) {
      setReady(true);
      return;
    }

    if (!window.tvScriptLoadingPromise) {
      window.tvScriptLoadingPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "tradingview-widget-script";
        script.src = TV_SCRIPT_SRC;
        script.type = "text/javascript";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
    }

    window.tvScriptLoadingPromise
      .then(() => {
        setReady(true);
      })
      .catch((err) => {
        console.error("Failed to load TradingView script", err);
      });
  }, []);

  // Create / refresh widget when script + active symbol are ready
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    if (!window.TradingView) return;
    if (!containerRef.current) return;

    // Clear previous widget contents (TradingView renders into the container)
    containerRef.current.innerHTML = "";

    const widgetContainerId = "tradingview_advanced_chart";

    const widgetOptions = {
      symbol: `BINANCE:${activeTab.symbol}`,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#020617",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      container_id: widgetContainerId,
      withdateranges: true,
      autosize: true,
      studies: [],
    };

    // Create a child div with the expected container_id
    const child = document.createElement("div");
    child.id = widgetContainerId;
    child.style.height = "100%";
    child.style.width = "100%";
    containerRef.current.appendChild(child);

    // eslint-disable-next-line no-new
    new window.TradingView.widget(widgetOptions);
  }, [ready, activeTab]);

  return (
    <div className="flex flex-col h-full space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📈 Trading Desk
          </h2>
          <p className="text-xs text-slate-400">
            Advanced TradingView charts with quick pair switching.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-slate-500">
            Principal:{" "}
            <span className="font-mono">
              {principal
                ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
                : "anonymous"}
            </span>
          </span>
          <span className="text-[10px] text-slate-600">
            Data by TradingView
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TABS.map((tab) => {
          const active = tab.symbol === activeTab.symbol;
          return (
            <button
              key={tab.symbol}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                active
                  ? "bg-bullOrange/90 text-black border-bullOrange"
                  : "bg-slate-900/70 text-slate-300 border-slate-700 hover:border-slate-400"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Chart container */}
      <div className="flex-1 min-h-[320px] md:min-h-[380px] rounded-xl border border-slate-800 bg-black/40 overflow-hidden">
        {!ready && (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            Loading TradingView widget…
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: ready ? "100%" : "0" }}
        />
      </div>
    </div>
  );
};

declare global {
  interface Window {
    TradingView?: any;
    tvScriptLoadingPromise?: Promise<void>;
  }
}

export {};

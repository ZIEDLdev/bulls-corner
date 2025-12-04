import React, { useCallback, useEffect, useState } from "react";
import { getBackendActor, loginWithII, logoutII, getAuthClient } from "./ic/backendActor";
import { BACKEND_CANISTER_ID, HOST, isLocal } from "./ic/config";
import { TradingDesk } from "./components/TradingDesk";
import { ChatPanel } from "./components/ChatPanel";

const App: React.FC = () => {
  const [principal, setPrincipal] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Not authenticated");
  const [loading, setLoading] = useState<boolean>(false);

  const refreshIdentity = useCallback(async () => {
    try {
      if (isLocal) {
        const actor = await getBackendActor();
        const me = await actor.whoami();
        setPrincipal(me.toText ? me.toText() : String(me));
        setStatus("Local dev principal (anonymous or default)");
        return;
      }

      const authClient = await getAuthClient();
      const identity = authClient.getIdentity();
      const principalObj = identity.getPrincipal();

      const isAnon =
        (principalObj as any).isAnonymous?.() ??
        principalObj.toText() === "2vxsx-fae";

      if (!isAnon) {
        const actor = await getBackendActor();
        const me = await actor.whoami();
        setPrincipal(me.toText ? me.toText() : String(me));
        setStatus("Authenticated via Internet Identity");
      } else {
        setPrincipal(null);
        setStatus("Not authenticated");
      }
    } catch (e) {
      console.error("refreshIdentity error", e);
      setPrincipal(null);
      setStatus("Error checking identity: " + String(e));
    }
  }, []);

  const handleLogin = async () => {
    if (isLocal) {
      setStatus("Local dev: II login is not used for backend calls.");
      await refreshIdentity();
      return;
    }

    setLoading(true);
    setStatus("Opening Internet Identity...");
    try {
      await loginWithII();
      setStatus("Logged in, fetching principal...");
      await refreshIdentity();
    } catch (e) {
      console.error("login error", e);
      setStatus("Login failed or cancelled: " + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isLocal) {
      setPrincipal(null);
      setStatus("Local dev: cleared principal view.");
      return;
    }

    setLoading(true);
    try {
      await logoutII();
      setPrincipal(null);
      setStatus("Logged out");
    } catch (e) {
      console.error("logout error", e);
      setStatus("Logout error: " + String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshIdentity();
  }, [refreshIdentity]);

  const shortPrincipal =
    principal && principal.length > 10
      ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
      : principal ?? "n/a";

  return (
    <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl space-y-8">
        {/* AUTH CARD / HEADER */}
        <div className="bull-card p-8 space-y-6">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bull-gradient-text flex items-center gap-2">
                🐂 Bull&apos;s Corner
              </h1>
              <p className="text-sm text-slate-400">
                Decentralized traders&apos; lounge on the Internet Computer
              </p>
            </div>
            <span className="bull-pill px-4 py-1 text-xs uppercase tracking-wide text-slate-300">
              {isLocal ? "LOCAL REPLICA" : "MAINNET"}
            </span>
          </header>

          <section className="space-y-2">
            <p className="text-sm text-slate-400">Backend canister:</p>
            <code className="block text-xs bg-black/70 border border-slate-800 rounded-lg px-3 py-2 break-all">
              {BACKEND_CANISTER_ID}
            </code>
            <p className="text-xs text-slate-500">Host: {HOST}</p>
          </section>

          <section className="space-y-3">
            <p className="text-sm text-slate-300">Auth / identity status:</p>
            <div className="bull-pill px-4 py-2 text-sm flex items-center justify-between">
              <span className="text-[11px] leading-snug">
                {status}
              </span>
              {loading && (
                <span className="text-xs text-orange-300 animate-pulse ml-2">
                  Working...
                </span>
              )}
            </div>

            {principal && (
              <div className="space-y-1">
                <p className="text-sm text-slate-300">Current Principal:</p>
                <code className="block text-xs bg-black/70 border border-slate-800 rounded-lg px-3 py-2 break-all">
                  {principal}
                </code>
              </div>
            )}
          </section>

          <section className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleLogin}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-bullOrange/90 hover:bg-bullOrange text-black font-semibold text-sm transition shadow-lg shadow-amber-500/30"
            >
              {isLocal ? "Use local dev identity" : "Login with Internet Identity"}
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black border border-slate-700 hover:border-red-500/70 hover:text-red-300 text-slate-200 text-sm font-medium transition"
            >
              {isLocal ? "Clear principal view" : "Logout"}
            </button>
          </section>

          <footer className="pt-2 border-t border-slate-800 mt-4 text-xs text-slate-500 flex flex-wrap justify-between gap-2">
            <span>Step 1: identity + whoami wired (local-safe) ✅</span>
            <span>Step 2: TradingView + chat shell wired ✅</span>
          </footer>
        </div>

        {/* MAIN APP SHELL */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading / charts column */}
          <section className="lg:col-span-2 bull-card p-6 space-y-4">
            <TradingDesk principal={principal} />
          </section>

          {/* Chat / rooms column */}
          <section className="bull-card p-6 space-y-4">
            <ChatPanel principal={principal} />
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;

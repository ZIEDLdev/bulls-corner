export const LOCAL_HOST = "http://127.0.0.1:4943";
export const IC_HOST = "https://ic0.app";

// For now, control network via env: VITE_DFX_NETWORK=ic or local
const NETWORK = import.meta.env.VITE_DFX_NETWORK ?? "local";

export const isLocal = NETWORK !== "ic";

// Local backend ID (from dfx deploy output)
const BACKEND_LOCAL = "uxrrr-q7777-77774-qaaaq-cai";

// Mainnet backend ID (your existing canister with cycles)
const BACKEND_IC = "mbaar-paaaa-aaaam-aeyma-cai";

export const BACKEND_CANISTER_ID = isLocal ? BACKEND_LOCAL : BACKEND_IC;

export const HOST = isLocal ? LOCAL_HOST : IC_HOST;

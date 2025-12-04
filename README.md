# 🐂 Bull's Corner

## Decentralized Social Network for Crypto & Stock Traders
Built on the Internet Computer (ICP)

Bull's Corner is a high-performance, decentralized, trader-focused social platform.  
It combines real-time chat, TradingView charts, Internet Identity authentication,  
ICRC-1 tipping, and on-chain profiles into a single immersive dApp.

---

## 📦 What’s in this repo?

- 🦀 Rust backend canister (ic-cdk + stable memory)  
- ⚛️ React/Vite frontend canister (certified assets + TailwindCSS)  
- 🔐 Native Internet Identity login  
- 🔄 Real-time chat system (update/query calls)  
- 💸 ICRC-1 tipping & rewards  
- 📈 Trading Dashboard with TradingView Advanced Chart  
- 📱 PWA support (installable on iOS/Android/Desktop)

---

## 🚀 Features

### 🔐 Internet Identity (II) Authentication
- No email, no passwords  
- Uses `@dfinity/auth-client`  
- Principal ID = user identity  
- Fully decentralized login  

### 💬 Real-Time Global Chat & Rooms
- Message send/edit/delete  
- Reply threading (reply shows username, not message ID)  
- Live scrollback  
- Emoji picker  
- Dark theme  
- Rooms menu with persistent storage  

### 📈 Trading Desk (TradingView Advanced Chart)
- Full-width TradingView chart  
- Preloaded pairs: BTC/USDT, ETH/USDT, ICP/USDT  
- Light/dark mode matching  
- Embedded `tv.js` script  
- Responsive layout  

### 🧑‍🎨 On-Chain Profiles
- Avatar + banner (chunked blob storage)  
- Bio & stats  
- Referral code (example: `BULL-1234`)  
- Tips given / received  
- Messages posted  
- Join date + badges  

### 💸 ICRC-1 Tipping
- Send 0.01+ ICP to message authors  
- Boosts tipped messages  
- Monthly leaderboard  
- Tip notifications  
- Anti-spam protection  

### 🏆 Leaderboards
- Monthly / all-time top tippers  
- Stored in StableBTreeMap  
- Updated every 5 minutes via ic-cdk-timers  

### 📱 PWA Support
- Installable on mobile and desktop  
- Web manifest  
- Custom splash screens  
- Offline splash  

---

## 🏗️ Architecture
- /backend → Rust canister
- /frontend → React/Vite UI (certified assets)
- dfx.json → Canister definitions & build pipeline

### Backend Stack
- Rust  
- ic-cdk  
- ic-stable-structures  
- candid  
- ICRC-1 ledger calls  
- Message + profile store  
- Stable memory migrations  

### Frontend Stack
- React 18  
- Vite  
- TailwindCSS  
- @dfinity/auth-client  
- TradingView widget  
- PWA support  

---

## 🧪 Local Development

### 1. Install frontend deps
```
npm install --prefix frontend
```
### 2. Start local replica
```
dfx start --background
```
### 3. Deploy canisters locally
```
dfx deploy
```
### 4. Run the frontend dev server
```
cd frontend
npm run dev
```
### Then visit:
👉 http://localhost:5173

---

## 🌐 Mainnet Deployment

### Update your dfx.json with your actual canister IDs:
- Backend: mbaar-paaaa-aaaam-aeyma-cai
- Frontend: mgbgf-cyaaa-aaaam-aeymq-cai

### Deploy:
```
dfx deploy --network ic
```

### Top up cycles (example: 10T):
```
dfx wallet --network ic send <canister-id> 10000000000000
```

---

## 🔧 Environment Variables

### Create:
frontend/.env

### Containing:
```
VITE_BACKEND_CANISTER_ID=<your backend canister ID>
VITE_DFX_NETWORK=local
```

### For mainnet:
```
VITE_DFX_NETWORK=ic
```

---

## 📬 Project Commands

### Deploy backend only:
```
dfx deploy backend
```

### Deploy frontend only:
```
dfx deploy frontend
```

### Clean the local state:
```
dfx stop
rm -rf .dfx
dfx start --background
```

---

## 🧹 Code Style

- Rustfmt + Clippy for backend
- ESLint + Prettier for frontend
- All React components functional + hooks
- No class components
- Tailwind utility-first design

---

## 🐛 Troubleshooting

### "Invalid delegation" when logging in (II):
This happens when you logged in on the wrong network.
Fix:
```
dfx stop
rm -rf .dfx
dfx start --background
```
Log in again.

### MIME / asset certification errors:
Ensure frontend is deployed using:
```
dfx deploy frontend
```

---

## 📹 Demo Flow (60 seconds)

### 1. Log in using Internet Identity
### 2. Open BTC/USDT chart
### 3. Send a message
### 4. Reply to another user
### 5. Tip them 0.01 ICP
### 6. View profile & referral code
### 7. Create a chat room
### 8. Install PWA on phone

---

## 📜 License

MIT License © 2025 ZIEDLdev

---

## 🐂 Built for Traders. Powered by ICP.

Fast. Decentralized. On-chain. No middlemen.
Welcome to Bull’s Corner.

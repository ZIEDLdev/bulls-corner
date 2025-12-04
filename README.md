# 🐂 Bull's Corner  
### Decentralized Social Network for Crypto & Stock Traders  
Built on the **Internet Computer (ICP)**

Bull's Corner is a high-performance, decentralized, trader-focused social platform.  
It combines **real-time chat**, **TradingView charts**, **Internet Identity authentication**,  
**ICRC-1 tipping**, and **on-chain profiles** into a single immersive dApp.

This repo contains the full ICP project:  
- 🦀 **Rust backend canister** (ic-cdk + stable memory)  
- ⚛️ **React/Vite frontend canister** (certified assets + TailwindCSS)  
- 🔐 Native Internet Identity login  
- 🔄 Real-time chat system (update/query calls)  
- 💸 ICRC-1 tipping & rewards  
- 📈 Trading Dashboard with TradingView Advanced Chart  
- 📱 PWA support (installable on iOS/Android/Desktop)

---

## 🚀 Features

### 🔐 Internet Identity (II) Authentication  
- No email, no passwords  
- Uses **@dfinity/auth-client**  
- Principal ID = user identity  
- Fully decentralized login

---

### 💬 Real-Time Global Chat & Rooms  
- Message send/edit/delete  
- Reply threading (reply to user, not message ID)  
- Live scrollback  
- Emoji picker (emoji-picker-react)  
- Clean UI with dark theme  
- Optimized for <50ms query latency  
- Rooms menu with persistent storage

---

### 📈 Trading Desk (TradingView Advanced Chart)  
- Full-width TradingView chart  
- Preloaded pairs: **BTC/USDT**, **ETH/USDT**, **ICP/USDT**  
- Light/dark mode auto-matching theme  
- Fully embedded `tv.js` script (official)  
- Dynamic resizing & responsive layout

---

### 🧑‍🎨 On-Chain Profiles  
Stored in stable memory:  
- Avatar + banner (chunked blob storage)  
- Bio & stats  
- Referral code (e.g. `BULL-1234`)  
- Tips given / received  
- Messages posted  
- Join date + badges

---

### 💸 ICRC-1 Tipping  
- Send 0.01+ ICP to any message author  
- Tipped messages boost to the top  
- Monthly leaderboard recalculated every 5 minutes  
- Tip notifications  
- Anti-spam logic

---

### 🏆 Leaderboards  
- Monthly / all-time top tippers  
- Stored using efficient `StableBTreeMap`  
- Auto-updated via `ic-cdk-timers`

---

### 📱 PWA Support  
- Fully installable on mobile and desktop  
- Includes web manifest  
- Custom splash screen + icons  
- Offline splash

---

## 🏗️ Architecture


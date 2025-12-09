<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Instant Texas Hold'em – Run & Deploy (Vercel + API)

This project is a Vite + React implementation of a single Texas Hold'em table
with up to 4 seats and simple bot logic. It now also includes a minimal backend
implemented as Vercel serverless functions under `/api/*`.

> **Note**
> The current frontend still計算整個牌局邏輯在瀏覽器端，本次新增的後端主要是：
> - 消除 `/api/*` 的 404 錯誤
> - 提供之後要做「真正線上多人同步」時可以擴充的基礎

真正要做到多裝置即時同步，我們之後可以再把狀態更新／輪到誰行動等邏輯搬到後端，
或在前端加上輪詢 `/api/game-state` 的機制。

---

## Run Locally（前端為主）

**Prerequisites:** Node.js (建議 v18+)

1. 安裝依賴：  
   `npm install`
2. 在專案根目錄建立 `.env.local`，設定：  
   `GEMINI_API_KEY=你的金鑰`
3. 啟動前端（純 Vite dev server，沒有本機後端）：  
   `npm run dev`

> 使用 `npm run dev` 時，`/api/*` 由於沒有掛在 Vite dev server 上，
> 仍然會是 404（部署到 Vercel 後端才會生效）。

---

## Local dev with Vercel backend

如果你想在本機同時測試 Vercel 風格的 `/api/*` 後端，可以改用：

1. 全域安裝或使用 npx 執行 Vercel CLI：
   - `npm install -g vercel` 或  
   - `npx vercel login`
2. 在專案根目錄執行：  
   `vercel dev`

這會啟動一個本機 Vercel dev server：

- 會 build / serve Vite 打包後的前端
- 會編譯並掛載 `api/*.ts` 為 Node serverless functions

前端的 `fetch('/api/...')` 會直接打到這些本機 functions，
行為會和部署到 Vercel 上時一致。

---

## Backend API（單一桌，適用 Vercel）

後端放在專案根目錄的 `api/` 資料夾，Vercel 會自動將每個檔案變成一支 function：

- **`api/_tableState.ts`**（內部使用）
  - 維護唯一一張桌子 `table-1` 的共用狀態：
    - `players: Player[]`
    - `gameState: GameState`
  - 提供 helper：`getTableState`, `joinSeat`, `leaveSeat`, `updateFromClient`, `getPublicState`

- **`POST /api/join-table`**  → `api/join-table.ts`
  - Request body：`{ tableId: string; seatIndex: number; playerName: string }`
    - `tableId` 目前會被忽略，固定使用 `table-1`
  - Response：`{ success: boolean; message?: string; player?: Player }`
  - 對應前端的 `joinTable(...)` 呼叫。

- **`POST /api/leave-table`** → `api/leave-table.ts`
  - Request body：`{ tableId: string; playerId: number }`
    - 同樣目前只使用 `playerId`，桌子固定為單一桌
  - Response：`{ success: boolean }`
  - 對應前端的 `leaveTable(...)` 呼叫。

- **`POST /api/action`** → `api/action.ts`
  - Request body：`{ tableId, playerId, action, amount? }`
  - 目前後端只會：
    - 在 logs 中記錄這個 action
    - 回傳目前 server 端記錄的 `{ gameState, players }`
  - 對應前端的 `sendAction(...)` 呼叫。

- **`GET /api/game-state`** → `api/game-state.ts`
  - Response：`{ gameState, players }`
  - 讓未來可以在前端做輪詢或進房時同步桌子的狀態。

- **`POST /api/round-end`** → `api/round-end.ts`
  - Request body：`{ tableId, roundNumber, gameState, players, winners }`
  - 後端會：
    - 用 `gameState` 與 `players` 更新伺服器記憶中的單桌狀態
    - 回傳最新 `{ gameState, players }`
  - 對應前端的 `sendRoundEnd(...)` 呼叫。

> 目前的設計是「前端仍然是主要邏輯」，後端儲存最後一局的狀態，
> 並提供之後要實作真正線上多人同步時的基礎 API 介面。

---

## Deploy to Vercel

1. 將這個專案推到 GitHub / GitLab / Bitbucket。
2. 到 Vercel Dashboard 選擇 **New Project**，匯入此 repo。
3. Framework 選擇 **Vite**（或讓 Vercel 自動偵測）：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 在 Vercel 專案的 **Environment Variables** 裡新增：
   - `GEMINI_API_KEY`：你的 Gemini API key
5. Deploy。

部署完成後：

- 前端會從 `dist/` 提供靜態檔案。
- `api/*.ts` 會被 Vercel 編譯成 Node serverless functions，
  透過 `/api/join-table`, `/api/leave-table`, `/api/action`, `/api/game-state`, `/api/round-end`
  提供單一桌的後端 API。


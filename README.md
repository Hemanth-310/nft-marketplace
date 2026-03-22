# ◈ ArtVault — NFT Marketplace

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat&logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-2.x-yellow?style=flat)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![ethers.js](https://img.shields.io/badge/ethers.js-v5-purple?style=flat)

A fully functional NFT marketplace where users can mint NFTs, list them for sale, and buy listed NFTs using ETH. Ownership transfers automatically on purchase.

---

## 🎯 Key Features

- 🎨 **Mint NFTs** — with name, description, and image (URL or file upload)
- 🏷️ **List for sale** — set your own ETH price
- 🛒 **Buy NFTs** — pay ETH, ownership transfers instantly
- ❌ **Cancel listing** — delist anytime before sale
- 💰 **Withdraw proceeds** — sellers pull their ETH after a sale
- 🔄 **Auto reconnect** — wallet stays connected on page reload
- 🔌 **Disconnect** — logout button in header

---

## 🏗️ Smart Contracts

| Contract | Description |
|---|---|
| `ArtNFT.sol` | ERC-721 token — mint NFTs with metadata URI |
| `NFTMarketplace.sol` | List, buy, cancel, withdraw proceeds — 2.5% platform fee |

### Security

- ✅ ReentrancyGuard on all value-transferring functions
- ✅ CEI pattern — listing deleted before NFT transfer
- ✅ Ownable access control on admin functions
- ✅ Pull pattern for proceeds — sellers withdraw manually
- ✅ Auto-approval of marketplace via isApprovedForAll override

---

## 📁 Project Structure
```
├── contracts/
│   ├── ArtNFT.sol              # ERC-721 NFT contract
│   └── NFTMarketplace.sol      # Marketplace logic
├── scripts/
│   └── deployNFT.js            # Deploys both contracts and saves ABIs
├── test/
│   └── NFTMarketplace.test.ts  # 5 test cases
├── frontend/
│   └── src/
│       ├── NFTApp.jsx          # Main UI — mint, my nfts, marketplace tabs
│       └── abis/
│           ├── ArtNFT.json
│           └── NFTMarketplace.json
├── hardhat.config.ts
└── README.md
```

---

## 💻 Local Setup

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Git

### Step 1 — Clone the repository
```bash
git clone https://github.com/Hemanth-310/nft-marketplace.git
cd nft-marketplace
```

### Step 2 — Install contract dependencies
```bash
npm install
```

### Step 3 — Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 4 — Create a .env file
```
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## 🚀 Running Locally

### Terminal 1 — Start local blockchain
```bash
npx hardhat node
```

### Terminal 2 — Deploy contracts
```bash
npx hardhat run scripts/deployNFT.js --network localhost
```

### Terminal 3 — Start frontend
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

---

## 🦊 MetaMask Setup

| Field | Value |
|---|---|
| Network Name | Hardhat Local |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 1337 |
| Currency Symbol | ETH |

Import Account #0 private key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 🧪 Tests
```bash
npx hardhat test test/NFTMarketplace.test.ts
```

Expected output:
```
NFT Marketplace
  ✔ should let a user mint an NFT and become the owner
  ✔ should let the owner list an NFT for sale
  ✔ should transfer NFT to buyer and credit seller proceeds
  ✔ should revert if buyer sends wrong ETH amount
  ✔ should let seller withdraw their proceeds

5 passing
```

---

## 🌐 Deploy to Sepolia
```bash
npx hardhat run scripts/deployNFT.js --network sepolia
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.20 |
| Standards | OpenZeppelin ERC-721 |
| Framework | Hardhat |
| Frontend | React 19 + Vite |
| Blockchain Interaction | ethers.js v5 |
| Styling | Tailwind CSS |
| Wallet | MetaMask |

---

## 👥 Author

**Hemanth E B**

---

## 📄 License

MIT License

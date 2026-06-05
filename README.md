# ContracTify 🔐

A **secure, blockchain-based contract management platform** combining smart contracts with AI-powered contract generation. Fully transparent, decentralized, and built with modern web3 technologies.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-000000)](https://nextjs.org/)
[![Polygon](https://img.shields.io/badge/Polygon-8247E5)](https://polygon.technology/)

## 🎯 Features

### Core Features
- **🔗 Blockchain-Based Contracts** - Smart contracts on Polygon with cryptographic signatures
- **🤖 AI Contract Generation** - Automatically generate contracts using Google Gemini
- **📝 Contract Management** - Create, sign, and track contracts with full audit trail
- **💎 NFT Proof** - Automatic NFT generation as proof of contract finalization
- **👥 Multi-Signer Support** - Multiple parties can sign contracts sequentially
- **📄 IPFS Storage** - Decentralized contract storage via Pinata/IPFS
- **🔐 Wallet Management** - Built-in Privy integration with Smart Wallets (ERC-4337) and native gas sponsorship

### Developer Experience
- **TypeScript** - Full type safety across frontend and backend
- **Gas Optimization** - Gasless transactions via Privy Policy Engine (ERC-4337)
- **Rate Limiting** - Protected endpoints with request throttling
- **Error Handling** - Comprehensive error handling and logging
- **Docker Support** - Containerized development environment

## 📋 Prerequisites

- **Node.js** 18+ & npm/yarn
- **PostgreSQL** 14+
- **Redis** (optional, for caching)
- **Alchemy API Key** (for RPC endpoints)
- **Polygon Mumbai Testnet** account

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/contractify.git
cd contractify
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### 3. Configure Environment

#### Backend - `backend/.env`
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5433/contractify
ALCHEMY_API_KEY=your_alchemy_key
MASTER_ENCRYPTION_KEY=your_encryption_key
JWT_SECRET=your_jwt_secret
FUNDER_PRIVATE_KEY=0xyour_testnet_key # (Optional/Legacy for fallback EOA funding)
GEMINI_API_KEY=your_gemini_key
PINATA_JWT=your_pinata_jwt
```

#### Frontend - `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### 4. Database Setup

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines & development workflow |
| [backend/docs/](./backend/docs/) | Backend API & integration guides |
| [backend/README.md](./backend/README.md) | Backend-specific documentation |

### Key Guides
- [On-Demand Fund Integration](./backend/docs/FUND_INTEGRATION.md)
- [Gas Estimation Guide](./backend/docs/GAS_ESTIMATION.md) (Legacy)
- [Funding Setup](./backend/docs/FUND_ON_DEMAND.md) (Legacy)

## 🏗️ Project Structure

```
contractify/
├── backend/
│   ├── config/              # Configuration
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Database models (Prisma)
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── utils/               # Utilities
│   ├── docs/                # Documentation
│   └── server.js            # Entry point
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js app router
│   │   ├── components/     # React components
│   │   ├── contexts/       # Context providers
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
└── blockchain/             # Smart contracts (Hardhat)
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/privy` - Privy authentication
- `POST /api/auth/google` - Google OAuth

### Contracts
- `GET /api/contracts` - List user contracts
- `POST /api/contracts/create` - Create contract
- `POST /api/contracts/sign` - Sign contract
- `GET /api/contracts/:id` - Get contract details

### Funding
- `GET /api/fund/status` - Check wallet status
- `POST /api/fund/request` - Request funding

See [backend/docs/](./backend/docs/) for complete API reference.

## 🛡️ Security

- **End-to-End Encryption** - Private keys encrypted with AES-256-GCM
- **JWT Authentication** - Secure token-based auth
- **Rate Limiting** - DDoS protection via request throttling
- **CORS** - Restricted cross-origin access
- **Helmet** - HTTP security headers
- **Input Validation** - Express-validator for all inputs

### Best Practices
- Never commit `.env` files
- Use environment variables for secrets
- Rotate private keys regularly
- Enable 2FA in production
- Keep dependencies updated

## 💰 Gas Optimization

The platform uses **Privy Smart Wallets (ERC-4337)** and **Gas Sponsorship** to provide gasless transactions to users:

```javascript
// Gas sponsorship is configured natively on the Privy Dashboard (Policy Engine).
// No need for custom backend fund routing for standard smart contract interactions!
```

See the [Privy Dashboard](https://dashboard.privy.io/) for configuring your Gas Policy. (The legacy `ensureFunded` documentation is preserved for fallback EOA wallets).

## 🧪 Testing

```bash
npm test
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](./LICENSE) file.

## 🆘 Support

- 📖 [Documentation](./backend/docs/)
- 🐛 [Report a Bug](https://github.com/yourusername/contractify/issues)
- 💬 [Discussions](https://github.com/yourusername/contractify/discussions)

---

**Made with ❤️ by the ContracTify Team**

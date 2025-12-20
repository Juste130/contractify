# Contractify Backend

Backend API for Contractify - Hybrid blockchain contract management platform.

## Features

- 🔐 **Secure Wallet Management**: AES-256-GCM encryption for user wallets
- 🤖 **AI Contract Generation**: OpenAI GPT-4 integration
- 📦 **IPFS Storage**: Pinata integration for decentralized storage
- ⛓️ **Blockchain Sync**: Real-time synchronization with smart contracts
- 📧 **Email Notifications**: Automated email system
- 🔑 **JWT Authentication**: Secure user authentication
- 👥 **Role-Based Access Control**: Admin, User, Viewer roles

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Blockchain**: ethers.js v6
- **AI**: OpenAI GPT-4
- **Storage**: Pinata (IPFS)
- **Email**: Nodemailer

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis
- Polygon RPC endpoint

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

**Critical variables**:
- `MASTER_ENCRYPTION_KEY`: 256-bit key for wallet encryption
- `JWT_SECRET`: JWT signing secret
- `OPENAI_API_KEY`: OpenAI API key
- `PINATA_JWT`: Pinata JWT token
- `CONTRACT_MANAGER_ADDRESS`: Smart contract address
- `ADMIN_WALLET_ADDRESS`: Admin wallet address

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/refresh` - Refresh token

### AI Services
- `POST /api/ai/generate-contract` - Generate contract
- `POST /api/ai/improve-clause` - Improve clause
- `POST /api/ai/suggest-clauses` - Get suggestions
- `POST /api/ai/validate` - Validate contract

### IPFS
- `POST /api/ipfs/upload` - Upload document
- `GET /api/ipfs/:cid` - Get metadata

### Contracts
- `GET /api/contracts/cached` - Get cached contracts
- `POST /api/contracts/sync/:id` - Sync contract
- `GET /api/search/contracts` - Search contracts

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Prisma Studio
npm run prisma:studio
```

## Security

- Wallet private keys encrypted with AES-256-GCM
- Master encryption key stored in AWS Secrets Manager (production)
- Rate limiting on all endpoints
- Audit logging for sensitive operations
- JWT with short expiration times

## License

MIT

# Contractify Backend - Quick Start Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for PostgreSQL and Redis)

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# CRITICAL: Update these values:
# - MASTER_ENCRYPTION_KEY (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - JWT_REFRESH_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - OPENAI_API_KEY
# - PINATA_JWT
# - CONTRACT_MANAGER_ADDRESS
# - ADMIN_WALLET_ADDRESS
```

### 4. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/wallet` - Get wallet info
- `GET /api/users` - Get all users (admin)
- `PUT /api/users/:userId/role` - Update role (admin)
- `DELETE /api/users/:userId` - Deactivate user (admin)

### AI Services
- `POST /api/ai/generate-contract` - Generate contract
- `POST /api/ai/improve-clause` - Improve clause
- `POST /api/ai/suggest-clauses` - Get suggestions
- `POST /api/ai/validate` - Validate contract

### IPFS
- `POST /api/ipfs/upload` - Upload document
- `POST /api/ipfs/upload-json` - Upload JSON
- `GET /api/ipfs/:cid` - Get metadata
- `DELETE /api/ipfs/:cid` - Unpin document

### Contracts
- `GET /api/contracts/cached` - Get cached contracts
- `POST /api/contracts/sync/:contractId` - Sync contract
- `POST /api/contracts/sync-all` - Sync all contracts
- `GET /api/contracts/search` - Search contracts
- `GET /api/contracts/:contractId` - Get contract details
- `GET /api/contracts/admin/all` - Get all contracts (admin)

## Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test registration (example)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── ai.controller.ts
│   │   ├── ipfs.controller.ts
│   │   └── contract.controller.ts
│   ├── services/        # Business logic
│   │   ├── auth.ts
│   │   ├── wallet.ts
│   │   ├── ai.ts
│   │   ├── ipfs.ts
│   │   ├── email.ts
│   │   └── blockchain-sync.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── ipfs.routes.ts
│   │   └── contract.routes.ts
│   ├── models/          # Prisma client
│   ├── utils/           # Helper functions
│   └── server.ts        # Entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Prisma Issues
```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Regenerate Prisma client
npm run prisma:generate
```

## Next Steps

1. Configure your `.env` file with real API keys
2. Test all endpoints with Postman or curl
3. Integrate with frontend application
4. Deploy to production (see deployment guide in README.md)

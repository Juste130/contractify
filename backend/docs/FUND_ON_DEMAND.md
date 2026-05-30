# 🔧 On-Demand Funding Setup

Complete setup guide for the on-demand wallet funding system.

## Quick Setup

### 1. Configure Funder Wallet

Edit `backend/.env`:

```env
FUNDER_PRIVATE_KEY=0xyour_testnet_private_key_here
# INITIAL_GAS_AMOUNT is deprecated - amounts are now dynamic
```

To get your private key:
1. Open MetaMask
2. Account → Export Private Key
3. Copy and paste into `.env`

### 2. Integrate into Your Routes

```javascript
const { ensureFunded } = require('../middleware/fund-check');

// For fixed cost actions
router.post('/sign', authenticate, ensureFunded('0.05'), controller.sign);

// For dynamic cost actions
router.post('/transfer', authenticate, ensureFunded(), controller.transfer);
```

### 3. Test Funding

```bash
# Check wallet status
curl http://localhost:3001/api/fund/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Request funding
curl -X POST http://localhost:3001/api/fund/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requiredAmount": "0.05"}'
```

## How It Works

```
User creates account
    ↓
✅ Wallet generated (NO auto-funding)
    ↓
User signs contract (requires 0.05 MATIC)
    ↓
Middleware checks balance
    ↓
If insufficient:
  → Funder sends EXACTLY (0.05 - current_balance + buffer)
Otherwise:
  → Continue directly (saves gas)
    ↓
✅ Transaction executed
```

## Services

### FundOnDemandService
**Location:** `backend/services/fund-on-demand.js`

Methods:
- `fundIfNeeded(address, requiredAmount)` - Fund if balance insufficient
- `ensureBalance(userId, requiredAmount)` - Ensure user wallet is funded
- `getWalletBalance(address)` - Get current balance
- `getFundingStatus(userId)` - Get funding status

### FundCheck Middleware
**Location:** `backend/middleware/fund-check.js`

```javascript
const { ensureFunded } = require('../middleware/fund-check');

// Fixed amount
ensureFunded('0.05')

// Dynamic amount from request
ensureFunded()
```

## API Routes

### GET /api/fund/status
Check wallet funding status

**Response:**
```json
{
  "address": "0x1234...",
  "balance": "10.5",
  "needsFunding": false,
  "fundedAt": "2026-05-30T10:00:00Z"
}
```

### POST /api/fund/request
Request funding for specific amount

**Request:**
```json
{
  "requiredAmount": "0.05"
}
```

**Response:**
```json
{
  "message": "Funding check completed",
  "address": "0x1234...",
  "amountRequested": "0.05",
  "wasFunded": true
}
```

## Security

⚠️ **Important:**
- Never commit `.env` with private keys to Git
- Use environment variables in production
- Consider AWS Secrets Manager for production
- Use service wallet (not personal wallet)
- Rotate keys regularly

## Monitoring

### View Funding Logs

```bash
npm run dev 2>&1 | grep -i "fund"
```

### Example Log Output

```
Wallet 0x1234... has sufficient balance: 0.5 MATIC >= 0.05 MATIC required
Wallet 0x5678... insufficient balance (0.01 MATIC), funding with 0.041 MATIC...
Wallet 0x5678... funded with 0.041 MATIC. Tx: 0xabcd...
User abc123 funding check: amount=0.05 MATIC, FUNDED
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Funder wallet not configured" | `FUNDER_PRIVATE_KEY` missing | Add to `.env` |
| Funding fails | Funder wallet empty | Send testnet MATIC to funder |
| "Failed to get balance" | Invalid RPC or network down | Verify RPC URL |
| Wrong amount funded | Estimation too low | Check gas estimates |

## Costs

- **Free** ✅ - No external services
- **Requires:** Testnet MATIC + RPC endpoint (Alchemy free tier works)

## Next Steps

1. ✅ Add `FUNDER_PRIVATE_KEY` to `.env`
2. ✅ Estimate real gas costs (see [GAS_ESTIMATION.md](./GAS_ESTIMATION.md))
3. ✅ Integrate `ensureFunded()` in routes
4. ✅ Test with staging users
5. ✅ Monitor logs
6. ✅ Deploy to production

For integration examples, see [FUND_INTEGRATION.md](./FUND_INTEGRATION.md).

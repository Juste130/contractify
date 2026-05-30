# 🚀 On-Demand Fund Integration Guide

This guide explains how to integrate the on-demand wallet funding system into your blockchain routes and controllers.

## Quick Start

### Fixed Amount (Known Cost)

If you know an action always costs ~0.05 MATIC:

```javascript
const { ensureFunded } = require('../middleware/fund-check');
const { authenticate } = require('../middleware/auth');

// In your route file:
router.post(
    '/contracts/sign', 
    authenticate, 
    ensureFunded('0.05'),  // ← Fixed amount in MATIC
    contractController.signContract
);
```

### Dynamic Amount (Runtime Estimation)

If cost varies:

```javascript
router.post(
    '/tokens/transfer', 
    authenticate, 
    ensureFunded(),  // No fixed amount
    async (req, res, next) => {
        const userId = req.user.userId;
        const { to, amount } = req.body;

        // Estimate gas
        const gasEstimate = ethers.parseEther('0.02');
        const totalNeeded = ethers.parseEther(amount).add(gasEstimate);

        // Ensure funding
        await fundOnDemandService.ensureBalance(userId, totalNeeded);

        // Continue with transaction...
    }
);
```

## Common Routes

| Route | Amount | Type |
|-------|--------|------|
| `POST /contracts/sign` | 0.05 MATIC | Fixed |
| `POST /contracts/create` | 0.1 MATIC | Fixed |
| `POST /contracts/finalize` | 0.08 MATIC | Fixed |
| `POST /nft/mint` | 0.15 MATIC | Fixed |
| `POST /tokens/transfer` | Dynamic | Variable |

## API Endpoints

### Check Funding Status
```bash
GET /api/fund/status

Response:
{
  "address": "0x1234...",
  "balance": "10.5",
  "needsFunding": false,
  "fundedAt": "2026-05-30T10:00:00Z"
}
```

### Request Funding
```bash
POST /api/fund/request
Content-Type: application/json

{
  "requiredAmount": "0.05"
}

Response:
{
  "message": "Funding check completed",
  "address": "0x1234...",
  "amountRequested": "0.05",
  "wasFunded": true
}
```

## Best Practices

1. **Always estimate gas** - Use real values from production
2. **Add buffer** - Add 10-20% for network fluctuations
3. **Log funding** - Track when wallets are funded
4. **Monitor costs** - Verify actual gas vs estimated

See [GAS_ESTIMATION.md](./GAS_ESTIMATION.md) for detailed gas estimation guide.

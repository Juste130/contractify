# ⛽ Gas Estimation Guide

Accurately estimate gas costs for blockchain transactions before deploying.

## Typical Costs (Polygon Mumbai Testnet)

### Simple Transactions
- Transfer MATIC: ~0.005 MATIC
- Transfer ERC20 token: ~0.01 MATIC
- Simple storage write: ~0.005 MATIC

### Contract Interactions
- Sign contract: ~0.03-0.05 MATIC
- Create contract: ~0.08-0.15 MATIC
- Mint NFT: ~0.08-0.12 MATIC
- Finalize (multi-signer): ~0.1-0.2 MATIC

## Method 1: Via ethers.js (Recommended)

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(
    'https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY'
);

const contract = new ethers.Contract(
    contractAddress,
    ['function sign(uint256 contractId) external'],
    provider
);

async function estimateGas() {
    try {
        const gasEstimate = await contract.sign.estimateGas(1);
        const gasPrice = await provider.getGasPrice();
        const totalCostWei = gasEstimate * gasPrice;
        const totalCostMatic = ethers.formatEther(totalCostWei);
        
        console.log('Estimated cost:', totalCostMatic, 'MATIC');
    } catch (e) {
        console.error('Estimation failed:', e.message);
    }
}

estimateGasCosts().catch(console.error);
```

## Method 2: Via Polygon Scan (Manual)

1. Go to [mumbai.polygonscan.com](https://mumbai.polygonscan.com)
2. Find a recent transaction for your contract
3. Click the transaction hash
4. Note "Gas Used" and "Gas Price"
5. Calculate: `Gas Used × Gas Price = Total in Wei`
6. Divide by 1e18 = Amount in MATIC

Example:
```
Gas Used: 50,000
Gas Price: 40 Gwei (= 40 × 1e9 wei)
Total: 50,000 × 40 × 1e9 = 2 × 1e15 wei
In MATIC: 2 × 1e15 / 1e18 = 0.002 MATIC
```

## Add Safety Buffer

Always add 10-20% buffer for:
- Gas price variations
- Network congestion
- Failed/retried transactions

```javascript
function addBuffer(estimatedMatic, percentBuffer = 10) {
    const multiplier = 1 + percentBuffer / 100;
    const withBuffer = (parseFloat(estimatedMatic) * multiplier).toFixed(4);
    return withBuffer;
}

// Examples:
addBuffer('0.05', 10);   // 0.0550
addBuffer('0.1', 15);    // 0.1150
addBuffer('0.15', 20);   // 0.1800
```

## Testing Process

Before production:

1. Deploy to staging
2. Execute 10-20 real transactions
3. Check actual costs on Polygon Scan
4. Compare with estimates
5. Adjust `ensureFunded()` amounts if needed
6. Deploy when ±5% margin is acceptable

## Integration in Routes

```javascript
// Static estimation
router.post('/sign', authenticate, ensureFunded('0.055'), controller.sign);

// Dynamic estimation
router.post('/transfer', authenticate, ensureFunded(), (req, res, next) => {
    const amount = ethers.parseEther(req.body.amount);
    const gasEstimate = ethers.parseEther('0.01');
    const total = amount.add(gasEstimate);
    
    fundOnDemandService.ensureBalance(userId, total);
});
```

For detailed integration examples, see [FUND_INTEGRATION.md](./FUND_INTEGRATION.md).

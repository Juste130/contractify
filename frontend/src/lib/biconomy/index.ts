import { createSmartAccountClient } from "@biconomy/account";
import { ethers } from "ethers";

export const getBiconomySmartAccount = async (provider: ethers.Provider, signer: ethers.Signer) => {
    // Requires a wallet Client or Ethers Signer.
    // Assuming Biconomy v4
    
    // To sponsor gas, a Paymaster URL is needed from Biconomy dashboard
    const paymasterUrl = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v1/80002/...";
    const bundlerUrl = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/80002/...";

    const smartAccount = await createSmartAccountClient({
        signer: signer as any,
        biconomyPaymasterApiKey: paymasterUrl,
        bundlerUrl: bundlerUrl,
        chainId: 80002, // Amoy chain
    });

    return smartAccount;
};

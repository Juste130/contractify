"use client";

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { getContractManager } from '@/lib/web3/contracts';
import { useWeb3 } from '@/contexts/web3-context';
import { useWallets } from '@privy-io/react-auth';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true';

export function useContract() {
    const { isConnected, sendTransaction } = useWeb3();
    const { wallets } = useWallets();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getSigner = async () => {
        if (MOCK_MODE) return null;
        const wallet = wallets[0];
        if (!wallet) {
            throw new Error('Wallet not connected via Privy');
        }
        
        // Obtenir le provider EIP-1193 depuis Privy et le wrapper avec ethers
        const eip1193provider = await wallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(eip1193provider);
        return await provider.getSigner();
    };

    const createContract = useCallback(async (
        ipfsHash: string,
        sha256Hash: string,
        signersWithRoles: { signer: string, role: number, customRole: string, hasSignedContract: boolean, signedAt: number }[],
        expiresAt: number,
        allowTermination: boolean,
        allowDispute: boolean,
        escrowAmount: string,
        penaltyPercent: number,
        initialJustification: string
    ) => {
        if (!isConnected && !MOCK_MODE) throw new Error('Wallet not connected');

        setLoading(true);
        setError(null);

        try {
            if (MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return {
                    id: Math.floor(Math.random() * 1000).toString(),
                    transactionHash: '0x' + Math.random().toString(16).slice(2)
                };
            }

            const signer = await getSigner();
            if (!signer) throw new Error('Signer not available');
            if (!signer.provider) throw new Error('Provider not available on signer');

            const contractManagerAddress = process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '';
            const contract = getContractManager(signer);
            
            const data = contract.interface.encodeFunctionData('createContract', [
                ipfsHash,
                sha256Hash,
                signersWithRoles,
                expiresAt,
                allowTermination,
                allowDispute,
                escrowAmount,
                penaltyPercent,
                initialJustification
            ]);

            const txResponse = await sendTransaction(contractManagerAddress, data);
            
            // Note: with Privy we just get the tx hash back, we need to wait for it using a standard provider
            const receipt = await signer.provider.waitForTransaction(txResponse.hash);
            if (!receipt || receipt.status === 0) {
                 throw new Error("Transaction failed on chain");
            }

            // Extract contractId from events
            const event = receipt.logs
                .map((log: any) => {
                    try { return contract.interface.parseLog(log); }
                    catch (e) { return null; }
                })
                .find((e: any) => e && e.name === 'ContractCreated');

            return {
                id: event?.args?.contractId?.toString(),
                transactionHash: txResponse.hash
            };
        } catch (err: any) {
            const message = err?.reason || err?.message || 'Failed to create contract';
            console.error('Contract creation error:', err);
            setError(message);
            toast.error('Transaction failed', { description: message });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets, sendTransaction]);

    /**
     * Anchors an off-chain event (dispute opened, hold proposed/accepted, ...) with a
     * short on-chain breadcrumb via the contract's existing, unconstrained justification
     * log — cheap (a plain string, no escrow dependency), and gives the off-chain record
     * an immutable timestamp on the same chain that already anchors the document hash and
     * the NFT. Returns null instead of throwing on failure: anchoring is a nice-to-have,
     * never a blocker for the underlying dispute/hold action itself.
     */
    const anchorJustification = useCallback(async (contractId: string, note: string): Promise<string | null> => {
        if (MOCK_MODE) return null;
        try {
            const signer = await getSigner();
            if (!signer) return null;
            const contractManagerAddress = process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '';
            const contract = getContractManager(signer);
            // Truncate defensively — the contract enforces 1-200 chars (validJustification).
            const data = contract.interface.encodeFunctionData('addJustification', [contractId, note.slice(0, 200)]);
            const txResponse = await sendTransaction(contractManagerAddress, data);
            return txResponse.hash;
        } catch (err) {
            console.warn('On-chain anchoring failed (non-blocking):', err);
            return null;
        }
    }, [wallets, sendTransaction]);

    /**
     * Terminates an Active contract (Active -> Terminated). Unlike openDispute(), this has
     * no dead-end: it's a genuine terminal action, blocked on-chain only if escrow funds
     * are still deposited (release/penalize first) — see ContractManager.sol.
     */
    const terminateContract = useCallback(async (
        contractId: string,
        reason: number,
        customReason: string,
        proofIpfsHash: string,
        justification: string
    ) => {
        if (!isConnected && !MOCK_MODE) throw new Error('Wallet not connected');

        setLoading(true);
        setError(null);

        try {
            if (MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                return true;
            }

            const signer = await getSigner();
            if (!signer) throw new Error('Signer not available');
            if (!signer.provider) throw new Error('Provider not available on signer');

            const contractManagerAddress = process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '';
            const contract = getContractManager(signer);
            const data = contract.interface.encodeFunctionData('terminateContract', [
                contractId, reason, customReason, proofIpfsHash, justification
            ]);

            const txResponse = await sendTransaction(contractManagerAddress, data);
            const receipt = await signer.provider.waitForTransaction(txResponse.hash);
            if (!receipt || receipt.status === 0) {
                throw new Error("Transaction failed on chain");
            }

            return true;
        } catch (err: any) {
            const message = err?.reason || err?.message || 'Failed to terminate contract';
            console.error('Contract termination error:', err);
            setError(message);
            toast.error('La résiliation a échoué', { description: message });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets, sendTransaction]);

    /**
     * Platform-wide emergency pause/resume. The frontend only decides whether to *show*
     * these controls (gated on the ADMIN app role in admin-system-page.tsx) — the real
     * authorization is the contract's own onlyAuthorizedPauser/onlyOwnerOrEmergencyAdmin
     * modifiers, so a wallet that isn't actually authorized on-chain simply reverts.
     */
    const emergencyPause = useCallback(async (reason: string) => {
        if (!isConnected && !MOCK_MODE) throw new Error('Wallet not connected');
        setLoading(true);
        setError(null);
        try {
            const signer = await getSigner();
            if (!signer) throw new Error('Signer not available');
            const contractManagerAddress = process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '';
            const contract = getContractManager(signer);
            const data = contract.interface.encodeFunctionData('emergencyPause', [reason]);
            const txResponse = await sendTransaction(contractManagerAddress, data);
            await signer.provider!.waitForTransaction(txResponse.hash);
            return true;
        } catch (err: any) {
            const message = err?.reason || err?.message || 'Failed to pause';
            setError(message);
            toast.error('La mise en pause a échoué', { description: message });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets, sendTransaction]);

    const resumeContractPlatform = useCallback(async (reason: string) => {
        if (!isConnected && !MOCK_MODE) throw new Error('Wallet not connected');
        setLoading(true);
        setError(null);
        try {
            const signer = await getSigner();
            if (!signer) throw new Error('Signer not available');
            const contractManagerAddress = process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '';
            const contract = getContractManager(signer);
            const data = contract.interface.encodeFunctionData('resumeContract', [reason]);
            const txResponse = await sendTransaction(contractManagerAddress, data);
            await signer.provider!.waitForTransaction(txResponse.hash);
            return true;
        } catch (err: any) {
            const message = err?.reason || err?.message || 'Failed to resume';
            setError(message);
            toast.error('La reprise a échoué', { description: message });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets, sendTransaction]);

    /** Read-only platform pause state — no signer/wallet needed. */
    const getPauseState = useCallback(async () => {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
        if (MOCK_MODE || !rpcUrl) return { paused: false, pausedAt: 0, owner: '', emergencyAdmin: '' };
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = getContractManager(provider);
        const [paused, pausedAt, owner, emergencyAdmin] = await Promise.all([
            contract.paused(),
            contract.pausedAt(),
            contract.owner(),
            contract.emergencyAdmin(),
        ]);
        return { paused: Boolean(paused), pausedAt: Number(pausedAt), owner, emergencyAdmin };
    }, []);

    const signContract = useCallback(async (contractId: string) => {
        if (!isConnected && !MOCK_MODE) throw new Error('Wallet not connected');

        setLoading(true);
        setError(null);

        try {
            if (MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                return true;
            }

            const signer = await getSigner();
            if (!signer) throw new Error('Signer not available');
            if (!signer.provider) throw new Error('Provider not available on signer');

            const contractManagerAddress = process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '';
            const contract = getContractManager(signer);
            const data = contract.interface.encodeFunctionData('signContract', [contractId]);

            const txResponse = await sendTransaction(contractManagerAddress, data);
            
            const receipt = await signer.provider.waitForTransaction(txResponse.hash);
            if (!receipt || receipt.status === 0) {
                 throw new Error("Transaction failed on chain");
            }

            return true;
        } catch (err: any) {
            const message = err?.reason || err?.message || 'Failed to sign contract';
            console.error('Contract signing error:', err);
            setError(message);
            toast.error('Signature failed', { description: message });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets, sendTransaction]);

    return {
        createContract,
        signContract,
        terminateContract,
        anchorJustification,
        emergencyPause,
        resumeContractPlatform,
        getPauseState,
        loading,
        error
    };
}

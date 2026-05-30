"use client";

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContractManager } from '@/lib/web3/contracts';
import { useWeb3 } from '@/contexts/web3-context';
import { useWallets } from '@privy-io/react-auth';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true';

export function useContract() {
    const { isConnected } = useWeb3();
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
            const contract = getContractManager(signer);

            const tx = await contract.createContract(
                ipfsHash,
                sha256Hash,
                signersWithRoles,
                expiresAt,
                allowTermination,
                allowDispute,
                escrowAmount,
                penaltyPercent,
                initialJustification
            );

            const receipt = await tx.wait();

            // Extract contractId from events
            const event = receipt.logs
                .map((log: any) => {
                    try { return contract.interface.parseLog(log); }
                    catch (e) { return null; }
                })
                .find((e: any) => e && e.name === 'ContractCreated');

            return {
                id: event?.args?.contractId?.toString(),
                transactionHash: receipt.hash
            };
        } catch (err: any) {
            console.error('Contract creation error:', err);
            setError(err.message || 'Failed to create contract');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets]);

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
            const contract = getContractManager(signer);

            const tx = await contract.signContract(contractId);
            await tx.wait();

            return true;
        } catch (err: any) {
            console.error('Contract signing error:', err);
            setError(err.message || 'Failed to sign contract');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isConnected, wallets]);

    return {
        createContract,
        signContract,
        loading,
        error
    };
}

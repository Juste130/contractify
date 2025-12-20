import { ethers } from 'ethers';

export const CONTRACT_MANAGER_ABI = [
    'function createContract(uint40 expiresAt, address[] additionalSigners, string ipfsHash) external returns (uint256)',
    'function signContract(uint256 contractId) external',
    'function getUserContracts(address user) external view returns (uint256[])',
    'function getContractDetails(uint256 contractId) external view returns (tuple(uint256 id, address creator, uint40 createdAt, uint40 expiresAt, uint40 effectiveDate, uint8 status, bool allowTermination, bool allowDispute, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) terminationInfo, tuple(uint8 reason, string customReason, string proofIpfsHash, tuple(string justification, uint40 timestamp, address updatedBy) justification) disputeInfo, uint88 totalAmount, uint88 releasedAmount, uint256 nftTokenId) contractData, tuple(address signer, uint8 role, string customRole, bool hasSignedContract, uint40 signedAt)[] signers, bool allSigned, uint256 justificationCount, uint256 paymentCount)',
    'event ContractCreated(uint256 indexed contractId, address indexed creator, uint40 createdAt, address[] additionalSigners)',
    'event ContractFinalized(uint256 indexed contractId, uint256 nftTokenId, uint40 effectiveDate)',
    'event ContractStatusUpdated(uint256 indexed contractId, uint8 oldStatus, uint8 newStatus, string justification, address updatedBy)',
];

export const CONTRACT_NFT_ABI = [
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'function tokenURI(uint256 tokenId) external view returns (string)',
];

export const getContractManager = (signerOrProvider: ethers.Signer | ethers.Provider) => {
    return new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_MANAGER_ADDRESS || '',
        CONTRACT_MANAGER_ABI,
        signerOrProvider
    );
};

export const getContractNFT = (signerOrProvider: ethers.Signer | ethers.Provider) => {
    return new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_NFT_ADDRESS || '',
        CONTRACT_NFT_ABI,
        signerOrProvider
    );
};

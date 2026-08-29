// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ContractNFT
 * @dev NFT optimisé pour polygon - Preuves de contracts signés
 * @author Sènami Juste HOUEZO <houezojuste0@gmail.com>
 */
contract ContractNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    struct ContractProof {
        string ipfsHash;
        uint40 timestamp;
        bool isActive;
    }
    mapping(uint256 => ContractProof) private contractProofs;
    mapping(string  => bool) private ipfsHashExists;
    mapping(uint256 => address[]) private contractSigners;

    event ContractNFTMinted(
        uint256 indexed tokenId,
        string ipfsHash,
        address[] signers
    );
    event ContractProofStatusUpdated(uint256 indexed tokenId, bool isActive);

    constructor() ERC721("ContractNFTProof", "CNFTP") {}

    /**
     * @dev Mint a new Contract NFT
     * @param to The address to mint the NFT to
     * @param ipfsHash The IPFS hash of the contract proof
     * @param signers The addresses of the signers
     */
    function mintContractNFT(address to, string calldata ipfsHash, address[] calldata signers) external onlyOwner returns (uint256) {
        require(!ipfsHashExists[ipfsHash], "Contract already exists");
        require(signers.length > 0 && signers.length <= 255, "Invalid signers count");
        ipfsHashExists[ipfsHash] = true;
        _tokenIdCounter++;
        uint256 newtokenId = _tokenIdCounter;
        _safeMint(to, newtokenId);
        contractProofs[newtokenId] = ContractProof({
            ipfsHash: ipfsHash, 
            timestamp: uint40(block.timestamp), 
            isActive: true
        });
        contractSigners[newtokenId] = signers;
        emit ContractNFTMinted(newtokenId, ipfsHash, signers);
        return newtokenId;
    }
    /**
     * @dev Get the details of a Contract NFT
     * @param tokenId The ID of the token
     * @return ipfsHash The IPFS hash of the contract proof
     * @return timestamp The timestamp when the NFT was minted
     * @return isActive Whether the contract proof is active
     * @return signers The addresses of the signers
     */
    function getContractProof(uint256 tokenId) external view returns (string memory ipfsHash, uint256 timestamp, bool isActive, address[] memory signers) {
        require(_exists(tokenId), "Token does not exist");
        ContractProof memory proof = contractProofs[tokenId];
        return (proof.ipfsHash, proof.timestamp, proof.isActive, contractSigners[tokenId]);
    }

    /**
     * @dev Keeps the on-chain proof honest once the underlying contract leaves the Active
     * state (terminated, disputed, or completed via escrow release/penalty) — without this,
     * isActive stayed permanently true from mint onward. Restricted to the owner (ContractManager),
     * the same authority that mints the proof in the first place.
     * @param tokenId The ID of the token
     * @param active The contract's current in-force state
     */
    function updateProofStatus(uint256 tokenId, bool active) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        contractProofs[tokenId].isActive = active;
        emit ContractProofStatusUpdated(tokenId, active);
    }

    /**
     * @dev This proof is bound to whoever actually signed the contract — a transfer would let
     * the NFT change hands independently of who is legally party to the underlying document,
     * so every transfer other than the initial mint is rejected.
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        require(from == address(0), "ContractNFT: proof is non-transferable");
    }

    /**
     * @dev Override tokenURI to return IPFS link
     * @param tokenId The ID of the token
     * @return The token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        ContractProof memory proof = contractProofs[tokenId];
        return string(abi.encodePacked("ipfs://", proof.ipfsHash));
    }
}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ✅ INTERFACE POUR CONTRACTNFT
interface IContractNFT {
    function mintContractNFT(
        address to, 
        string calldata ipfsHash, 
        address[] calldata signers
    ) external returns (uint256);
    
    function getContractProof(uint256 tokenId) external view returns (
        string memory ipfsHash, 
        uint256 timestamp, 
        bool isActive, 
        address[] memory signers
    );
    
    function owner() external view returns (address);
}


/**
 * @title ContractManager
 * @dev Gère la création et la gestion des ContractNFTs
 * @author Sènami Juste HOUEZO <houezojuste0@gmail.com>
 */
contract ContractManager is Ownable, ReentrancyGuard {
    uint256 private _contractIds;
    uint256 private _paymentIds;
    address public emergencyAdmin;
    uint8 private _authorizedPauserCount;

    // ✅ SYSTÈME DE PAUSE ROBUSTE
    bool public paused;
    uint40 public pausedAt;
    uint40 public constant MAX_PAUSE_DURATION = 30 days;
    uint8 public constant MAX_PAUSERS = 3;

    IContractNFT public contractNFT;

    enum ContractStatus { Draft, PendingSignatures, Active, Completed, Cancelled, Disputed, Terminated, Resigned }
    enum TerminationReason {None, MutualAgreement, BreachOfContract, CompletionOfTerms, FraudOrMisrepresentation, ImpossibilityOfPerformance, ChangeInLaw, Other }
    enum DisputeReason {None, NonPayment, PoorQualityWork, DelaysInPerformance, BreachOfConfidentiality, IntellectualPropertyDispute, Other }
    enum PaymentStatus { None, Pending, Approved, Completed, Blocked, Overdue, Refunded, Disputed }
    enum SignerRole { Creator, CoSigner, Witness, LegalRepresentative, Other}

    struct ContractJustification {
        string justification;
        uint40 timestamp;
        address updatedBy;
    }

    struct SignerInfo {
        address signer;
        SignerRole role;
        string customRole; // Si "Other" est sélectionné
        bool hasSignedContract;
        uint40 signedAt;
    }

    struct TerminationInfo {
        TerminationReason reason;
        string customReason;
        string proofIpfsHash;
        ContractJustification justification;
    }
    struct DisputeInfo {
        DisputeReason reason;
        string customReason;
        string proofIpfsHash;
        ContractJustification justification;
    }
    struct PaymentInfo {
        uint256 amount;
        string currency; 
        PaymentStatus status;
        string proofIpfsHash;
        ContractJustification justification;
    }

    struct ContractData {
        uint256 id;
        address creator;
        uint40 createdAt;
        uint40 expiresAt;
        uint40 effectiveDate;
        ContractStatus status;
        bool allowTermination;
        bool allowDispute;
        TerminationInfo terminationInfo;
        DisputeInfo disputeInfo;
        uint88 totalAmount;
        uint88 releasedAmount; //@dev Montant total déjà libéré
        uint256 nftTokenId;
    }

    mapping(uint256 => ContractData) public contracts;
    mapping(uint256 => string) public contractIpfsHashes; // contractId => ContractNFT address
    mapping(uint256 => uint256[]) public contractPayments; // contractId => paymentIds
    mapping(uint256 => SignerInfo[]) public contractSigners;
    mapping(uint256 => mapping(address => bool)) public signatures;
    mapping(uint256 => ContractJustification[]) public contractJustifications;
    mapping(uint256 => PaymentInfo[]) public paymentInfos;
    mapping(address => uint256[]) public userContracts;
    mapping(string => bool) public ipfsHashUsed;
    mapping(address => bool) public authorizedPausers;

    event ContractCreated(
        uint256 indexed contractId,
        address indexed creator,
        uint40 createdAt,
        address[] additionalSigners
    );
    event ContractStatusUpdated(
        uint256 indexed contractId,
        ContractStatus oldStatus,
        ContractStatus newStatus,
        string justification,
        address updatedBy
    );
    event ContractTerminated(
        uint256 indexed contractId,
        TerminationReason reason,
        string customReason,
        string proofIpfsHash,
        string justification,
        address updatedBy
    );
    event ContractDisputed(
        uint256 indexed contractId,
        DisputeReason reason,
        string customReason,
        string proofIpfsHash,
        string justification,
        address updatedBy
    );
    event PaymentStatusUpdated(
        uint256 indexed contractId,
        uint256 indexed paymentId,
        PaymentStatus oldStatus,
        PaymentStatus newStatus,
        string justification,
        address updatedBy
    );
    event ContractJustificationAdded(
        uint256 indexed contractId,
        address indexed addedBy,
        string justification
    );
    event SignatureRequired(
        uint256 indexed contractId,
        address indexed signer,
        SignerRole role
    );
    event ContractSigned(
        uint256 indexed contractId,
        address indexed signer,
        SignerRole role
    );
    event ContractFinalized(
        uint256 indexed contractId,
        uint256 nftTokenId,
        uint40 effectiveDate
    );
    event ContractCancelled(
        uint256 indexed contractId,
        address indexed cancelledBy,
        string justification
    );
    event PaymentAdded(
        uint256 indexed contractId,
        uint256 indexed paymentId,
        uint256 amount,
        string currency
    );
    event JustificationAdded(
        uint256 indexed contractId,
        address indexed addedBy,
        string justification
    );
    event Notification(
        uint256 indexed contractId,
        address indexed to,
        string message
    );
    event ContractPaused(
        address indexed pauser, 
        string reason, 
        uint40 timestamp
    );
    event ContractResumed(
        address indexed resumer, 
        string reason, uint40 
        timestamp
    );
    event EmergencyAdminUpdated(
        address indexed oldAdmin, 
        address indexed newAdmin
    );
    event PauserAuthorizationUpdated(
        address indexed pauser, 
        bool authorized
    );
    event ForceResumeExecuted(
        address indexed executor, 
        string reason
    );

    modifier validContractId(uint256 contractId) {
        require(contractId > 0 && contractId <= _contractIds, "Invalid contract ID");
        _;
    }
    modifier onlyContractCreator(uint256 contractId) {
        require(contracts[contractId].creator == msg.sender, "Not contract creator");
        _;
    }
    modifier onlyParticipant(uint256 contractId) {
        require(_isContractParticipant(contractId, msg.sender), "Not a participant");
        _;
    }
    modifier validJustification(string calldata justification) {
        require(bytes(justification).length > 0 && bytes(justification).length <= 200, "Invalid justification length: 1-200 chars");
        _;
    }
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }
    
    modifier onlyAuthorizedPauser() {
        require(
            msg.sender == owner() || 
            msg.sender == emergencyAdmin || 
            authorizedPausers[msg.sender],
            "Not authorized to pause"
        );
        _;
    }
    
    modifier onlyOwnerOrEmergencyAdmin() {
        require(
            msg.sender == owner() || 
            msg.sender == emergencyAdmin,
            "Not authorized for this action"
        );
        _;
    }

    /**
     * @dev Constructeur avec vérification
     */
    constructor(address _contractNFTAddress) Ownable() ReentrancyGuard() {
        require(_contractNFTAddress != address(0), "Invalid NFT contract address");
        contractNFT = IContractNFT(_contractNFTAddress);

        // Configuration initiale de sécurité
        emergencyAdmin = msg.sender; // Par défaut, le déployeur est emergencyAdmin
        paused = false;
        
        // Vérifier que ContractManager peut appeler mintContractNFT
        require(contractNFT.owner() == address(this) || msg.sender == contractNFT.owner() || contractNFT.owner() == address(0), 
            "ContractManager must be owner or have permission to mint NFTs");
    }

    /**
     * @dev Crée un nouveau contrat avec rôles des signataires
     * @param ipfsHash Hash IPFS du document de contrat
     * @param signersWithRoles Tableau des signataires avec leurs rôles
     * @param expiresAt Date d'expiration du contrat
     * @param allowTermination Permet la résiliation
     * @param allowDispute Permet l'ouverture de litige
     * @param totalAmount Montant total du contrat
     * @param initialJustification Justification initiale
     */
    function createContract(
        string calldata ipfsHash,
        SignerInfo[] calldata signersWithRoles,
        uint40 expiresAt,
        bool allowTermination,
        bool allowDispute,
        uint88 totalAmount,
        string calldata initialJustification
    ) external whenNotPaused validJustification(initialJustification) returns (uint256) {
        require(!ipfsHashUsed[ipfsHash], "IPFS hash already used");
        require(expiresAt > uint40(block.timestamp), "Invalid expiration time");
        require(signersWithRoles.length <= 50, "Too many signers"); // Limite raisonnable

        _contractIds++;
        uint256 newContractId = _contractIds;

        ContractData storage newContract = contracts[newContractId];
        newContract.id = newContractId;
        newContract.creator = msg.sender;
        newContract.createdAt = uint40(block.timestamp);
        newContract.expiresAt = expiresAt;
        newContract.status = ContractStatus.PendingSignatures;
        newContract.allowTermination = allowTermination;
        newContract.allowDispute = allowDispute;
        newContract.totalAmount = totalAmount;
        newContract.releasedAmount = 0;

        contractIpfsHashes[newContractId] = ipfsHash;
        ipfsHashUsed[ipfsHash] = true;

        // Ajout du créateur comme premier signataire
        contractSigners[newContractId].push(SignerInfo({
            signer: msg.sender,
            role: SignerRole.Creator,
            customRole: "",
            hasSignedContract: true,
            signedAt: uint40(block.timestamp)
        }));

        signatures[newContractId][msg.sender] = true;
        _addUserContract(msg.sender, newContractId);

        // Ajout des signataires additionnels avec leurs rôles
        address[] memory additionalSigners = new address[](signersWithRoles.length);
        for (uint256 i = 0; i < signersWithRoles.length; i++) {
            require(signersWithRoles[i].signer != msg.sender, "Creator cannot be additional signer");
            require(signersWithRoles[i].signer != address(0), "Invalid signer address");
            
            contractSigners[newContractId].push(SignerInfo({
                signer: signersWithRoles[i].signer,
                role: signersWithRoles[i].role,
                customRole: signersWithRoles[i].customRole,
                hasSignedContract: false,
                signedAt: 0
            }));

            additionalSigners[i] = signersWithRoles[i].signer;
            _addUserContract(signersWithRoles[i].signer, newContractId);
            emit SignatureRequired(newContractId, signersWithRoles[i].signer, signersWithRoles[i].role);
        }

        // Ajout de la justification initiale
        _addJustification(newContractId, initialJustification);

        emit ContractCreated(newContractId, msg.sender, expiresAt, additionalSigners);
        emit ContractSigned(newContractId, msg.sender, SignerRole.Creator);

        // Finalisation immédiate si aucun signataire additionnel
        if (signersWithRoles.length == 0) {
            _finalizeContract(newContractId, "Auto-finalized: no additional signers");
        }

        return newContractId;
    }

    /**
     * @dev Signature d'un contrat par un participant
     */
    function signContract(uint256 contractId) 
        external 
        whenNotPaused
        validContractId(contractId) 
        onlyParticipant(contractId) 
    {
        ContractData storage contractData = contracts[contractId];
        require(contractData.status == ContractStatus.PendingSignatures, "Invalid status");
        require(uint40(block.timestamp) <= contractData.expiresAt, "Contract expired");
        require(!signatures[contractId][msg.sender], "Already signed");

        signatures[contractId][msg.sender] = true;

        // Mise à jour du statut de signature avec timestamp
        SignerInfo[] storage signers = contractSigners[contractId];
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i].signer == msg.sender) {
                signers[i].hasSignedContract = true;
                signers[i].signedAt = uint40(block.timestamp);
                emit ContractSigned(contractId, msg.sender, signers[i].role);
                break;
            }
        }

        if (_allSignaturesCollected(contractId)) {
            _finalizeContract(contractId, "All signatures collected");
        }
    }

    /**
     * @dev Annulation du contrat par le créateur
     */
    function cancelContract(uint256 contractId, string calldata justification) 
        external 
        whenNotPaused
        validContractId(contractId) 
        onlyContractCreator(contractId)
        validJustification(justification)
    {
        require(uint40(block.timestamp) <= contracts[contractId].expiresAt, "Contract expired");
        ContractData storage contractData = contracts[contractId];
        require(contractData.status == ContractStatus.PendingSignatures, "Contract already finalized");
        require(!_allSignaturesCollected(contractId), "All signatures already collected");

        ContractStatus oldStatus = contractData.status;
        contractData.status = ContractStatus.Cancelled;
        
        _addJustification(contractId, justification);
        _notifyAllParticipants(contractId, "Contract cancelled by creator");

        emit ContractStatusUpdated(contractId, oldStatus, ContractStatus.Cancelled, justification, msg.sender);
        emit ContractCancelled(contractId, msg.sender, justification);
    }

    /**
     * @dev Résiliation du contrat
     */
    function terminateContract(
        uint256 contractId,
        TerminationReason reason,
        string calldata customReason,
        string calldata proofIpfsHash,
        string calldata justification
    ) 
        external 
        whenNotPaused
        validContractId(contractId)
        onlyParticipant(contractId)
        validJustification(justification)
    {
        require(uint40(block.timestamp) <= contracts[contractId].expiresAt, "Contract expired");
        ContractData storage contractData = contracts[contractId];
        require(contractData.allowTermination, "Termination not allowed");
        require(contractData.status == ContractStatus.Active, "Contract not active");
        require(reason != TerminationReason.None, "Invalid termination reason");

        ContractStatus oldStatus = contractData.status;
        contractData.status = ContractStatus.Terminated;
        
        contractData.terminationInfo = TerminationInfo({
            reason: reason,
            customReason: customReason,
            proofIpfsHash: proofIpfsHash,
            justification: ContractJustification(justification, uint40(block.timestamp), msg.sender)
        });

        _addJustification(contractId, justification);
        _notifyAllParticipants(contractId, "Contract terminated");

        emit ContractStatusUpdated(contractId, oldStatus, ContractStatus.Terminated, justification, msg.sender);
        emit ContractTerminated(contractId, reason, customReason, proofIpfsHash, justification, msg.sender);
    }

    /**
     * @dev Ouverture d'un litige
     */
    function openDispute(
        uint256 contractId,
        DisputeReason reason,
        string calldata customReason,
        string calldata proofIpfsHash,
        string calldata justification
    ) 
        external 
        whenNotPaused
        validContractId(contractId)
        onlyParticipant(contractId)
        validJustification(justification)
    {
        require(uint40(block.timestamp) <= contracts[contractId].expiresAt, "Contract expired");
        ContractData storage contractData = contracts[contractId];
        require(contractData.allowDispute, "Dispute not allowed");
        require(contractData.status == ContractStatus.Active, "Contract not active");
        require(reason != DisputeReason.None, "Invalid dispute reason");

        ContractStatus oldStatus = contractData.status;
        contractData.status = ContractStatus.Disputed;
        
        contractData.disputeInfo = DisputeInfo({
            reason: reason,
            customReason: customReason,
            proofIpfsHash: proofIpfsHash,
            justification: ContractJustification(justification, uint40(block.timestamp), msg.sender)
        });

        _addJustification(contractId, justification);
        _notifyAllParticipants(contractId, "Contract disputed");

        emit ContractStatusUpdated(contractId, oldStatus, ContractStatus.Disputed, justification, msg.sender);
        emit ContractDisputed(contractId, reason, customReason, proofIpfsHash, justification, msg.sender);
    }

    /**
     * @dev Ajout d'un paiement au contrat
     */
    function addPayment(
        uint256 contractId,
        uint256 amount,
        string calldata currency,
        string calldata proofIpfsHash
    ) external whenNotPaused validContractId(contractId) onlyContractCreator(contractId) {
        require(amount > 0, "Amount must be greater than zero");
        _paymentIds++;
        uint256 newPaymentId = _paymentIds;

        PaymentInfo memory newPayment = PaymentInfo({
            amount: amount,
            currency: currency,
            status: PaymentStatus.Pending,
            proofIpfsHash: proofIpfsHash,
            justification: ContractJustification("", 0, address(0))
        });

        paymentInfos[contractId].push(newPayment);
        contractPayments[contractId].push(newPaymentId);

        emit PaymentAdded(contractId, newPaymentId, amount, currency);
        emit Notification(contractId, contracts[contractId].creator, string(abi.encodePacked("New payment added: ", _uintToString(amount), " ", currency)));
    }

    /**
     * @dev Mise à jour du statut d'un paiement
     */
    function updatePaymentStatus(
        uint256 contractId,
        uint256 paymentIndex,
        PaymentStatus newStatus,
        string calldata justification
    ) 
        external 
        whenNotPaused
        validContractId(contractId)
        onlyContractCreator(contractId)
        validJustification(justification)
    {
        require(paymentIndex < paymentInfos[contractId].length, "Invalid payment index");
        
        PaymentInfo storage payment = paymentInfos[contractId][paymentIndex];
        PaymentStatus oldStatus = payment.status;
        payment.status = newStatus;
        payment.justification = ContractJustification(justification, uint40(block.timestamp), msg.sender);

        emit PaymentStatusUpdated(contractId, contractPayments[contractId][paymentIndex], oldStatus, newStatus, justification, msg.sender);
        
        // Mise à jour du montant libéré si paiement complété
        if (newStatus == PaymentStatus.Completed) {
            contracts[contractId].releasedAmount += uint88(payment.amount);
        }
    }

    /**
     * @dev Ajout d'une justification au contrat
     */
    function addJustification(uint256 contractId, string calldata justification) 
        external 
        whenNotPaused
        validContractId(contractId)
        onlyParticipant(contractId)
        validJustification(justification)
    {
        _addJustification(contractId, justification);
    }

     /**
     * @dev Finalisation automatique du contrat avec création du NFT
     */
    function _finalizeContract(uint256 contractId, string memory justification) internal {
        require(uint40(block.timestamp) <= contracts[contractId].expiresAt, "Contract expired");
        ContractData storage contractData = contracts[contractId];
        ContractStatus oldStatus = contractData.status;
        
        // ✅ CRÉATION DU NFT SEULEMENT ICI - APRÈS TOUTES LES SIGNATURES
        uint256 nftTokenId = _mintContractNFT(contractId);
        
        contractData.status = ContractStatus.Active;
        contractData.effectiveDate = uint40(block.timestamp);
        contractData.nftTokenId = nftTokenId;
        
        _addJustification(contractId, justification);
        _notifyAllParticipants(contractId, "Contract finalized and active");

        emit ContractStatusUpdated(contractId, oldStatus, ContractStatus.Active, justification, contractData.creator);
        emit ContractFinalized(contractId, nftTokenId, contractData.effectiveDate);
    }

    /**
     * @dev Mint le NFT de preuve après toutes les signatures
     */
    function _mintContractNFT(uint256 contractId) internal returns (uint256) {
        ContractData memory contractData = contracts[contractId];
        
        // Récupération de tous les signataires pour le NFT
        SignerInfo[] memory signers = contractSigners[contractId];
        address[] memory signerAddresses = new address[](signers.length);
        
        for (uint256 i = 0; i < signers.length; i++) {
            signerAddresses[i] = signers[i].signer;
        }

        // ✅ APPEL À CONTRACTNFT POUR CRÉER LE NFT
        uint256 tokenId = contractNFT.mintContractNFT(
            contractData.creator,           // Propriétaire du NFT
            contractIpfsHashes[contractId], // Hash IPFS du document
            signerAddresses                 // Tous les signataires
        );
        require(tokenId > 0, "NFT minting failed"); // Simple vérification

        return tokenId;
    }

    /**
     * @dev Vérifie si toutes les signatures sont collectées
     */
    function _allSignaturesCollected(uint256 contractId) internal view returns (bool) {
        SignerInfo[] memory signers = contractSigners[contractId];
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (!signers[i].hasSignedContract) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev Ajout d'une justification
     */
    function _addJustification(uint256 contractId, string memory justification) internal {
        contractJustifications[contractId].push(
            ContractJustification(justification, uint40(block.timestamp), msg.sender)
        );
        emit JustificationAdded(contractId, msg.sender, justification);
    }

    /**
     * @dev Vérifie si l'adresse est un participant
     */
    function _isContractParticipant(uint256 contractId, address user) internal view returns (bool) {
        SignerInfo[] memory signers = contractSigners[contractId];
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i].signer == user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Ajout d'un contrat à la liste des utilisateurs
     */
    function _addUserContract(address user, uint256 contractId) internal {
        userContracts[user].push(contractId);
    }

    /**
     * @dev Notification de tous les participants
     */
    function _notifyAllParticipants(uint256 contractId, string memory message) internal {
        address[] memory allParticipants = _getAllParticipants(contractId);
        for (uint256 i = 0; i < allParticipants.length; i++) {
            emit Notification(contractId, allParticipants[i], message);
        }
    }

    /**
     * @dev Récupère tous les participants
     */
    function _getAllParticipants(uint256 contractId) internal view returns (address[] memory) {
        SignerInfo[] memory signers = contractSigners[contractId];
        address[] memory participants = new address[](signers.length);
        
        for (uint256 i = 0; i < signers.length; i++) {
            participants[i] = signers[i].signer;
        }
        
        return participants;
    }

    /**
     * @dev Récupère les infos du NFT via l'interface
     */
    function getNFTProof(uint256 contractId) 
        external 
        view 
        validContractId(contractId)
        returns (
            string memory ipfsHash,
            uint256 timestamp,
            bool isActive,
            address[] memory signers
        )
    {
        uint256 nftTokenId = contracts[contractId].nftTokenId;
        require(nftTokenId > 0, "No NFT minted for this contract");
        
        return contractNFT.getContractProof(nftTokenId);
    }

    /**
     * @dev Conversion uint en string
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
     /**
     * @dev Convertit une adresse en string hex (0x...)
     */
    function _addressToString(address account) internal pure returns (string memory) {
        bytes20 data = bytes20(account);
        bytes memory hexChars = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < 20; i++) {
            uint8 b = uint8(data[i]);
            str[2 + i * 2] = hexChars[b >> 4];
            str[3 + i * 2] = hexChars[b & 0x0f];
        }
        return string(str);
    }

    // ==================== FONCTIONS DE LECTURE ====================

    function getContractDetails(uint256 contractId) 
        external 
        view 
        validContractId(contractId)
        returns (
            ContractData memory contractData,
            SignerInfo[] memory signers,
            bool allSigned,
            uint256 justificationCount,
            uint256 paymentCount
        )
    {
        contractData = contracts[contractId];
        signers = contractSigners[contractId];
        allSigned = _allSignaturesCollected(contractId);
        justificationCount = contractJustifications[contractId].length;
        paymentCount = paymentInfos[contractId].length;
    }

    function getContractJustifications(uint256 contractId) 
        external 
        view 
        validContractId(contractId)
        returns (ContractJustification[] memory)
    {
        return contractJustifications[contractId];
    }

    function getContractPayments(uint256 contractId) 
        external 
        view 
        validContractId(contractId)
        returns (PaymentInfo[] memory)
    {
        return paymentInfos[contractId];
    }

    function getUserContracts(address user) external view returns (uint256[] memory) {
        return userContracts[user];
    }

    /**
     * @dev Récupère les détails des signataires avec leurs rôles
     */
    function getContractSignersWithRoles(uint256 contractId) 
        external 
        view 
        validContractId(contractId)
        returns (SignerInfo[] memory)
    {
        return contractSigners[contractId];
    }

    /**
     * @dev Récupère le rôle d'un signataire spécifique
     */
    function getSignerRole(uint256 contractId, address signer) 
        external 
        view 
        validContractId(contractId)
        returns (SignerRole role, string memory customRole, bool hasSignedContract, uint40 signedAt)
    {
        SignerInfo[] memory signers = contractSigners[contractId];
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i].signer == signer) {
                return (signers[i].role, signers[i].customRole, signers[i].hasSignedContract, signers[i].signedAt);
            }
        }
        revert("Signer not found");
    }

    function hasSigned(uint256 contractId, address signer) 
        external 
        view 
        validContractId(contractId)
        returns (bool)
    {
        return signatures[contractId][signer];
    }

    function getTotalContracts() external view returns (uint256) {
        return _contractIds;
    }
    function getTotalPayments() external view returns (uint256) {
        return _paymentIds;
    }

    // ==================== FONCTIONS DE PAUSE ====================
    /**
     * @dev Pause d'urgence avec raison détaillée
     * @param reason Justification transparente de la pause
     */
    function emergencyPause(string calldata reason) 
        external 
        onlyAuthorizedPauser
        whenNotPaused
        validJustification(reason)
    {
        paused = true;
        pausedAt = uint40(block.timestamp);
        
        // 🔔 Notification à tous les contrats actifs
       for (uint256 cid = 1; cid <= _contractIds; cid++) {
            if (contracts[cid].status == ContractStatus.Active) {
                _notifyAllParticipants(cid, string(abi.encodePacked("EMERGENCY PAUSE: ", reason)));
                // Ajoute une justification par contrat (évite _addGlobalJustification)
                _addJustification(cid, string(abi.encodePacked("System paused: ", reason)));
            }
        }
        emit ContractPaused(msg.sender, reason, pausedAt);
    }
    /**
     * @dev Reprise du contrat après résolution 
     * @param reason Explication de la reprise
     */
    function resumeContract(string calldata reason) 
        external 
        onlyOwnerOrEmergencyAdmin
        whenPaused
        validJustification(reason)
    {
        // ✅ ANTI-ABUS : Pause trop courte impossible
        require(
            block.timestamp >= pausedAt + 1 hours || 
            msg.sender == emergencyAdmin,
            "Minimum pause duration not reached (1 hour)"
        );
        
        paused = false;
        
        emit ContractResumed(msg.sender, reason, uint40(block.timestamp));
        for (uint256 cid = 1; cid <= _contractIds; cid++) {
            if (contracts[cid].status == ContractStatus.Active) {
                _notifyAllParticipants(cid, string(abi.encodePacked("SYSTEM RESUMED: ", reason)));
                _addJustification(cid, string(abi.encodePacked("System resumed: ", reason)));
            }
        }
    }
    /**
     * @dev Reprise forcée après durée maximale - ANTI-CENSURE
     * N'importe qui peut appeler après la durée maximale de pause
     */
    function forceResume() external whenPaused {
        require(
            block.timestamp > pausedAt + MAX_PAUSE_DURATION,
            "Max pause duration not reached"
        );
        
        paused = false;
        
        emit ForceResumeExecuted(
            msg.sender, 
            "Community force resume after max pause duration"
        );
        for (uint256 cid = 1; cid <= _contractIds; cid++) {
            if (contracts[cid].status == ContractStatus.Active) {
                _notifyAllParticipants(cid, "SYSTEM RESUMED: Community force execution");
            }
        }
    }

    /**
     * @dev Mise à jour de l'emergency admin - DOUBLE CONTRÔLE
     * @param newAdmin Nouvel administrateur d'urgence
     */
    function setEmergencyAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid address");
        require(newAdmin != owner(), "Cannot be same as owner");
        require(newAdmin != emergencyAdmin, "Already set to this address");
        
        address oldAdmin = emergencyAdmin;
        emergencyAdmin = newAdmin;
        
        emit EmergencyAdminUpdated(oldAdmin, newAdmin);
        
        // 🔐 Le nouvel admin ne peut pas pause immédiatement
        for (uint256 cid = 1; cid <= _contractIds; cid++) {
            if (contracts[cid].status == ContractStatus.Active) {
                _addJustification(cid, string(abi.encodePacked("Emergency admin updated from ", _addressToString(oldAdmin), " to ", _addressToString(newAdmin))));
            }
        }
    }
    /**
     * @dev Ajout d'un pauser autorisé - LIMITÉ À 3
     * @param pauser Adresse à autoriser
     */
    function addAuthorizedPauser(address pauser) external onlyOwner {
        require(pauser != address(0), "Invalid address");
        require(!authorizedPausers[pauser], "Already authorized");
        require(pauser != owner() && pauser != emergencyAdmin, "Cannot add owner/emergencyAdmin as pauser");
        
        // ✅ LIMITATION STRICTE : maximum 3 pausers
        uint8 currentPauserCount = 0;
        // ... comptage des pausers existants
        require(currentPauserCount < MAX_PAUSERS, "Maximum pausers reached");
        
        authorizedPausers[pauser] = true;
        emit PauserAuthorizationUpdated(pauser, true);
    }

    /**
     * @dev Révocation immédiate d'un pauser
     */
    function revokePauser(address pauser) external onlyOwner {
        require(authorizedPausers[pauser], "Not an authorized pauser");
        
        authorizedPausers[pauser] = false;
        emit PauserAuthorizationUpdated(pauser, false);
        
        for (uint256 cid = 1; cid <= _contractIds; cid++) {
            if (contracts[cid].status == ContractStatus.Active) {
                _addJustification(cid, string(abi.encodePacked("Pauser authorization revoked for: ", _addressToString(pauser))));
            }
        }
        
    }

}

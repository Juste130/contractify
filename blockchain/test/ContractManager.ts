import { expect } from "chai";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";

const { ethers } = hre;

describe("Système de Gestion de Contrats NFT", function () {
  let contractManager: any;
  let contractNFT: any;
  let owner: any;
  let creator: any;
  let signer1: any;
  let signer2: any;
  let nonParticipant: any;

  // Durées pour les tests
  const ONE_DAY = 24 * 60 * 60;
  const expiresAt = Math.floor(Date.now() / 1000) + ONE_DAY;

  beforeEach(async function () {
    // ✅ RÉCUPÉRATION DES SIGNERS AVEC ETHERS.JS
    const signers = await ethers.getSigners();
    [owner, creator, signer1, signer2, nonParticipant] = signers;

    // ✅ DÉPLOIEMENT AVEC ETHERS.JS
    // Déployer ContractNFT
    const ContractNFT = await ethers.getContractFactory("ContractNFT");
    contractNFT = await ContractNFT.deploy();
    await contractNFT.waitForDeployment();

    // Déployer ContractManager
    const nftAddress = await contractNFT.getAddress();
    const ContractManager = await ethers.getContractFactory("ContractManager");
    contractManager = await ContractManager.deploy(nftAddress);
    await contractManager.waitForDeployment();

    // ✅ TRANSFERT OWNERSHIP
    const managerAddress = await contractManager.getAddress();
    const transferTx = await contractNFT.transferOwnership(managerAddress);
    await transferTx.wait();
  });

  describe("Déploiement", function () {
    it("Devrait déployer les contrats avec les bonnes adresses", async function () {
      const nftAddress = await contractNFT.getAddress();
      const managerAddress = await contractManager.getAddress();

      expect(nftAddress).to.be.a("string").and.match(/^0x[a-fA-F0-9]{40}$/);
      expect(managerAddress).to.be.a("string").and.match(/^0x[a-fA-F0-9]{40}$/);

      // Vérifier l'ownership
      const nftOwner = await contractNFT.owner();
      expect(nftOwner).to.equal(managerAddress);
    });
  });

  describe("Création de Contrat", function () {
    it("Devrait créer un contrat avec succès", async function () {
      const signer1Address = await signer1.getAddress();
      const signer2Address = await signer2.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1, // CoSigner
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        },
        {
          signer: signer2Address,
          role: 2, // Witness
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      // ✅ CRÉATION AVEC ETHERS.JS
      const tx = await contractManager.connect(creator).createContract(
        "QmTestHash123",
        "sha256TestHash123",
        signersWithRoles,
        expiresAt,
        true, // allowTermination
        true, // allowDispute
        ethers.parseEther("1.0"),
        10, // penaltyPercent
        "Création du contrat de développement"
      );

      // ✅ VÉRIFICATION
      const receipt = await tx.wait();

      // Vérifier l'événement
      expect(receipt?.logs.length).to.be.greaterThan(0);

      // Vérifier les détails du contrat
      const contractDetails = await contractManager.getContractDetails(1);
      expect(contractDetails[0].creator.toLowerCase()).to.equal((await creator.getAddress()).toLowerCase());
      expect(contractDetails[0].status).to.equal(1); // PendingSignatures
      expect(contractDetails[2]).to.be.false; // allSigned (troisième élément du tuple)
    });

    it("Devrait échouer avec un hash IPFS déjà utilisé", async function () {
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      // Premier contrat
      await contractManager.connect(creator).createContract(
        "QmDuplicateHash",
        "sha256DuplicateHash1",
        signersWithRoles,
        expiresAt,
        true,
        true,
        ethers.parseEther("1.0"),
        10,
        "Premier contrat"
      );

      // Deuxième contrat avec le même hash - devrait échouer
      await expect(
        contractManager.connect(creator).createContract(
          "QmDuplicateHash",
          "sha256DuplicateHash2",
          signersWithRoles,
          expiresAt,
          true,
          true,
          ethers.parseEther("2.0"),
          10,
          "Deuxième contrat"
        )
      ).to.be.revertedWith("IPFS hash already used");
    });

    it("Devrait échouer avec une date d'expiration invalide", async function () {
      const pastDate = Math.floor(Date.now() / 1000) - ONE_DAY;
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await expect(
        contractManager.connect(creator).createContract(
          "QmTestHash",
          "sha256TestHash",
          signersWithRoles,
          pastDate,
          true,
          true,
          ethers.parseEther("1.0"),
          10,
          "Contrat avec date passée"
        )
      ).to.be.revertedWith("Invalid expiration time");
    });
  });

  describe("Processus de Signature", function () {
    beforeEach(async function () {
      // Créer un contrat pour les tests de signature
      const signer1Address = await signer1.getAddress();
      const signer2Address = await signer2.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        },
        {
          signer: signer2Address,
          role: 2,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await contractManager.connect(creator).createContract(
        "QmSignatureTest",
        "sha256SignatureTest",
        signersWithRoles,
        expiresAt,
        true,
        true,
        ethers.parseEther("1.0"),
        10,
        "Test de signatures"
      );
    });

    it("Devrait permettre la signature des participants", async function () {
      // Signer1 signe
      await contractManager.connect(signer1).signContract(1);

      // Signer2 signe
      await contractManager.connect(signer2).signContract(1);

      // Vérifier que toutes les signatures sont collectées
      const contractDetails = await contractManager.getContractDetails(1);
      expect(contractDetails[2]).to.be.true; // allSigned (troisième élément)
      expect(contractDetails[0].status).to.equal(2); // Active
    });

    it("Devrait échouer si un non-participant tente de signer", async function () {
      await expect(
        contractManager.connect(nonParticipant).signContract(1)
      ).to.be.revertedWith("Not a participant");
    });

    it("Devrait mint un NFT après toutes les signatures", async function () {
      // Toutes les signatures
      await contractManager.connect(signer1).signContract(1);
      await contractManager.connect(signer2).signContract(1);

      // Vérifier que le NFT est minté
      const contractDetails = await contractManager.getContractDetails(1);
      expect(contractDetails[0].nftTokenId).to.be.greaterThan(0);
      expect(contractDetails[0].status).to.equal(2); // Active

      // Vérifier les détails du NFT
      const nftProof = await contractManager.getNFTProof(1);
      expect(nftProof[0]).to.equal("QmSignatureTest");
      expect(nftProof[3].length).to.equal(3); // Creator + Signer1 + Signer2
    });
  });

  describe("Gestion des Paiements", function () {
    beforeEach(async function () {
      // Créer un contrat actif
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await contractManager.connect(creator).createContract(
        "QmPaymentTest",
        "sha256PaymentTest",
        signersWithRoles,
        expiresAt,
        true,
        true,
        ethers.parseEther("2.0"),
        10,
        "Test paiements"
      );

      // Finaliser le contrat
      await contractManager.connect(signer1).signContract(1);
    });

    it("Devrait ajouter un paiement", async function () {
      const tx = await contractManager.connect(creator).addPayment(
        1,
        ethers.parseEther("0.5"),
        "USDC",
        "QmPaymentProof1"
      );

      const receipt = await tx.wait();

      expect(receipt?.status).to.equal(1);

      const payments = await contractManager.getContractPayments(1);
      expect(payments.length).to.equal(1);
      expect(payments[0].amount).to.equal(ethers.parseEther("0.5"));
      expect(payments[0].currency).to.equal("USDC");
    });

    it("Devrait mettre à jour le statut de paiement", async function () {
      // Ajouter un paiement
      await contractManager.connect(creator).addPayment(
        1,
        ethers.parseEther("1.0"),
        "MATIC",
        "QmPaymentProof2"
      );

      // Mettre à jour le statut
      const tx = await contractManager.connect(creator).updatePaymentStatus(
        1,
        0, // premier paiement
        3, // Completed
        "Paiement reçu avec succès"
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Vérifier le montant libéré
      const contractDetails = await contractManager.getContractDetails(1);
      expect(contractDetails[0].releasedAmount).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("Résiliation et Litiges", function () {
    beforeEach(async function () {
      // Créer un contrat actif
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await contractManager.connect(creator).createContract(
        "QmDisputeTest",
        "sha256DisputeTest",
        signersWithRoles,
        expiresAt,
        true, // allowTermination
        true, // allowDispute
        ethers.parseEther("1.0"),
        10,
        "Test résiliation"
      );

      await contractManager.connect(signer1).signContract(1);
    });

    it("Devrait permettre la résiliation", async function () {
      const tx = await contractManager.connect(creator).terminateContract(
        1,
        1, // MutualAgreement
        "Parties en accord",
        "QmTerminationProof",
        "Résiliation à l'amiable"
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const contractDetails = await contractManager.getContractDetails(1);
      expect(contractDetails[0].status).to.equal(6); // Terminated
    });

    it("Devrait permettre l'ouverture d'un litige", async function () {
      const tx = await contractManager.connect(signer1).openDispute(
        1,
        2, // PoorQualityWork
        "Travail de mauvaise qualité",
        "QmDisputeProof",
        "Client insatisfait du travail fourni"
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const contractDetails = await contractManager.getContractDetails(1);
      expect(contractDetails[0].status).to.equal(5); // Disputed
    });

    it("Devrait échouer la résiliation si non autorisée", async function () {
      // Créer un contrat sans résiliation autorisée
      await contractManager.connect(creator).createContract(
        "QmNoTermination",
        "sha256NoTermination",
        [],
        expiresAt,
        false, // allowTermination = false
        true,
        ethers.parseEther("1.0"),
        10,
        "Contrat sans résiliation"
      );

      await expect(
        contractManager.connect(creator).terminateContract(
          2,
          1,
          "Raison",
          "Proof",
          "Justification"
        )
      ).to.be.revertedWith("Termination not allowed");
    });
  });

  describe("Système de Pause", function () {
    it("Devrait permettre la pause par le owner", async function () {
      const tx = await contractManager.connect(owner).emergencyPause(
        "Maintenance système"
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const isPaused = await contractManager.paused();
      expect(isPaused).to.be.true;
    });

    it("Devrait empêcher les actions quand en pause", async function () {
      // Mettre en pause
      await contractManager.connect(owner).emergencyPause("Test pause");

      // Tenter de créer un contrat - devrait échouer
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await expect(
        contractManager.connect(creator).createContract(
          "QmPausedTest",
          "sha256PausedTest",
          signersWithRoles,
          expiresAt,
          true,
          true,
          ethers.parseEther("1.0"),
          10,
          "Test pendant pause"
        )
      ).to.be.revertedWith("Contract is paused");
    });

    it("Devrait permettre la reprise", async function () {
      // Mettre en pause
      await contractManager.connect(owner).emergencyPause("Test reprise");

      // Reprendre
      const tx = await contractManager.connect(owner).resumeContract("Maintenance terminée");

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const isPaused = await contractManager.paused();
      expect(isPaused).to.be.false;
    });
  });

  describe("Gestion des Justifications", function () {
    beforeEach(async function () {
      // Créer un contrat
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await contractManager.connect(creator).createContract(
        "QmJustificationTest",
        "sha256JustificationTest",
        signersWithRoles,
        expiresAt,
        true,
        true,
        ethers.parseEther("1.0"),
        10,
        "Test justifications"
      );
    });

    it("Devrait ajouter une justification", async function () {
      const tx = await contractManager.connect(creator).addJustification(
        1,
        "Nouvelle justification"
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const justifications = await contractManager.getContractJustifications(1);
      expect(justifications.length).to.equal(2); // 1 initiale + 1 ajoutée
    });
  });

  describe("Escrow", function () {
    let contractId: number;

    beforeEach(async function () {
      const signer1Address = await signer1.getAddress();

      const signersWithRoles = [
        {
          signer: signer1Address,
          role: 1,
          customRole: "",
          hasSignedContract: false,
          signedAt: 0
        }
      ];

      await contractManager.connect(creator).createContract(
        "QmEscrowTest",
        "sha256EscrowTest",
        signersWithRoles,
        expiresAt,
        true, // allowTermination
        true, // allowDispute
        ethers.parseEther("1.0"),
        10, // penaltyPercent
        "Test escrow"
      );

      // Finalise le contrat (passe en Active)
      await contractManager.connect(signer1).signContract(1);
      contractId = 1;
    });

    it("Devrait permettre le dépôt d'escrow par un participant avec le bon montant", async function () {
      await contractManager.connect(signer1).depositEscrow(contractId, {
        value: ethers.parseEther("1.0"),
      });

      const contractDetails = await contractManager.getContractDetails(contractId);
      expect(contractDetails[0].isEscrowDeposited).to.be.true;
      expect(contractDetails[0].escrowPayer.toLowerCase()).to.equal((await signer1.getAddress()).toLowerCase());
    });

    it("Devrait échouer le dépôt d'escrow avec un mauvais montant", async function () {
      await expect(
        contractManager.connect(signer1).depositEscrow(contractId, {
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWith("Incorrect escrow amount");
    });

    it("Devrait permettre à l'escrowPayer de libérer les fonds au créateur", async function () {
      await contractManager.connect(signer1).depositEscrow(contractId, {
        value: ethers.parseEther("1.0"),
      });

      const creatorBalanceBefore = await ethers.provider.getBalance(await creator.getAddress());

      await contractManager.connect(signer1).releaseEscrow(contractId);

      const creatorBalanceAfter = await ethers.provider.getBalance(await creator.getAddress());
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("1.0"));

      const contractDetails = await contractManager.getContractDetails(contractId);
      expect(contractDetails[0].isEscrowDeposited).to.be.false;
      expect(contractDetails[0].status).to.equal(3); // Completed
    });

    it("Devrait échouer si quelqu'un d'autre que l'escrowPayer tente de libérer les fonds", async function () {
      await contractManager.connect(signer1).depositEscrow(contractId, {
        value: ethers.parseEther("1.0"),
      });

      await expect(
        contractManager.connect(creator).releaseEscrow(contractId)
      ).to.be.revertedWith("Only the escrow payer can release funds");
    });

    it("Devrait appliquer la pénalité correctement sur un contrat en litige et clore le contrat", async function () {
      await contractManager.connect(signer1).depositEscrow(contractId, {
        value: ethers.parseEther("1.0"),
      });

      // Ouvrir un litige (participant)
      await contractManager.connect(signer1).openDispute(
        contractId,
        1, // NonPayment
        "Non paiement",
        "QmDisputeProof",
        "Litige pour non-paiement"
      );

      const creatorBalanceBefore = await ethers.provider.getBalance(await creator.getAddress());

      await contractManager.connect(signer1).applyPenalty(contractId);

      const creatorBalanceAfter = await ethers.provider.getBalance(await creator.getAddress());
      // 90% du montant (100% - 10% de pénalité) revient au créateur
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("0.9"));

      const contractDetails = await contractManager.getContractDetails(contractId);
      expect(contractDetails[0].isEscrowDeposited).to.be.false;
      expect(contractDetails[0].status).to.equal(3); // Completed
    });

    it("Devrait empêcher la résiliation tant que l'escrow n'est pas soldé", async function () {
      await contractManager.connect(signer1).depositEscrow(contractId, {
        value: ethers.parseEther("1.0"),
      });

      await expect(
        contractManager.connect(creator).terminateContract(
          contractId,
          1,
          "Raison",
          "Proof",
          "Justification"
        )
      ).to.be.revertedWith("Release or penalize escrow before terminating");
    });
  });

  // Fonction utilitaire pour obtenir le timestamp du bloc actuel
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
  }
});
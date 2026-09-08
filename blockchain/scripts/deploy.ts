import hre from "hardhat";

async function main() {
  console.log("Déploiement des contrats...");

  // Le contrat de preuve NFT sert des métadonnées ERC-721 (nom, description, image générée)
  // depuis ce point d'API plutôt que de pointer directement vers le document sur IPFS — voir
  // le commentaire sur _baseTokenURI dans ContractNFT.sol. Doit se terminer par un "/" pour
  // que l'ajout du tokenId donne une URL valide. Repointable après coup via
  // setBaseTokenURI() sans redéploiement si le domaine change.
  const nftMetadataBaseUri = process.env.NFT_METADATA_BASE_URI || `${process.env.API_BASE_URL || "http://localhost:5000"}/api/nft/`;
  console.log("Base URI des métadonnées NFT:", nftMetadataBaseUri);

  // Déployer ContractNFT
  const ContractNFT = await hre.ethers.getContractFactory("ContractNFT");
  const contractNFT = await ContractNFT.deploy(nftMetadataBaseUri);
  await contractNFT.waitForDeployment();
  const nftAddress = await contractNFT.getAddress();
  console.log("ContractNFT déployé à:", nftAddress);

  // Déployer ContractManager
  const ContractManager = await hre.ethers.getContractFactory("ContractManager");
  const contractManager = await ContractManager.deploy(nftAddress);
  await contractManager.waitForDeployment();
  const managerAddress = await contractManager.getAddress();
  console.log("ContractManager déployé à:", managerAddress);

  // Transférer ownership
  const tx = await contractNFT.transferOwnership(managerAddress);
  await tx.wait();

  // Seul un vrai contrôle post-transfert a un sens : avant cet appel, ContractManager ne peut
  // structurellement pas encore être owner (il n'a été déployé qu'à l'instant précédent).
  const newOwner = await contractNFT.owner();
  if (newOwner !== managerAddress) {
    throw new Error(
      `Échec du transfert de propriété : ContractNFT.owner() = ${newOwner}, attendu ${managerAddress}. ` +
      `Les mints (et donc toute finalisation de contrat) échoueront tant que ce n'est pas corrigé.`
    );
  }
  console.log("Ownership de ContractNFT transféré à ContractManager (vérifié)");

  console.log("Déploiement terminé avec succès!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

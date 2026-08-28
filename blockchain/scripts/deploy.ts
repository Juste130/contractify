import hre from "hardhat";

async function main() {
  console.log("Déploiement des contrats...");

  // Déployer ContractNFT
  const ContractNFT = await hre.ethers.getContractFactory("ContractNFT");
  const contractNFT = await ContractNFT.deploy();
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

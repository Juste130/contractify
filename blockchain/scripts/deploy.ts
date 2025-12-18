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
  console.log("Ownership de ContractNFT transféré à ContractManager");

  console.log("Déploiement terminé avec succès!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

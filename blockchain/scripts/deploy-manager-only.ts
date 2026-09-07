import hre from "hardhat";

/**
 * Completes a deployment that stopped after ContractNFT (e.g. the deployer ran out of gas
 * mid-way through scripts/deploy.ts) — deploys ContractManager pointing at an ALREADY
 * deployed ContractNFT instead of redeploying both from scratch, and does the ownership
 * transfer. Usage: EXISTING_NFT_ADDRESS=0x... npx hardhat run scripts/deploy-manager-only.ts --network amoy
 */
async function main() {
  const nftAddress = process.env.EXISTING_NFT_ADDRESS;
  if (!nftAddress) {
    throw new Error("Set EXISTING_NFT_ADDRESS to the already-deployed ContractNFT address.");
  }
  console.log("Réutilisation de ContractNFT déjà déployé à:", nftAddress);

  const ContractNFT = await hre.ethers.getContractFactory("ContractNFT");
  const contractNFT = ContractNFT.attach(nftAddress);

  const ContractManager = await hre.ethers.getContractFactory("ContractManager");
  const contractManager = await ContractManager.deploy(nftAddress);
  await contractManager.waitForDeployment();
  const managerAddress = await contractManager.getAddress();
  console.log("ContractManager déployé à:", managerAddress);

  const tx = await (contractNFT as any).transferOwnership(managerAddress);
  await tx.wait();

  const newOwner = await (contractNFT as any).owner();
  if (newOwner !== managerAddress) {
    throw new Error(
      `Échec du transfert de propriété : ContractNFT.owner() = ${newOwner}, attendu ${managerAddress}.`
    );
  }
  console.log("Ownership de ContractNFT transféré à ContractManager (vérifié)");
  console.log("Déploiement terminé avec succès!");
  console.log(`CONTRACT_NFT_ADDRESS=${nftAddress}`);
  console.log(`CONTRACT_MANAGER_ADDRESS=${managerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

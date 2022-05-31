const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

	console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploying
  const AMAT = await ethers.getContractFactory("AMAT");
  const instance = await upgrades.deployProxy(AMAT);
  await instance.deployed();

  console.log("AMAT address:", instance.address);

  // Deploying
  const AMA = await ethers.getContractFactory("AMA");
  const ama_instance = await upgrades.deployProxy(AMA, [10, 48 * 3600, instance.address]);
  await ama_instance.deployed();

  console.log("AMA address:", ama_instance.address);

  const impl = await upgrades.erc1967.getImplementationAddress(instance.address);
  console.log("AMAT impl address:", impl);
  const ama_impl = await upgrades.erc1967.getImplementationAddress(ama_instance.address);
  console.log("AMA impl address:", ama_impl);


  // // Upgrading
  // const AMATV2 = await ethers.getContractFactory("AMATV2");
  // const upgraded = await upgrades.upgradeProxy(instance.address, AMATV2);
}

main();

const { expect } = require("chai");
const { upgrades } = require("hardhat");

describe("Token contract", function () {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("AMAT");

    // const hardhatToken = await Token.deploy();
    const hardhatToken = await upgrades.deployProxy(Token);
    await hardhatToken.deployed();

    // await hardhatToken.initialize();
    // await hardhatToken.connect(owner).mint(owner.address, 100);

    console.log("hardhatToken", hardhatToken.address);
    console.log("owner", owner.address);

    const ownerBalance = await hardhatToken.balanceOf(owner.address);
    // expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
    expect(await hardhatToken.totalSupply()).to.eql(ownerBalance);
  });
});
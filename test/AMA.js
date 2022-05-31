const { expect } = require("chai");
const { upgrades } = require("hardhat");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("AMA contract", function () {
  it("test 1", async function () {
    const [owner, answerer, questioner, staker1, staker2, listener1, listener2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("AMAT");
    const token = await upgrades.deployProxy(Token);
    await token.deployed();

    console.log("token", token.address);

    const AMA = await ethers.getContractFactory("AMA");

    // const hardhatToken = await Token.deploy();
    const ama = await upgrades.deployProxy(AMA, [10, 10, token.address]);
    await ama.deployed();

    await token.connect(owner).mint(questioner.address, 2000);
    await token.connect(owner).mint(staker1.address, 2000);
    await token.connect(owner).mint(staker2.address, 2000);
    await token.connect(owner).mint(listener1.address, 2000);
    await token.connect(owner).mint(listener2.address, 2000);
    await token.connect(questioner).approve(ama.address, 10 ** 10);
    await token.connect(staker1).approve(ama.address, 10 ** 10);
    await token.connect(staker2).approve(ama.address, 10 ** 10);
    await token.connect(listener1).approve(ama.address, 10 ** 10);
    await token.connect(listener2).approve(ama.address, 10 ** 10);

    // ask: answerer's price has not set
    await expect(ama.connect(questioner).ask(10010, answerer.address, 100)).to.be.revertedWith('Answerer not ready');
    // set price
    await ama.connect(answerer).setPrice(1000);
    // ask
    await ama.connect(questioner).ask(10010, answerer.address, 100);
    // ask: same id
    await expect(ama.connect(questioner).ask(10010, answerer.address, 100)).to.be.revertedWith('Invalid question id');
    // answer: fundraising not reached
    await expect(ama.connect(answerer).answer(10010)).to.be.revertedWith('The fundraising has not been reached');
    // stake: questioner += 100
    await ama.connect(questioner).stake(10010, 100);
    // fundraising not reached
    await expect(ama.connect(answerer).answer(10010)).to.be.revertedWith('The fundraising has not been reached');
    // stake: staker1 = 300
    await ama.connect(staker1).stake(10010, 300);
    // stake: staker2 = 1000 - 200 - 300 = 500
    await ama.connect(staker2).stake(10010, 2000);
    // stake: Fundraising completed
    await expect(ama.connect(listener1).stake(10010, 2000)).to.be.revertedWith('Fundraising completed');

    // others can't answer
    await expect(ama.connect(questioner).answer(10010)).to.be.revertedWith('Only answerer can answer');

    // not answered: invest
    await expect(ama.connect(questioner).withdraw(10010)).to.be.revertedWith("Insufficient balance.");

    // not answered: listen
    await expect(ama.connect(listener1).listen(10010, 50)).to.be.revertedWith("Not answered");

    // answer and earn money
    var balance1 = await token.balanceOf(answerer.address);
    await ama.connect(answerer).answer(10010);
    var balance2 = await token.balanceOf(answerer.address);
    expect(balance2 - balance1).eql(1000);

    // withdraw: no share
    await expect(ama.connect(questioner).withdraw(10010)).to.be.revertedWith("Insufficient balance");
    // withdraw: not investor
    await expect(ama.connect(listener1).withdraw(10010)).to.be.revertedWith("Not staker");

    // refound
    await expect(ama.connect(questioner).refund(10010)).to.be.revertedWith("Already answered");

    // listen should pay
    await expect(ama.connect(listener1).listen(10010, 0)).to.be.revertedWith("should pay");

    // pay for listen 1
    await ama.connect(listener1).listen(10010, 10);

    // pay for listen 2
    await ama.connect(listener2).listen(10010, 21);

    // share: (10 + 21) * 200 / (2 * 1000) = 3
    balance1 = await token.balanceOf(questioner.address);
    await ama.connect(questioner).withdraw(10010);
    balance2 = await token.balanceOf(questioner.address);
    expect(balance2 - balance1).to.equal(3);

    // share: (10 + 21) * 300 / (2 * 1000) = 4
    balance1 = await token.balanceOf(staker1.address);
    await ama.connect(staker1).withdraw(10010);
    balance2 = await token.balanceOf(staker1.address);
    expect(balance2 - balance1).to.equal(4);

    // share: (10 + 21) * 500 / (2 * 1000) = 7
    balance1 = await token.balanceOf(staker2.address);
    await ama.connect(staker2).withdraw(10010);
    balance2 = await token.balanceOf(staker2.address);
    expect(balance2 - balance1).to.equal(7);

    // share: (10 + 21) * 1000 / (2 * 1000) = 15
    balance1 = await token.balanceOf(answerer.address);
    await ama.connect(answerer).withdraw(10010);
    balance2 = await token.balanceOf(answerer.address);
    expect(balance2 - balance1).to.equal(15);

    await expect(ama.connect(staker1).withdraw(10010)).to.be.revertedWith("Insufficient balance.");
    await expect(ama.connect(staker2).withdraw(10010)).to.be.revertedWith("Insufficient balance.");
    await expect(ama.connect(questioner).withdraw(10010)).to.be.revertedWith("Insufficient balance.");
    await expect(ama.connect(answerer).withdraw(10010)).to.be.revertedWith("Insufficient balance.");

    await ama.connect(staker1).listen(10010, 100);

    // share: 100 * 500 / (2 * 1000) = 25
    balance1 = await token.balanceOf(staker2.address);
    await ama.connect(staker2).withdraw(10010);
    balance2 = await token.balanceOf(staker2.address);
    expect(balance2 - balance1).to.equal(25);

    // ---

    // refound: fund timeout
    await ama.connect(questioner).ask(10086, answerer.address, 100);
    await expect(ama.connect(questioner).refund(10086)).to.be.revertedWith("Please wait util fund timeout");
    await sleep(1000 * 10);
    await ama.connect(questioner).refund(10086);

    // refound: answer timeout
    await ama.connect(questioner).ask(10087, answerer.address, 1000);
    await expect(ama.connect(questioner).refund(10087)).to.be.revertedWith("Please wait util answer timeout");
    await sleep(1000 * 10);
    await ama.connect(questioner).refund(10087);

  });
});
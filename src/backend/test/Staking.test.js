const {expect} = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe('Token and Staking Contract', function(){
    let deployer, addr1, addr2, rewardsContract

    beforeEach(async function(){
        const Token = await ethers.getContractFactory("SampleToken");
        const Staking = await ethers.getContractFactory("StakingV2");
        //Get signers
        [deployer, addr1, addr2, rewardsContract] = await ethers.getSigners();
        //Deploy contract
        token = await Token.deploy(toWei(1000));
        staking = await Staking.deploy(token.address);
        
    })

    describe("Staking Contract", function(){
        beforeEach(async function(){
            //address 1, 2 mints 7000 and 3000 tokens respecitvely, calls approve
            await token.connect(addr1).mint(toWei(7000));
            await token.connect(addr2).mint(toWei(3000));

            await token.connect(addr1).approve(staking.address, toWei(7000));
            await token.connect(addr2).approve(staking.address, toWei(3000));
        })
        //passed
        // it("Should be able to stake and withdraw, track balances and total supply", async function(){
        //     //addr1 stakes 7000 tokens
        //     await staking.connect(addr1).stake(toWei(7000));
        //     expect(await token.balanceOf(staking.address)).to.equal(toWei(7000));
        //     expect(await staking.balanceOf(addr1.address)).to.equal(toWei(7000));
        //     expect(await staking.totalSupply()).to.equal(toWei(7000));
        //     //addr 1 withdraws 7000 tokens
        //     await staking.connect(addr1).withdraw(toWei(7000));
        //     expect(await token.balanceOf(addr1.address)).to.equal(toWei(7000));
        //     expect(await staking.balanceOf(addr1.address)).to.equal(0);
        // })

        it("Should track userEthEarned, and claimRewards should work", async function(){
            //addr1 stakes 7000 tokens
            await staking.connect(addr1).stake(toWei(7000));
            //addr1 tries to claim rewards (should fail)
            await expect(staking.connect(addr1).claimRewards())
            .to.be.revertedWith("No ETH rewards to claim");
            //deposit eth in staking contract
            await staking.connect(rewardsContract).depositEth({ value: toWei(100) });
            //addr2 stakes 3000 tokens
            await staking.connect(addr2).stake(toWei(3000));
            //check userEthEarned for both users
            expect(await staking.userEthEarned(addr1.address)).to.equal(toWei(100));
            expect(await staking.userEthEarned(addr2.address)).to.equal(toWei(0));

            //deposit eth in staking contract
            await staking.connect(rewardsContract).depositEth({ value: toWei(100) });
            //check userEthEarned for both users
            expect(await staking.userEthEarned(addr1.address)).to.equal(toWei(170));
            expect(await staking.userEthEarned(addr2.address)).to.equal(toWei(30));
            //both user claimRewards
            await staking.connect(addr1).claimRewards();
            await staking.connect(addr2).claimRewards();
            //check user eth balance
            const addr1EthBal = await ethers.provider.getBalance(addr1.address);
            const addr2EthBal = await ethers.provider.getBalance(addr2.address);
            //Should be 10170
            console.log("Address 1 Eth Balance: ", fromWei(addr1EthBal));
            //Should be 10030
            console.log("Address 2 Eth Balance: ", fromWei(addr2EthBal));

            //both user withdraws from contract
            await staking.connect(addr1).withdraw(toWei(7000));
            await staking.connect(addr2).withdraw(toWei(3000));
            expect(await staking.balanceOf(addr1.address)).to.equal(0);
            expect(await staking.balanceOf(addr2.address)).to.equal(0);
            expect(await staking.totalSupply()).to.equal(0);

        })
    })

})
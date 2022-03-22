const {expect} = require("chai");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe('NFTMarketplace', function(){

    let deployer, address1, address2
    let feePercent = 1
    let URI = "Test URI"

    //Does this before each test: deploys contracts, get user addresses
    beforeEach(async function(){
        //Get contract factories
        const NFT = await ethers.getContractFactory("NFT"); 
        const Marketplace = await ethers.getContractFactory("Marketplace");
        //Get signers
        [deployer, address1, address2] = await ethers.getSigners()
        //Deploy contracts
        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);
    });

    describe("Deployment", function(){
        it("Should track name and symbol of nft collection", async function(){
            expect( await nft.name()).to.equal("Sam NFT");
            expect( await nft.symbol()).to.equal("SAM");
        })
        it("Should track feeAccount and feePercent of marketplace", async function(){
            expect( await marketplace.feeAccount()).to.equal(deployer.address);
            expect( await marketplace.feePercent()).to.equal(feePercent);
        })
    })
    describe("Minting NFTs", function(){
        it("Should track each minted NFT", async function(){
            //Address1 mints an nft
            await nft.connect(address1).mint(URI);
            //Total nft count
            expect(await nft.tokenCount()).to.equal(1);
            //NFT balance of the address
            expect(await nft.balanceOf(address1.address)).to.equal(1);
            //Token URI for first token
            expect(await nft.tokenURI(1)).to.equal(URI);

            //Address2 mints an nft
            await nft.connect(address2).mint(URI);
            //Total nft count
            expect(await nft.tokenCount()).to.equal(2);
            //NFT balance of the address
            expect(await nft.balanceOf(address2.address)).to.equal(1);
            //Token URI for 2nd token
            expect(await nft.tokenURI(2)).to.equal(URI);
            
        })
    })
    describe('Making marketplace items', function(){
        beforeEach(async function(){
            //Address 1 mints an nft
            await nft.connect(address1).mint(URI)
            //Address 1 approves marketplace to spend nft
            await nft.connect(address1).setApprovalForAll(marketplace.address, true) 
        })
        it("Should track newly created item, transfer nft from seller to marketplace, and emit itemlisted event", async function(){
            //Address 1 lists their nft for 1 eth
            await expect(marketplace.connect(address1).listItem(nft.address, 1, toWei(1)))
            .to.emit(marketplace, "ItemListed")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(1),
                address1.address
            )
            //Owner of nft should be marketplace
            expect(await nft.ownerOf(1)).to.equal(marketplace.address);
            //Item count should be = 1
            expect(await marketplace.itemCount()).to.equal(1)
            //Get item from items mapping and check fields to ensure they are correct
            const item = await marketplace.items(1)
            expect(item.itemId).to.equal(1)
            expect(item.nft).to.equal(nft.address)
            expect(item.tokenId).to.equal(1)
            expect(item.price).to.equal(toWei(1))
            expect(item.sold).to.equal(false)
        })
        it("Should fail if price is set to 0", async function(){
            await expect(marketplace.connect(address1).listItem(nft.address, 1, 0))
            .to.be.revertedWith("Price must be greater than 0")
        })
    })
    describe("Purchasing marketplace items", function(){
        let price = 2
        let fee = feePercent/100 * price
        let totalPriceInWei
        beforeEach(async function(){
            //Address 1 mints an nft
            await nft.connect(address1).mint(URI)
            //Address 1 approves marketplace to spend nft
            await nft.connect(address1).setApprovalForAll(marketplace.address, true)
            //Address 1 lists their nft on marketplace at 2eth
            await marketplace.connect(address1).listItem(nft.address, 1, toWei(price)) 
        })
        it("Should update item as sold, pay seller, transfer nft to buyer, charge fees, emit itemPurchased event", async function(){
            //Gets initial balance
            const sellerInitialEthBal = await address1.getBalance()
            const feeAccountInitialBal = await deployer.getBalance()
            //Fetch item totalprice (market fees+ item price)
            totalPriceInWei = await marketplace.getTotalPrice(1);
            //Address 2 purchases item
            await expect(marketplace.connect(address2).purchaseItem(1, {value: totalPriceInWei}))
            .to.emit(marketplace, "ItemPurchased")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(price),
                address1.address,
                address2.address
            )
            const sellerFinalEthBal = await address1.getBalance()
            const feeAccountFinalEthBal = await deployer.getBalance()
            //Seller should recieve payment for price of nft sold
            expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal))
            //feeAccount should receive fee
            expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialBal))
            //The buyer should now own the nft
            expect(await nft.ownerOf(1)).to.equal(address2.address);
            //Item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true)
        })
        it("Should fail for invalid item ids, sold items, and when not enough eth is paid", async function(){
            //Fails for invalid item ids
            await expect(marketplace.connect(address2).purchaseItem(2, {value: totalPriceInWei}))
            .to.be.revertedWith("Item doesn't exist")

            await expect(marketplace.connect(address2).purchaseItem(0, {value: totalPriceInWei}))
            .to.be.revertedWith("Item doesn't exist")
            //Fails when not enough eth is paid with transaction: send only price without fee
            await expect(marketplace.connect(address2).purchaseItem(1, {value: toWei(price)}))
            .to.be.revertedWith("Not enough ETH to cover item price and market fee")
            //Address 2 purchases item 1
            await marketplace.connect(address2).purchaseItem(1, {value: totalPriceInWei})
            //Deployer tries to purchase item 1 after it has been sold
            await expect(marketplace.connect(address1).purchaseItem(1, {value: totalPriceInWei}))
            .to.be.revertedWith("Item has already been sold")
        })
    })
    describe("Unlisting marketplace item", function(){
        beforeEach(async function(){
            //Address 1 mints an nft
            await nft.connect(address1).mint(URI)
            //Address 1 approves marketplace to spend nft
            await nft.connect(address1).setApprovalForAll(marketplace.address, true)

            //Address 1 lists their nft for 1 eth
            await expect(marketplace.connect(address1).listItem(nft.address, 1, toWei(1)))
            .to.emit(marketplace, "ItemListed")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(1),
                address1.address
            )
        })
        it("Owner should be able to unlist item, receive nft, and marketplace itemcount = 0", async function(){
            //Owner of nft should be marketplace
            expect(await nft.ownerOf(1)).to.equal(marketplace.address);
            //Address 1 unlists nft
            await expect(marketplace.connect(address1).unlistItem(1))
            .to.emit(marketplace, "ItemUnlisted")
            .withArgs(
                1,
                nft.address,
                1,
                address1.address
            )
            //Owner of nft should be address1
            expect(await nft.ownerOf(1)).to.equal(address1.address);
            //Item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true)
        })
        it("Should fail if tries to unlist item that doesnt exist", async function(){
            //Address 2 tries to unlist nft
            await expect(marketplace.connect(address1).unlistItem(2))
            .to.be.revertedWith("Item doesn't exist")
        })
        it("Should fail if different address tries to unlist item", async function(){
            //Address 2 tries to unlist nft
            await expect(marketplace.connect(address2).unlistItem(1))
            .to.be.revertedWith("You do not own this item")
        })
    })
})
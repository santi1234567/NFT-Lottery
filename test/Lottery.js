const { expect } = require("chai");

describe("Lottery Contract", () => {
    async function testSetup() {
        // Get the ContractFactory and Signers here.
        const Lottery = await ethers.getContractFactory("Lottery");
        const TestNFT = await ethers.getContractFactory("TestNFT");
        const MockVRF = await ethers.getContractFactory("VRFCoordinatorV2Mock");
        const [owner, addr1, addr2] = await ethers.getSigners();
    
        //Constants
        const vrfSubscriptionId = 1; 
        const baseFee = 100000;
        const gasPriceLink = 100000;

        // Deploy contracts
        const lotteryContract = await Lottery.deploy(vrfSubscriptionId);
        await lotteryContract.deployed();
        const nftContract = await TestNFT.deploy();
        await nftContract.deployed();
        const mockVRFContract = await MockVRF.deploy(baseFee,gasPriceLink);       
        await mockVRFContract.deployed();


        return { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 };
    }

    describe("Lottery Tests", () => {
        describe("Starting Lottery Tests", () => {
            it("Tries to start a lottery without approving NFT and fails", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
                ownerOfMinted = await nftContract.ownerOf(nftId);
                
                const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
                // Start lottery
                await expect(lotteryContract.startLottery(nftId, nftContract.address, bettingPrice, owner.address)).to.be.revertedWith(
                    "ERC721: caller is not token owner nor approved"
                );
        
            });

            it("Tries to start a lottery with ticket price = 0 and fails", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
                ownerOfMinted = await nftContract.ownerOf(nftId);

                 // Approve contract to be able to transfer the NFT
                 await nftContract.approve(lotteryContract.address, nftId);
       

                const bettingPrice = ethers.utils.parseEther("0"); // 0 ether

                // Ticket price = 0
                await expect(lotteryContract.startLottery(nftId, nftContract.address, bettingPrice, owner.address)).to.be.revertedWith(
                    "Betting price should be greater than zero."
                );   
        
            });
            
            it("Starts a lottery and NFT is transfered to lottery contract", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
        
                // Approve contract to be able to transfer the NFT
                await nftContract.approve(lotteryContract.address, nftId);
  
                // Start lottery
                const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
                await lotteryContract.startLottery(nftId, nftContract.address, bettingPrice, owner.address);
               
                ownerOfMinted = await nftContract.ownerOf(nftId);           
                await expect(ownerOfMinted).to.equal(lotteryContract.address);  
            });
        });

        describe("Buying Ticket Tests", () => {
            it("Successfully buys a ticket for a lottery", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
        
                // Approve contract to be able to transfer the NFT
                await nftContract.approve(lotteryContract.address, nftId);
                // Start lottery
                const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
                await lotteryContract.startLottery(nftId, nftContract.address, bettingPrice, owner.address);

                // Buy ticket
                //await lotteryContract.buyTicket();
                expect(true).to.equal(false);
        
                // TODO: Check if ticket is bought
            });
        
            it("Tries buying a ticket for a lottery without enough funds and fails", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
        
                // Approve contract to be able to transfer the NFT
                await nftContract.approve(lotteryContract.address, nftId);
                // Start lottery
                await lotteryContract.startLottery(nftId, nftContract.address);
        
                await owner.sendTransaction({
                    to: addr1.address,
                    value: ethers.utils.parseEther("9999.88"), // Depletes owner's ether
                });
        
        
                // Buy ticket
                //expect(lotteryContract.buyTicket()).to.be.revertedWith(
        //          "To participate, please fund the address with enough ether to buy the ticket."
                //);
                expect(true).to.equal(false);
        
            });   
        
            it("Buys tickets with different addresses and they are asigned correctly", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
        
                // Approve contract to be able to transfer the NFT
                await nftContract.approve(lotteryContract.address, nftId);
                // Start lottery
                await lotteryContract.startLottery(nftId, nftContract.address);
                
                // Buy ticket (owner)
                //await lotteryContract.buyTicket();
        
                // Buy ticket (addr1)
                //await lotteryContract.connect(addr1).buyTicket();
        
                // Buy ticket (addr2)
                //await lotteryContract.connect(addr2).buyTicket();
        
                
                // TODO: Check if tickets were bought correctly
                expect(true).to.equal(false);
        
            });   
        
        
            it("Buys multiple tickets and they are asigned correctly", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
        
                // Approve contract to be able to transfer the NFT
                await nftContract.approve(lotteryContract.address, nftId);
                // Start lottery
                await lotteryContract.startLottery(nftId, nftContract.address);
                
                // Buy tickets (owner)
                //await lotteryContract.buyTicket();
                //await lotteryContract.buyTicket();
                //await lotteryContract.buyTicket();
                //await lotteryContract.buyTicket();
                //await lotteryContract.buyTicket();
                
                // TODO: Check if tickets were bought correctly
                expect(true).to.equal(false);
        
            });   
        
            it("Tries to buy a ticket for a lottery that has already ended and fails", async () => {
                const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});
        
                // Mint an NFT
                await nftContract.safeMint();
                const nftId = 0;
        
                // Approve contract to be able to transfer the NFT
                await nftContract.approve(lotteryContract.address, nftId);
                // Start lottery
                await lotteryContract.startLottery(nftId, nftContract.address);
        
                // TODO: End lottery
        
        
                expect(true).to.equal(false);
                // Buy ticket
                //expect(lotteryContract.buyTicket()).to.be.revertedWith(
        //          "<ERROR MESSAGE>"
                //);
            });
        });
    


    });

});
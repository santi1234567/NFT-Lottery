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

    it("Tries to start a lottery without approving NFT and fails", async () => {
        const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});

        // Mint an NFT
        await nftContract.safeMint();
        const nftId = 0;
        ownerOfMinted = await nftContract.ownerOf(nftId);

        // Start lottery
        expect(lotteryContract.startLottery(nftId, nftContract.address)).to.be.revertedWith(
            "ERC721: caller is not token owner nor approved"
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
        await lotteryContract.startLottery(nftId, nftContract.address);


        ownerOfMinted = await nftContract.ownerOf(nftId);           
        expect(ownerOfMinted).to.equal(lotteryContract.address);  
    });

    it("Successfully buys a ticket for a lottery", async () => {
        const { lotteryContract, nftContract, mockVRFContract, owner, addr1, addr2 } = await testSetup({});

        // Mint an NFT
        await nftContract.safeMint();
        const nftId = 0;

        // Approve contract to be able to transfer the NFT
        await nftContract.approve(lotteryContract.address, nftId);
        // Start lottery
        await lotteryContract.startLottery(nftId, nftContract.address);
        
        // Buy ticket
        //await lotteryContract.buyTicket();

        // TODO: Check if ticket is bought
    });

    it("Tries buys a ticket for a lottery without enough funds and fails", async () => {
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
            value: ethers.utils.parseEther("9999.9"), // Depletes owner's ether
        });


        // Buy ticket
        //expect(lotteryContract.buyTicket()).to.be.revertedWith(
//          "To participate, please fund the address with enough ether to buy the ticket."
        //);

        // TODO: Check if ticket is bought
    });   

    });

});
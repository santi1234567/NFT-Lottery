const { expect } = require("chai");

describe("TestNFTHandler Contract", () => {
  const handlerSetup = async () => {
    const [nftHandlerOwner] = await ethers.getSigners();
    const TestNFTHandler = await ethers.getContractFactory("TestNFTHandler");
    const nftHandlerContract = await TestNFTHandler.deploy();

    return {
      nftHandlerOwner,
      nftHandlerContract
    };
  };

  const nftSetup = async () => {
    const [nftContractOwner, addr1] = await ethers.getSigners();
    const TestNFT = await ethers.getContractFactory("TestNFT");
    const nftContract = await TestNFT.deploy();

    return {
      nftContractOwner,
      nftContract,
      addr1
    };
  };

  describe("NFT handler functions", () => {

    it("Starts a lottery and NFT is transfered to lottery contract", async () => {
      const { nftContractOwner, nftContract, addr1 } = await nftSetup({});
      const { nftHandlerOwner, nftHandlerContract} = await handlerSetup({});

      await nftContract.safeMint();
      const nftId = 0;
      ownerOfMinted = await nftContract.ownerOf(nftId);
      await nftContract.approve(nftHandlerContract.address, nftId);
      await nftHandlerContract.startLottery(nftId, nftContract.address);

      ownerOfMinted = await nftContract.ownerOf(nftId);           
      expect(ownerOfMinted).to.equal(nftHandlerContract.address);  
    });

  });

});
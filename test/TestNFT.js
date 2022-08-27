const { expect } = require("chai");

describe("TestNFT Contract", () => {
  const setup = async () => {
    const [owner, addr1] = await ethers.getSigners();
    const TestNFT = await ethers.getContractFactory("TestNFT");
    const deployed = await TestNFT.deploy();

    return {
      owner,
      deployed,
      addr1
    };
  };


  describe("Minting", () => {
    it("Mints a new token and assigns it to owner", async () => {
      const { owner, deployed, addr1 } = await setup({});

      await deployed.safeMint();

      const ownerOfMinted = await deployed.ownerOf(0);

      expect(ownerOfMinted).to.equal(owner.address);
    });

    it("Mints a new token and assigns it to addr1 (not owner)", async () => {
      const { owner, deployed, addr1 } = await setup({});

      await deployed.connect(addr1).safeMint();

      const ownerOfMinted = await deployed.ownerOf(0);

      expect(ownerOfMinted).to.equal(addr1.address);
    });

    it("Mints a new token and transfers successfully to addr1", async () => {
      const { owner, deployed, addr1 } = await setup({});

      await deployed.safeMint();

      const ownerOfMinted = await deployed.ownerOf(0);

      expect(ownerOfMinted).to.equal(owner.address);
      await deployed["safeTransferFrom(address,address,uint256)"](owner.address,addr1.address,0);

      const ownerOfTransfered = await deployed.ownerOf(0);

      expect(ownerOfTransfered).to.equal(addr1.address);
    });

  });

});
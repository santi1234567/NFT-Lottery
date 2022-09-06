const { ethers } = require("hardhat");

// Goerli Constants
const VRF_COORDINATOR_V2 = "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D";
const VRF_GAS_LANE = "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15";
const VRF_CALLBACK_GAS_LIMIT = 1000000;
const VRF_SUBSCRIPTION_ID = 1072;
const NFT_CONTRACT_ADDRESS = "0x2a2B44eafEB51276aFaBe1F9FAc2f7bbF3e443B1";
async function main() {
    const [deployer, owner] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const contract = await ethers.getContractFactory("Lottery");
    const deployed = await contract.deploy(VRF_COORDINATOR_V2, VRF_SUBSCRIPTION_ID, VRF_GAS_LANE, VRF_CALLBACK_GAS_LIMIT);
  
    console.log("Contract address:", deployed.address, `Etherscan URL: https://goerli.etherscan.io/address/${deployed.address}`);

    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS) 
    let tx = await nftContract.safeMint();
    let { events } = await tx.wait();
    let transferEvent = events?.find((e) => e.event === "Transfer");
    let tokenId = transferEvent?.args?.tokenId;

    await deployed.startLottery(tokenId, nftContract.address, ethers.utils.parseEther("0.01"), owner.address, (await ethers.provider.getBlock(blockNumber)).timestamp + 1000);
    
    tx = await nftContract.safeMint();
    let { events2 } = await tx.wait();
    transferEvent = events2?.find((e) => e.event === "Transfer");
    tokenId = transferEvent?.args?.tokenId;

    await deployed.startLottery(tokenId, nftContract.address, ethers.utils.parseEther("0.01"), owner.address, (await ethers.provider.getBlock(blockNumber)).timestamp + 2000);

    tx = await nftContract.safeMint();
    let { events3 } = await tx.wait();
    transferEvent = events3?.find((e) => e.event === "Transfer");
    tokenId = transferEvent?.args?.tokenId;

    await deployed.startLottery(tokenId, nftContract.address, ethers.utils.parseEther("0.01"), owner.address, (await ethers.provider.getBlock(blockNumber)).timestamp + 518400);
  }
  
// 0000000000000000000000000000000000000000000000000000000000000001

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
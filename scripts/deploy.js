async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
    const vrfSubscriptionId = 1
    const contract = await ethers.getContractFactory("Lottery");
    const deployed = await contract.deploy(vrfSubscriptionId);
  
    console.log("Contract address:", deployed.address, `Etherscan URL: https://goerli.etherscan.io/address/${deployed.address}`);
  }
  
// 0000000000000000000000000000000000000000000000000000000000000001

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
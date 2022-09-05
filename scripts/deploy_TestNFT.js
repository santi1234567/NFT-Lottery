async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const contract = await ethers.getContractFactory("TestNFT");
    const deployed = await contract.deploy();
  
    console.log("Contract address:", deployed.address, `Etherscan URL: https://goerli.etherscan.io/address/${deployed.address}`);
  }
  

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
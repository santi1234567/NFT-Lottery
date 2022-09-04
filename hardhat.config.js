require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config()
require("@nomiclabs/hardhat-etherscan");

const projectId = process.env.INFURA_PROJECT_ID
const privateKey = process.env.DEPLOYER_SIGNER_PRIVATE_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${projectId}`,
      accounts: [
        privateKey
      ]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${projectId}`,
      accounts: [
        privateKey
      ]
    }
    
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY
    }
  }
};

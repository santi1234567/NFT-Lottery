// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "hardhat/console.sol";


contract Lottery is Ownable, VRFConsumerBaseV2, IERC721Receiver {
    using Counters for Counters.Counter;
    VRFCoordinatorV2Interface COORDINATOR;

    //VRF Variables
    //s_subscriptionId is the Id into Chainlink VRF. Associated to a Metamask account
    uint64 s_subscriptionId;
    //Goerli values
    address vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D;
    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    //numWords = number of random numbers generated. Goes into array s_randomWords
    uint32 numWords =  2;
    uint256[] public s_randomWords;
    uint256 public s_requestId;


   //lottery variables
    address payable[] public players;
    uint lotteryPrice;
    uint lotteryBalance;
    address currentWinner;
    uint lotteryId;
    Counters.Counter private _lotteryCounter;

    //All the lotteries
    mapping (uint => address) lotteryHistory;

    struct NFTLotteryPrize {
        address nftContractAddress;
        uint256 tokenId;
    }

    constructor(uint64 subscriptionId) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;

        lotteryBalance = 0 ether;
        lotteryPrice = 0.1 ether;
    }

    //Events
    event BuyTicket (
        address player,
        uint lotteryBalance 
    );

    event PickTheWinner (
        address currentWinner,
        uint awardBalance
    );


    // Funtion override to allow contract to recieve NFTs
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns(bytes4) {
        return this.onERC721Received.selector;
    }


    //VRF funtions
    //We need funds (LINK) into the  s_subscriptionId -> revert
    function requestRandomWords() external onlyOwner {
        s_requestId = COORDINATOR.requestRandomWords(
        keyHash,
        s_subscriptionId,
        requestConfirmations,
        callbackGasLimit,
        numWords
    );
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
    }

    //Función buy ticket
    //Now -> msg.value = VALUE in Remix
    //onClick from the Front msg.value = 0.1 ether
    //We have to set different times for both function:
    //1st - requestRandomWords() it takes like a 30 minutes to deliver de numer
    //2nd - buyTicket() 
    function buyTicket() public payable {
        require(msg.value == lotteryPrice, "To participate, please fund the address with enough ether to buy the ticket.");
        players.push(payable(msg.sender));
        lotteryBalance = lotteryBalance + lotteryPrice;

        emit BuyTicket(msg.sender, lotteryBalance);
    }

    //Función pick the winner:
    //Receives the number of ChainLink, s_randomWords[0], and adapts to number of players
    //0 =<  winner number =< number of players
    function pickTheWinner() public onlyOwner {
        uint index = s_randomWords[0] % players.length;
        console.log (index);
        currentWinner = players[index];

        //Transfer 80% of lotteryBalance to the winner and reset.
        uint awardBalance = (lotteryBalance * 80) / 100;
        (bool success, ) = payable(players[index]).call{value: awardBalance}("");
        require(success, "failed");

        emit PickTheWinner(players[index], awardBalance);

        lotteryBalance = 0 ether;
        players = new address payable[](0);


        //NFTLotteryPrize memory prize = PREMIO

        // Interface for interacting with the nftContract:
        //IERC721 nftContract = IERC721(prize.nftContractAddress);

        // Transfer NFT from this contract to the winner
        //nftContract.safeTransferFrom(address(this), players[index], prize.tokenId);
    }


    // Starts a Lottery. User should have already given access to the contract to allow the transfer of the NFT
    // Recieves the NFT Id and the contract of the NFT.
    function startLottery(uint256 _tokenId, address _nftContractAddress) public returns (bytes4){
        IERC721 nftContract = IERC721(_nftContractAddress);
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        // Initialize the lottery over here
        // prize = NFTLotteryPrize(_nftContractAddress, _tokenId);
        // lotteryId = _lotteryCounter.current();

        //
        _lotteryCounter.increment();

        // Return value to allow the ERC721 openzeppelin implementation to fulfill the NFT transaction.
        return this.onERC721Received.selector;
    }

    //GET FUNCTIONS:
    //Contract balance:
    function getContractBalance() public view returns(uint){
    return address(this).balance;
    }

    //Current lottery balance:
    function getLotteryBalance() public view returns(uint) {
        return lotteryBalance;
    }

    //Current winner:
    function getCurrentWinner() public view returns(address) {
        return currentWinner;
    }

    //Lottery History:
    function getHistoryWinner(uint _lotteryId) public view returns(address) {
        return lotteryHistory[_lotteryId];
    }

}
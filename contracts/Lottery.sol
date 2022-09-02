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


    constructor(uint64 subscriptionId) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
    }

    Counters.Counter lotteryId;

    struct singleLottery {
        address nftOwner;
        uint nftTokenId;
        address nftContractAddress;
        uint bettingPrice;
        bool activeLottery;
        address[] players;
        uint lotteryBalance;
        address beneficiaryAddress;
        address lotteryWinner;
        uint startDate;
    }

    event SingleLottery (
        address nftOwner,
        uint nftTokenId,
        address nftContractAddress,
        uint bettingPrice,
        bool activeLottery,
        address beneficiaryAddress,
        uint startDate
    );

    event BuyTicket (
        address player,
        uint lotteryBalance
    );

    event PickTheWinner (
        address currentWinner,
        bool activeLottery,
        address nftContractAddress,
        uint awardBalance
    );

    mapping(uint => singleLottery) historicLottery;

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

    //Start lottery function.
    //Creates an instance from singleLottery
    function startLottery (uint _tokenId, address _nftContractAddress, uint _bettingPrice, address _beneficiaryAddress) public returns (bytes4) {
        require(_bettingPrice > 0, "Betting price should be greater than zero.");
        IERC721 nftContract = IERC721(_nftContractAddress);
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        singleLottery storage newLottery = historicLottery[lotteryId.current()];
        newLottery.nftOwner = msg.sender;
        newLottery.nftTokenId = _tokenId;
        newLottery.nftContractAddress = _nftContractAddress;
        newLottery.bettingPrice = _bettingPrice;
        newLottery.activeLottery = true;
        newLottery.lotteryBalance = 0;
        newLottery.beneficiaryAddress = _beneficiaryAddress;
        newLottery.startDate = block.timestamp;

        emit SingleLottery (msg.sender, _tokenId, _nftContractAddress, _bettingPrice, true, _beneficiaryAddress, block.timestamp);

        lotteryId.increment();

        return this.onERC721Received.selector;
    }


    //Buy a ticket for an especific NFT lottery
    function buyTicket(uint _lotteryId) public payable {
        require(_lotteryId < lotteryId.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        require(l.activeLottery, "The lottery Id given corresponds to a lottery that has already ended.");      
        require(msg.value == l.bettingPrice, "To participate, please fund the address with enough ether to buy the ticket.");
        l.players.push(payable(msg.sender));
        l.lotteryBalance = l.lotteryBalance + l.bettingPrice;

        emit BuyTicket(msg.sender, l.lotteryBalance);
    }

    //Función pick the winner:
    //Receives the number of ChainLink, s_randomWords[0], and adapts to number of players
    //0 =<  winner number =< number of players
    function pickTheWinner(uint _lotteryId) public {
        require(_lotteryId < lotteryId.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        require(l.activeLottery, "The lottery Id given corresponds to a lottery that has already ended.");      
        uint index = s_randomWords[0] % l.players.length;
        l.lotteryWinner = l.players[index];

        //Transfer 80% of lotteryBalance to the winner and reset.
        uint awardBalance = (l.lotteryBalance * 80) / 100;
        (bool success, ) = payable(l.lotteryWinner).call{value: awardBalance}("");
        require(success, "failed");

        //TRANSFER THE NFT FROM CONTRACT TO WINNER:
        IERC721 nftContract = IERC721(l.nftContractAddress);
        nftContract.safeTransferFrom(address(this), l.lotteryWinner, l.nftTokenId);


        l.activeLottery = false;
        l.lotteryBalance = 0 ether;

        emit PickTheWinner(l.lotteryWinner, l.activeLottery, l.nftContractAddress, awardBalance);

    }


        //NFTLotteryPrize memory prize = PREMIO

        // Interface for interacting with the nftContract:
        //IERC721 nftContract = IERC721(prize.nftContractAddress);

        // Transfer NFT from this contract to the winner
        //nftContract.safeTransferFrom(address(this), players[index], prize.tokenId);
    ///}


    // Starts a Lottery. User should have already given access to the contract to allow the transfer of the NFT
    // Recieves the NFT Id and the contract of the NFT.
    ///function startLottery(uint256 _tokenId, address _nftContractAddress) public returns (bytes4){
        ///IERC721 nftContract = IERC721(_nftContractAddress);
        ///nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        // Initialize the lottery over here
        // prize = NFTLotteryPrize(_nftContractAddress, _tokenId);
        // lotteryId = _lotteryCounter.current();

        //
        ///_lotteryCounter.increment();

        // Return value to allow the ERC721 openzeppelin implementation to fulfill the NFT transaction.
        ///return this.onERC721Received.selector;
   /// }


    //GET FUNCTIONS:

    //Each lottery info
    function getLottery (uint _lotteryId) public view returns (address, address, uint, bool, address[] memory, uint, address, uint) {
        require(_lotteryId < lotteryId.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        return (l.nftOwner, l.nftContractAddress, l.bettingPrice, l.activeLottery, l.players, l.lotteryBalance, l.lotteryWinner, l.startDate);
    }

    //Contract Balance
    function getContractBalance() public view returns(uint){
    return address(this).balance;
    }

}
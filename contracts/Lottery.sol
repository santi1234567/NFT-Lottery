// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

import "hardhat/console.sol";


contract Lottery is 
    Ownable, 
    VRFConsumerBaseV2, 
    IERC721Receiver, 
    KeeperCompatibleInterface 
{

    // Contract fee %
    uint256 public constant CONTRACT_FEE = 5;

    // Counters

    using Counters for Counters.Counter;

    // 

    bool public s_pendingLotteryEnd;
    uint256[] public s_randomWords;

    // VRF CONSTANTS & IMMUTABLE

    uint16 private constant VRF_REQUEST_CONFIRMATIONS = 3;
    uint32 private constant VRF_NUM_WORDS = 1;

    VRFCoordinatorV2Interface private immutable VRF_COORDINATOR_V2;
    uint64 private immutable VRF_SUBSCRIPTION_ID;
    bytes32 private immutable VRF_GAS_LANE;
    uint32 private immutable VRF_CALLBACK_GAS_LIMIT;

    // Events

    event PendingLotteriesWordsRequested(uint256 requestId);
    event EndLotteryEvent(uint256 lotteryId);


    constructor(
        address _vrfCoordinatorV2,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfGasLane,
        uint32 _vrfCallbackGasLimit
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        VRF_COORDINATOR_V2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        VRF_SUBSCRIPTION_ID = _vrfSubscriptionId;
        VRF_GAS_LANE = _vrfGasLane;
        VRF_CALLBACK_GAS_LIMIT = _vrfCallbackGasLimit;
    }

    Counters.Counter lotteryIdCounter;

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
        uint endDate;
    }

    event SingleLottery (
        address nftOwner,
        uint nftTokenId,
        address nftContractAddress,
        uint bettingPrice,
        bool activeLottery,
        address beneficiaryAddress,
        uint endDate
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
    /* function requestRandomWords() external onlyOwner {
        s_requestId = COORDINATOR.requestRandomWords(
        keyHash,
        s_subscriptionId,
        requestConfirmations,
        callbackGasLimit,
        numWords
    );
    }*/

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_pendingLotteryEnd = false;
        for (uint256 i = 0; i < lotteryIdCounter.current(); i++) {
            if(_canEndLottery(i)){
                _endLottery(i, 
                    uint256(
                        keccak256(
                            abi.encode(
                                randomWords[0], 
                                historicLottery[i].nftTokenId, 
                                historicLottery[i].nftContractAddress)
                        )
                    ) % historicLottery[i].players.length
                );
            }
        }
    }

    //Start lottery function.
    //Creates an instance from singleLottery
    function startLottery (uint _tokenId, address _nftContractAddress, uint _bettingPrice, address _beneficiaryAddress, uint256 _endDate) public returns (bytes4) {
        require(_bettingPrice > 0, "Betting price should be greater than zero.");
        require(_endDate > block.timestamp, "End date should be later than the current timestamp");
        IERC721 nftContract = IERC721(_nftContractAddress);
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        singleLottery storage newLottery = historicLottery[lotteryIdCounter.current()];
        newLottery.nftOwner = msg.sender;
        newLottery.nftTokenId = _tokenId;
        newLottery.nftContractAddress = _nftContractAddress;
        newLottery.bettingPrice = _bettingPrice;
        newLottery.activeLottery = true;
        newLottery.lotteryBalance = 0;
        newLottery.beneficiaryAddress = _beneficiaryAddress;
        newLottery.endDate = _endDate;

        emit SingleLottery (msg.sender, _tokenId, _nftContractAddress, _bettingPrice, true, _beneficiaryAddress, _endDate);

        lotteryIdCounter.increment();

        return this.onERC721Received.selector;
    }

    //Buy a ticket for an especific NFT lottery
    function buyTicket(uint _lotteryId) public payable {
        require(_lotteryId < lotteryIdCounter.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        require(l.activeLottery, "The lottery Id given corresponds to a lottery that has already ended.");      
        require(msg.value == l.bettingPrice,  "To participate, please add the required amount.");      
        l.players.push(payable(msg.sender));
        l.lotteryBalance = l.lotteryBalance + l.bettingPrice;

        emit BuyTicket(msg.sender, l.lotteryBalance);
    }

    // End Lottery

    function _endLottery(uint _lotteryId, uint _winnerIndex) internal {
        require(_lotteryId < lotteryIdCounter.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        require(l.activeLottery, "The lottery Id given corresponds to a lottery that has already ended.");     
        l.lotteryWinner = l.players[_winnerIndex];

        //Transfer % of lotteryBalance to the winner and reset.
        uint awardBalance = (l.lotteryBalance * (100-CONTRACT_FEE)) / 100;
        (bool success, ) = payable(l.beneficiaryAddress).call{value: awardBalance}("");
        require(success, "Transaction Failed");

        l.activeLottery = false;
        l.lotteryBalance = 0 ether;

        emit EndLotteryEvent(_lotteryId);

        //TRANSFER THE NFT FROM CONTRACT TO WINNER:
        IERC721 nftContract = IERC721(l.nftContractAddress);
        nftContract.safeTransferFrom(address(this), l.lotteryWinner, l.nftTokenId);
    }

    function _canEndLottery(uint256 _lotteryId) internal view returns (bool) {
        if (s_pendingLotteryEnd) {
            return false;
        }
        if (!historicLottery[_lotteryId].activeLottery) {
            return false;
        }
        if (historicLottery[_lotteryId].endDate > block.timestamp) {
            return false;
        }
        return true;
    }

    function requestWordsPendingLotteries() public returns (uint256 s_requestId) {
        /*
        VER SI HACE FALTA VERIFICAR ALGO ACA
*/
        s_requestId = VRF_COORDINATOR_V2.requestRandomWords(
            VRF_GAS_LANE,
            VRF_SUBSCRIPTION_ID,
            VRF_REQUEST_CONFIRMATIONS,
            VRF_CALLBACK_GAS_LIMIT,
            VRF_NUM_WORDS
        );
        s_pendingLotteryEnd = true;
        emit PendingLotteriesWordsRequested(s_requestId);
    }


    // KEEPERS

    function checkUpkeep(bytes calldata checkdata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        for (uint256 i = 0; i < lotteryIdCounter.current(); i++) {
            if(_canEndLottery(i)){
                upkeepNeeded = true;
                break;
            }
        }     
        performData = checkdata;
    }

    function performUpkeep(bytes calldata) external override {
        requestWordsPendingLotteries();
    }

    //GET FUNCTIONS:

    //Each lottery info
    function getLottery (uint _lotteryId) public view returns (address, address, uint, bool, address[] memory, uint, address, uint, address) {
        require(_lotteryId < lotteryIdCounter.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        return (l.nftOwner, l.nftContractAddress, l.bettingPrice, l.activeLottery, l.players, l.lotteryBalance, l.lotteryWinner, l.endDate, l.beneficiaryAddress);
    }

    //Contract Balance
    function getContractBalance() public view returns(uint){
    return address(this).balance;
    }

}
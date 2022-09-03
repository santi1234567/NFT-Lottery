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

    using Counters for Counters.Counter;
    bool private s_pendingLotteryEnd;

    //VRF Variables
    VRFCoordinatorV2Interface COORDINATOR;
    //s_subscriptionId is the Id into Chainlink VRF. Associated to a Metamask account
    uint64 private immutable s_subscriptionId;
    //Goerli values
    address private constant vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D;
    bytes32 private constant keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;
    uint32 private constant callbackGasLimit = 100000;
    uint16 private constant requestConfirmations = 3;
    uint32 private constant numWords = 1;


    uint256[] public s_randomWords;


    constructor(uint64 subscriptionId) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
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
        for (uint256 i = 0; i < lotteryIdCounter.current(); i++) {
            if(_canEndLottery(i)){
                endLottery(i, 
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
        s_pendingLotteryEnd = true;
    }

    //Start lottery function.
    //Creates an instance from singleLottery
    function startLottery (uint _tokenId, address _nftContractAddress, uint _bettingPrice, address _beneficiaryAddress) public returns (bytes4) {
        require(_bettingPrice > 0, "Betting price should be greater than zero.");
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
        newLottery.startDate = block.timestamp;

        emit SingleLottery (msg.sender, _tokenId, _nftContractAddress, _bettingPrice, true, _beneficiaryAddress, block.timestamp);

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

    function endLottery(uint _lotteryId, uint _winnerIndex) public {
        require(_lotteryId < lotteryIdCounter.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        require(l.activeLottery, "The lottery Id given corresponds to a lottery that has already ended.");      
        l.lotteryWinner = l.players[_winnerIndex];

        //Transfer 80% of lotteryBalance to the winner and reset.
        uint awardBalance = (l.lotteryBalance * 80) / 100;
        (bool success, ) = payable(l.lotteryWinner).call{value: awardBalance}("");
        require(success, "Transaction Failed");

        //TRANSFER THE NFT FROM CONTRACT TO WINNER:
        IERC721 nftContract = IERC721(l.nftContractAddress);
        nftContract.safeTransferFrom(address(this), l.lotteryWinner, l.nftTokenId);


        l.activeLottery = false;
        l.lotteryBalance = 0 ether;

        // emitir evento emit endLotteryEvent(l.lotteryWinner, l.activeLottery, l.nftContractAddress, awardBalance);

    }

    function _canEndLottery(uint256 _lotteryId) internal view returns (bool) {
        if (s_pendingLotteryEnd) {
            return false;
        }
        if (!historicLottery[_lotteryId].activeLottery) {
            return false;
        }
        if (historicLottery[_lotteryId].startDate /*+ tiempo de lotería*/ < block.timestamp) {
            return false;
        }
        return true;
    }

    function requestWordsPendingLotteries() public returns (uint256 s_requestId) {
        /*
        VER SI HACE FALTA VERIFICAR ALGO ACA
*/
        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
       );
        s_pendingLotteryEnd = true;
        // Emitir evento? emit BatchRevealRequested(requestId);
    }


    // KEEPERS

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory)
    {
        for (uint256 i = 0; i < lotteryIdCounter.current(); i++) {
            if(_canEndLottery(i)){
                upkeepNeeded = true;
                break;
            }
        }     
    }

    function performUpkeep(bytes calldata) external override {
        requestWordsPendingLotteries();
    }

    //GET FUNCTIONS:

    //Each lottery info
    function getLottery (uint _lotteryId) public view returns (address, address, uint, bool, address[] memory, uint, address, uint) {
        require(_lotteryId < lotteryIdCounter.current(), "The lottery Id given does not correspond to an existing lottery.");
        singleLottery storage l = historicLottery[_lotteryId];
        return (l.nftOwner, l.nftContractAddress, l.bettingPrice, l.activeLottery, l.players, l.lotteryBalance, l.lotteryWinner, l.startDate);
    }

    //Contract Balance
    function getContractBalance() public view returns(uint){
    return address(this).balance;
    }

}
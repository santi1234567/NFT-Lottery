// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";


contract LotteryMultiple is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter lotteryId;
    //hardcode random number:
    uint s_randomWords = 38377316539602841632738706329492984698895419023557132988915043852423268044882;

    struct singleLottery {

        address nftOwner;
        uint nftTokenId;
        address nftContractAddress;
        uint bettingPrice;
        bool activeLottery;
        address[] players;
        uint lotteryBalance;
    }

    event SingleLottery (
        address nftOwner,
        uint nftTokenId,
        address nftContractAddress,
        uint bettingPrice,
        bool activeLottery
    );

    event BuyTicket (
        address player,
        uint lotteryBalance 
    );

    event PickTheWinner (
        address currentWinner,
        uint awardBalance
    );

    mapping(uint => singleLottery) historicLottery;


    function startLottery (uint _tokenId, address _nftContractAddress, uint _bettingPrice) public {
        //IERC721 nftContract = IERC721(_nftContractAddress);
        //nft.Contract.safeTransferFrom(msg.sender, address(this), tokenId);
        singleLottery storage newLottery = historicLottery[lotteryId.current()];
        newLottery.nftOwner = msg.sender;
        newLottery.nftTokenId = _tokenId;
        newLottery.nftContractAddress = _nftContractAddress;
        newLottery.bettingPrice = _bettingPrice;
        newLottery.activeLottery = true;
        newLottery.lotteryBalance = 0;

        emit SingleLottery (msg.sender, _tokenId, _nftContractAddress, _bettingPrice, true);

        lotteryId.increment();

    }

    function buyTicket(uint _lotteryId) public payable {
        singleLottery storage l = historicLottery[_lotteryId];
        require(msg.value == l.bettingPrice, "To participate, please add the require amount.");
        l.players.push(payable(msg.sender));
        l.lotteryBalance = l.lotteryBalance + l.bettingPrice;

        emit BuyTicket(msg.sender, l.lotteryBalance);
    }


    function pickTheWinner(uint _lotteryId) public {
        singleLottery storage l = historicLottery[_lotteryId];
        uint index = s_randomWords % l.players.length;
        //address currentWinner = l.players[index];

        //Transfer 80% of lotteryBalance to the winner and reset.
        uint awardBalance = (l.lotteryBalance * 80) / 100;
        (bool success, ) = payable(l.players[index]).call{value: awardBalance}("");
        require(success, "failed");

        l.activeLottery = false;

        emit PickTheWinner(l.players[index], awardBalance);

    }



    function getLottery (uint _lotteryId) public view returns (address, address, uint, bool, address[] memory, uint) {
        singleLottery storage l = historicLottery[_lotteryId];
        return (l.nftOwner, l.nftContractAddress, l.bettingPrice, l.activeLottery, l.players, l.lotteryBalance);
    }


}
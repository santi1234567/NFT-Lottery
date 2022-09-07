// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract TestNFTHandler is IERC721Receiver {
    using Counters for Counters.Counter;

    struct NFTLotteryPrize {
        address nftContractAddress;
        uint256 tokenId;
    }
    mapping (uint256 => NFTLotteryPrize) prizes;
    Counters.Counter private _lotteryCounter;

    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns(bytes4) {
        return this.onERC721Received.selector;
    }


    function startLottery(uint256 _tokenId, address _nftContractAddress) public returns (bytes4){
        IERC721 nftContract = IERC721(_nftContractAddress);
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        prizes[_lotteryCounter.current()] = NFTLotteryPrize(_nftContractAddress, _tokenId);
        _lotteryCounter.increment();
        return this.onERC721Received.selector;
    }

    function endLottery(uint256 _lotteryId, address _winner) public {
        require(_lotteryId <= _lotteryCounter.current(), "Lottery must exist");
        NFTLotteryPrize memory prize = prizes[_lotteryId];
        IERC721 nftContract = IERC721(prize.nftContractAddress);
        nftContract.safeTransferFrom(address(this), _winner, prize.tokenId);
    }    
}

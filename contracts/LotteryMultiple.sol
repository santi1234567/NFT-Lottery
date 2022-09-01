//Contrato desplegado en Goerli en la address: 0x7822146D314913FA4E67a09F632383a5b15E42ec
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

    //Existen 2 tipos de usuarios: Los que ponen su NFT para sorteo y los que compran tickets.
    //La funcion startLottery() crea una instancia de este struct.
    //Sirve para que un usuario ponga su NFT a sortear.
    //nftOwner (el dueño del NFT), nftTokenId/ nftContractAddress(datos del NFT), bettingPrice(precio de cada apuesta)
    //activeLottery(true/false), players(address de los que han comprado tickets de esta loteria)
    //lotteryBalance(balance actual de esta loteria), beneficiaryAddress(en caso que la ganacia del sorteo sea para una asociación
    //benefica diferente a la del nftOwner), lotteryWinner(ganador del sorteo que se obtiene tras ejecutar pickTheWinner())
    //startDate(fecha en la que el nftOwner da de alta el sorteo en formato unix, p.e., 1661985314)
    //Queda pendiente el endDate, si es necesario o se hace con un Chanlink Keepers
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
        uint awardBalance
    );

    //mapping para crear un historioco de loterías. Asigna un id(lotteryId) a cada instancia de singleLottery
    mapping(uint => singleLottery) historicLottery;


    //Esta funcion es llamada desde el front para crear cada sorteo.
    //Recibe parametros para crear una instancia de singleLottery.
    //Guarda en la blockchain cada sorteo.
    //Falta por incluir el traspaso del NFT al contrato. 
    //Event/emit SingleLottery para mostrar la info de cada sorteo en el front.
    //NOTA: bettingPrice está en weis, o sea, para que el ticket cueste 1 ether sería 1x10**8
    function startLottery (uint _tokenId, address _nftContractAddress, uint _bettingPrice, address _beneficiaryAddress) public {
        //IERC721 nftContract = IERC721(_nftContractAddress);
        //nft.Contract.safeTransferFrom(msg.sender, address(this), tokenId);
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

    }

    //Esta funcion es llamada desde el front por los usuario para comprar tickets.
    //Recibe como parámetro el lotteryId del sorteo.
    //Añade el bettingPrice al lotteryBalance y al contractBalance.
    //Event/emit para el front con los datos del usuario que compra el ticket y el lotteryBalance tras la apuesta.
    //NOTA 2: Aqui el bettingPrice lo pone en ethers, para comprar un ticket basta con poner, p.e., 1 ether.
    function buyTicket(uint _lotteryId) public payable {
        singleLottery storage l = historicLottery[_lotteryId];
        require(msg.value == l.bettingPrice, "To participate, please add the require amount.");
        l.players.push(payable(msg.sender));
        l.lotteryBalance = l.lotteryBalance + l.bettingPrice;

        emit BuyTicket(msg.sender, l.lotteryBalance);
    }

    //Esta funcion la ejecuta Chainlink, No el front.
    //En este script falta por incluir el numero random y se usa uno hardcodeado para que la explicacion para
    //el front este mas clara.
    //Tampoco se incluye el traspaso del NFT tras el sorteo.
    //Event/emit para el front con el ganador, la loteria pasa a false y el premio en eth.
    function pickTheWinner(uint _lotteryId) public {
        singleLottery storage l = historicLottery[_lotteryId];
        uint index = s_randomWords % l.players.length;
        l.lotteryWinner = l.players[index];

        //Transfer 80% of lotteryBalance to the winner and reset.
        uint awardBalance = (l.lotteryBalance * 80) / 100;
        (bool success, ) = payable(l.lotteryWinner).call{value: awardBalance}("");
        require(success, "failed");

        l.activeLottery = false;
        l.lotteryBalance = 0 ether;

        emit PickTheWinner(l.lotteryWinner, l.activeLottery, awardBalance);

    }

    //funcion para ver la informacion de cada sorteo generado.
    function getLottery (uint _lotteryId) public view returns (address, address, uint, bool, address[] memory, uint, address, uint) {
        singleLottery storage l = historicLottery[_lotteryId];
        return (l.nftOwner, l.nftContractAddress, l.bettingPrice, l.activeLottery, l.players, l.lotteryBalance, l.lotteryWinner, l.startDate);
    }

    //funcion para ver el balance del contrato. 
    //Se traspasa un % del premio al ganador, quedando el resto en el contrato.
    function getContractBalance() public view returns(uint){
    return address(this).balance;
    }

}
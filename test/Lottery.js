const { expect } = require("chai");
const { ethers } = require("hardhat");

let DEFAULT_LOTTERY_TIME = 2000; // seconds
const VRF_GAS_LANE =
	"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";
const VRF_CALLBACK_GAS_LIMIT = 1000000;
const BASE_FEE = 100000;
const GAS_PRICE_LINK = 100000;

async function endPendingLotteries(Lottery, VRFCoordinatorV2Mock) {
	const tx = await Lottery.requestWordsPendingLotteries();
	const { events } = await tx.wait();
	const requestEvent = events?.find(
		(e) => e.event === "PendingLotteriesWordsRequested"
	);
	const requestId = requestEvent?.args?.requestId;

	return VRFCoordinatorV2Mock.fulfillRandomWords(requestId, Lottery.address);
}

describe("Lottery Contract", () => {
	async function testSetup() {
		// Get the ContractFactory and Signers here.
		const Lottery = await ethers.getContractFactory("Lottery");
		const TestNFT = await ethers.getContractFactory("TestNFT");
		const MockVRF = await ethers.getContractFactory("VRFCoordinatorV2Mock");
		const [owner, addr1, addr2, addr3] = await ethers.getSigners();

		// Deploy contracts
		const nftContract = await TestNFT.deploy();
		await nftContract.deployed();
		const vrfCoordinatorV2Mock = await MockVRF.deploy(BASE_FEE, GAS_PRICE_LINK);
		await vrfCoordinatorV2Mock.deployed();
		// Get VRF sub Id
		const tx = await vrfCoordinatorV2Mock.createSubscription();
		const txReceipt = await tx.wait(1);
		subscriptionId = txReceipt.events[0].args.subId;
		// Fund sub with Link
		await vrfCoordinatorV2Mock.fundSubscription(
			subscriptionId,
			ethers.utils.parseEther("1")
		);

		const lotteryContract = await Lottery.deploy(
			vrfCoordinatorV2Mock.address,
			subscriptionId,
			VRF_GAS_LANE,
			VRF_CALLBACK_GAS_LIMIT
		);
		await lotteryContract.deployed();

		return {
			lotteryContract,
			nftContract,
			vrfCoordinatorV2Mock,
			owner,
			addr1,
			addr2,
			addr3,
		};
	}

	describe("Lottery Tests", () => {
		describe("Starting Lottery Tests", () => {
			it("Tries to start a lottery without approving NFT and fails", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;
				ownerOfMinted = await nftContract.ownerOf(nftId);
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				// Start lottery
				await expect(
					lotteryContract.startLottery(
						nftId,
						nftContract.address,
						bettingPrice,
						owner.address,
						endTime
					)
				).to.be.revertedWith("ERC721: caller is not token owner nor approved");
			});

			it("Tries to start a lottery with ticket price = 0 and fails", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;
				ownerOfMinted = await nftContract.ownerOf(nftId);

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;

				const bettingPrice = ethers.utils.parseEther("0"); // 0 ether

				// Ticket price = 0
				await expect(
					lotteryContract.startLottery(
						nftId,
						nftContract.address,
						bettingPrice,
						owner.address,
						endTime
					)
				).to.be.revertedWith("Betting price should be greater than zero.");
			});

			it("Tries to start a lottery with timestamp lower than actual", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;
				ownerOfMinted = await nftContract.ownerOf(nftId);

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp - lotteryTime;

				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether

				// Ticket price = 0.1
				await expect(
					lotteryContract.startLottery(
						nftId,
						nftContract.address,
						bettingPrice,
						owner.address,
						endTime
					)
				).to.be.revertedWith(
					"End date should be later than the current timestamp"
				);
			});

			it("Starts a lottery successfully", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);

				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				const tx = await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					owner.address,
					endTime
				);
				const lotteryId = 0;
				const timestamp = (await ethers.provider.getBlock(tx.blockNumber))
					.timestamp;
				ownerOfMinted = await nftContract.ownerOf(nftId);
				await expect(ownerOfMinted).to.equal(lotteryContract.address);

				const lottery = await lotteryContract.getLottery(lotteryId);
				await expect(lottery.slice(0, lottery.length)).to.eql([
					owner.address,
					nftContract.address,
					bettingPrice,
					true,
					[],
					ethers.utils.parseEther("0"),
					owner.address,
					ethers.constants.AddressZero,
					ethers.BigNumber.from(endTime),
					ethers.BigNumber.from(nftId),
				]);
			});
		});

		describe("Buying Ticket Tests", () => {
			it("Successfully buys a ticket for a lottery", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					owner.address,
					endTime
				);
				const lotteryId = 0;
				// Buy ticket
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });
				[, , , , players, lotteryBalance, , ,] =
					await lotteryContract.getLottery(lotteryId);
				expect(players).to.eql([owner.address]);
				expect(
					await ethers.provider.getBalance(lotteryContract.address)
				).to.equal(bettingPrice);
				expect(lotteryBalance).to.equal(bettingPrice);
			});

			it("Tries buying a ticket for a lottery with incorrect ticket price value", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					owner.address,
					endTime
				);
				const lotteryId = 0;
				// Buy ticket
				await expect(
					lotteryContract.buyTicket(lotteryId, {
						value: ethers.utils.parseEther("0.12"),
					})
				).to.be.revertedWith("To participate, please add the required amount.");
			});

			it("Buys tickets with different addresses and they are asigned correctly", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					owner.address,
					endTime
				);
				const lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr2)
				await lotteryContract
					.connect(addr2)
					.buyTicket(lotteryId, { value: bettingPrice });

				[, , , , players, lotteryBalance, , ,] =
					await lotteryContract.getLottery(lotteryId);
				expect(players).to.eql([owner.address, addr1.address, addr2.address]);
				expect(
					await ethers.provider.getBalance(lotteryContract.address)
				).to.equal(ethers.utils.parseEther("0.3"));
				expect(lotteryBalance).to.equal(ethers.utils.parseEther("0.3"));
			});

			it("Buys multiple tickets and they are asigned correctly", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					owner.address,
					endTime
				);
				const lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				[, , , , players, lotteryBalance, ,] = await lotteryContract.getLottery(
					lotteryId
				);
				expect(players).to.eql([
					owner.address,
					owner.address,
					owner.address,
					owner.address,
					owner.address,
				]);
				expect(
					await ethers.provider.getBalance(lotteryContract.address)
				).to.equal(ethers.utils.parseEther("0.5"));
				expect(lotteryBalance).to.equal(ethers.utils.parseEther("0.5"));
			});
		});
		describe("Ending Lottery Tests", () => {
			it("Keeper should request the ending of a lottery", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				tx = await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					owner.address,
					endTime
				);
				const lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr2)
				await lotteryContract
					.connect(addr2)
					.buyTicket(lotteryId, { value: bettingPrice });
				let end;
				do {
					end = await lotteryContract.checkUpkeep(
						"0x0000000000000000000000000000000000000000000000000000006d6168616d"
					);
					await network.provider.send("evm_increaseTime", [10]);
					await network.provider.send("evm_mine");
				} while (!end[0]);
				await expect(lotteryContract.requestWordsPendingLotteries()).to.emit(
					lotteryContract,
					"PendingLotteriesWordsRequested"
				);
			});
			it("Keeper should end a pending lottery", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
					addr3,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				tx = await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					addr3.address,
					endTime
				);
				const lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr2)
				await lotteryContract
					.connect(addr2)
					.buyTicket(lotteryId, { value: bettingPrice });
				let end;
				do {
					end = await lotteryContract.checkUpkeep(
						"0x0000000000000000000000000000000000000000000000000000006d6168616d"
					);
					await network.provider.send("evm_increaseTime", [10]);
					await network.provider.send("evm_mine");
				} while (!end[0]);
				await expect(endPendingLotteries(lotteryContract, vrfCoordinatorV2Mock))
					.to.emit(lotteryContract, "EndLotteryEvent")
					.withArgs(lotteryId);
				lottery = await lotteryContract.getLottery(lotteryId);
				const activeLottery = lottery[3];
				const lotteryBalance = lottery[5];
				const lotteryWinner = lottery[7];
				const beneficiaryAddress = lottery[6];
				expect(activeLottery).to.equal(false);
				expect(await ethers.provider.getBalance(beneficiaryAddress)).to.equal(
					ethers.utils.parseEther("10000.285")
				);
				expect(lotteryBalance).to.equal(ethers.utils.parseEther("0"));
				expect(await nftContract.ownerOf(0)).to.equal(lotteryWinner);
			});

			it("Ends lottery without players.", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
					addr3,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				tx = await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					addr3.address,
					endTime
				);
				const lotteryId = 0;
				let end;
				do {
					end = await lotteryContract.checkUpkeep(
						"0x0000000000000000000000000000000000000000000000000000006d6168616d"
					);
					await network.provider.send("evm_increaseTime", [10]);
					await network.provider.send("evm_mine");
				} while (!end[0]);
				await expect(endPendingLotteries(lotteryContract, vrfCoordinatorV2Mock))
					.to.emit(lotteryContract, "EndLotteryEvent")
					.withArgs(lotteryId);
				lottery = await lotteryContract.getLottery(lotteryId);
				const activeLottery = lottery[3];
				const lotteryBalance = lottery[5];
				const lotteryWinner = lottery[7];
				expect(activeLottery).to.equal(false);
				expect(lotteryBalance).to.equal(ethers.utils.parseEther("0"));
				expect(await nftContract.ownerOf(0)).to.equal(owner.address);
				expect(lotteryWinner).to.equal(ethers.constants.AddressZero);
			});

			it("Tries to buy a ticket for a lottery that has already ended and fails", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
					addr3,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				tx = await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					addr3.address,
					endTime
				);
				const lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr2)
				await lotteryContract
					.connect(addr2)
					.buyTicket(lotteryId, { value: bettingPrice });
				let end;
				do {
					end = await lotteryContract.checkUpkeep(
						"0x0000000000000000000000000000000000000000000000000000006d6168616d"
					);
					await network.provider.send("evm_increaseTime", [10]);
					await network.provider.send("evm_mine");
				} while (!end[0]);
				await endPendingLotteries(lotteryContract, vrfCoordinatorV2Mock);
				await expect(
					lotteryContract.buyTicket(lotteryId, { value: bettingPrice })
				).to.be.revertedWith(
					"The lottery Id given corresponds to a lottery that has already ended."
				);
			});

			it("Tries to request a random word when no lotteries are pending to be ended", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
					addr3,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				const nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				const blockNumber = await ethers.provider.getBlockNumber();
				const currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				const lotteryTime = DEFAULT_LOTTERY_TIME;
				const endTime = currentTimestamp + lotteryTime;
				tx = await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					addr3.address,
					endTime
				);
				const lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr2)
				await lotteryContract
					.connect(addr2)
					.buyTicket(lotteryId, { value: bettingPrice });

				await expect(
					lotteryContract.requestWordsPendingLotteries()
				).to.be.revertedWith("There are no lotteries pending to be ended");
			});
		});

		describe("Contract Fee Gains Tests", () => {
			it("Succesfully withdraws fee gains", async () => {
				const {
					lotteryContract,
					nftContract,
					vrfCoordinatorV2Mock,
					owner,
					addr1,
					addr2,
					addr3,
				} = await testSetup({});

				// Mint an NFT
				await nftContract.safeMint();
				let nftId = 0;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				const bettingPrice = ethers.utils.parseEther("0.1"); // 0.1 ether
				let blockNumber = await ethers.provider.getBlockNumber();
				let currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				let lotteryTime = DEFAULT_LOTTERY_TIME;
				let endTime = currentTimestamp + lotteryTime;
				await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					addr3.address,
					endTime
				);
				let lotteryId = 0;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr2)
				await lotteryContract
					.connect(addr2)
					.buyTicket(lotteryId, { value: bettingPrice });
				let end;
				do {
					end = await lotteryContract.checkUpkeep(
						"0x0000000000000000000000000000000000000000000000000000006d6168616d"
					);
					await network.provider.send("evm_increaseTime", [10]);
					await network.provider.send("evm_mine");
				} while (!end[0]);
				await endPendingLotteries(lotteryContract, vrfCoordinatorV2Mock);
				let contractFeeGains = bettingPrice
					.mul(ethers.BigNumber.from(3))
					.mul(await lotteryContract.CONTRACT_FEE())
					.div(ethers.BigNumber.from(100));
				expect(await lotteryContract.getContractFeeBalance()).to.equal(
					contractFeeGains
				);

				// Mint an NFT
				await nftContract.safeMint();
				nftId = 1;

				// Approve contract to be able to transfer the NFT
				await nftContract.approve(lotteryContract.address, nftId);
				// Start lottery
				blockNumber = await ethers.provider.getBlockNumber();
				currentTimestamp = (await ethers.provider.getBlock(blockNumber))
					.timestamp;
				lotteryTime = DEFAULT_LOTTERY_TIME;
				endTime = currentTimestamp + lotteryTime;
				await lotteryContract.startLottery(
					nftId,
					nftContract.address,
					bettingPrice,
					addr3.address,
					endTime
				);
				lotteryId = 1;

				// Buy ticket (owner)
				await lotteryContract.buyTicket(lotteryId, { value: bettingPrice });

				// Buy ticket (addr1)
				await lotteryContract
					.connect(addr1)
					.buyTicket(lotteryId, { value: bettingPrice });

				do {
					end = await lotteryContract.checkUpkeep(
						"0x0000000000000000000000000000000000000000000000000000006d6168616d"
					);
					await network.provider.send("evm_increaseTime", [10]);
					await network.provider.send("evm_mine");
				} while (!end[0]);
				await endPendingLotteries(lotteryContract, vrfCoordinatorV2Mock);

				contractFeeGains = contractFeeGains.add(
					bettingPrice
						.mul(ethers.BigNumber.from(2))
						.mul(await lotteryContract.CONTRACT_FEE())
						.div(ethers.BigNumber.from(100))
				);
				expect(await lotteryContract.getContractFeeBalance()).to.equal(
					contractFeeGains
				);

				let ownerWalletFunds = await owner.getBalance();
				let tx = await lotteryContract.withdrawContractFeeGains();
				let receipt = await tx.wait();
				let gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);
				expect(await owner.getBalance()).to.equal(
					ownerWalletFunds.add(contractFeeGains).sub(gasSpent)
				);
				expect(await lotteryContract.getContractFeeBalance()).to.equal(
					ethers.BigNumber.from(0)
				);
			});
		});
	});
});

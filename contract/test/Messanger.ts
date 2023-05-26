import { Overrides } from "ethers";
import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Messenger", function () {
	async function deployContract() {
		const [owner, otherAccount] = await ethers.getSigners();

		const numOfPendingLimits = 10;
		const funds = 100;

		const Messenger = await hre.ethers.getContractFactory("Messenger");
		const messenger = await Messenger.deploy(numOfPendingLimits, {
			value: funds,
		} as Overrides);

		return { messenger, numOfPendingLimits, funds, owner, otherAccount };
	}

	describe("Deployement", function () {
		it("Should set the right number of pending message limits", async function () {
			const { messenger, numOfPendingLimits } = await loadFixture(
				deployContract
			);

			expect(await messenger.numOfPendingLimits()).to.equal(numOfPendingLimits);
		});
	});

	describe("Post", function () {
		it("Should emit an event on post", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);

			await expect(
				messenger.post("text", otherAccount.address, { value: 1 })
			).to.emit(messenger, "NewMessage");
		});

		it("Should send the correct amount of tokens", async function () {
			const { messenger, owner, otherAccount } = await loadFixture(
				deployContract
			);
			const test_deposit = 10;

			// when post messege, owner send eth to contract.
			await expect(
				messenger.post("text", otherAccount.address, {
					value: test_deposit,
				})
			).to.changeEtherBalances(
				[owner, messenger],
				[-test_deposit, test_deposit]
			);
		});

		it("Shoukd set the right Message", async function () {
			const { messenger, owner, otherAccount } = await loadFixture(
				deployContract
			);

			const test_deposit = 1;
			const test_text = "text";

			await messenger.post(test_text, otherAccount.address, {
				value: test_deposit,
			});
			const messages = await messenger.connect(otherAccount).getOwnMessages();
			const message = messages[0];
			expect(message.depositInWei).to.equal(test_deposit);
			expect(message.text).to.equal(test_text);
			expect(message.isPending).to.equal(true);
			expect(message.sender).to.equal(owner.address);
			expect(message.receiver).to.equal(otherAccount.address);
		});

		it("Should revert with the right error if exceed number of pending limits", async function () {
			const { messenger, otherAccount, numOfPendingLimits } = await loadFixture(
				deployContract
			);

			// メッセージ保留数の上限まで otherAccount へメッセージを送信します。
			for (let cnt = 0; cnt < numOfPendingLimits; cnt++) {
				await messenger.post("dummy", otherAccount.address);
			}
			// 次に送信するメッセージはキャンセルされます。
			await expect(
				messenger.post("exceed", otherAccount.address)
			).to.be.revertedWith(
				"The receiver has reached the number of pending limits"
			);
		});
	});

	describe("Accept", function () {
		it("Should emit an event on accept", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);
			const test_deposit = 1;

			await messenger.post("text", otherAccount.address, {
				value: test_deposit,
			});

			const first_index = 0;
			await expect(messenger.connect(otherAccount).accept(first_index)).to.emit(
				messenger,
				"MessageConfirmed"
			);
		});

		it("isPending must be changed", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);
			const first_index = 0;

			await messenger.post("text", otherAccount.address);
			let messages = await messenger.connect(otherAccount).getOwnMessages();
			expect(messages[0].isPending).to.equal(true);

			await messenger.connect(otherAccount).accept(first_index);
			messages = await messenger.connect(otherAccount).getOwnMessages();
			expect(messages[0].isPending).to.equal(false);
		});

		it("Should send the correct amount of tokens", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);
			const test_deposit = 10;

			await messenger.post("text", otherAccount.address, {
				value: test_deposit,
			});

			// メッセージをacceptした場合は, コントラクト(messenger)から受取人(otherAccount)へ送金されます。
			const first_index = 0;
			await expect(
				messenger.connect(otherAccount).accept(first_index)
			).to.changeEtherBalances(
				[messenger, otherAccount],
				[-test_deposit, test_deposit]
			);
		});

		it("Should revert with the right error if called in duplicate", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);

			await messenger.post("text", otherAccount.address, { value: 1 });
			await messenger.connect(otherAccount).accept(0);
			await expect(
				messenger.connect(otherAccount).accept(0)
			).to.be.revertedWith("This message has already been confirmed");
		});
	});

	describe("Deny", function () {
		it("Should emit an event on deny", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);
			const test_deposit = 1;

			await messenger.post("text", otherAccount.address, {
				value: test_deposit,
			});

			const first_index = 0;
			await expect(messenger.connect(otherAccount).deny(first_index)).to.emit(
				messenger,
				"MessageConfirmed"
			);
		});

		it("isPending must be changed", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);
			const first_index = 0;

			await messenger.post("text", otherAccount.address);
			let messages = await messenger.connect(otherAccount).getOwnMessages();
			expect(messages[0].isPending).to.equal(true);

			await messenger.connect(otherAccount).deny(first_index);
			messages = await messenger.connect(otherAccount).getOwnMessages();
			expect(messages[0].isPending).to.equal(false);
		});

		it("Should send the correct amount of tokens", async function () {
			const { messenger, owner, otherAccount } = await loadFixture(
				deployContract
			);
			const test_deposit = 10;

			await messenger.post("text", otherAccount.address, {
				value: test_deposit,
			});

			// メッセージをdenyした場合は, コントラクト(messenger)から送信者(owner)へ送金されます。
			const first_index = 0;
			await expect(
				messenger.connect(otherAccount).deny(first_index)
			).to.changeEtherBalances(
				[messenger, owner],
				[-test_deposit, test_deposit]
			);
		});

		it("Should revert with the right error if called in duplicate", async function () {
			const { messenger, otherAccount } = await loadFixture(deployContract);

			await messenger.post("text", otherAccount.address, { value: 1 });
			await messenger.connect(otherAccount).deny(0);
			await expect(messenger.connect(otherAccount).deny(0)).to.be.revertedWith(
				"This message has already been confirmed"
			);
		});
	});
});

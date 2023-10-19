import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

describe("Messenger", function () {
  async function deployContract() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const funds = 100;

    const messenger = await hre.viem.deployContract("Messenger", [], {
      value: funds,
    });

    return { messenger, funds, owner, otherAccount, publicClient };
  }

  describe("Post", function () {
    it("Should emit on event on post", async function () {
      const { messenger, otherAccount, publicClient } = await loadFixture(
        deployContract
      );
      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(1),
      });

      const logs = await publicClient.getContractEvents({
        address: messenger.address,
        abi: messenger.abi,
        eventName: "NewMessage",
      });
      expect(logs[0].eventName).to.equal("NewMessage");
    });

    it("Should send the correct amount of tokens", async function () {
      const { messenger, funds, otherAccount, publicClient } =
        await loadFixture(deployContract);
      const test_deposit = 10;

      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(test_deposit),
      });

      expect(
        await publicClient.getBalance({ address: messenger.address })
      ).to.equal(BigInt(funds + test_deposit));
    });

    it("Should set the right Message", async function () {
      const { messenger, owner, otherAccount, publicClient, funds } =
        await loadFixture(deployContract);

      const test_deposit = 1;
      const test_text = "text";

      await messenger.write.post([test_text, otherAccount.account.address], {
        value: BigInt(test_deposit),
      });

      const messages = await messenger.read.getOwnMessages({
        account: otherAccount.account.address,
      });
      const message = messages[0];

      expect(message.depositInWei).to.equal(BigInt(test_deposit));
      expect(message.text).to.equal(test_text);
      expect(message.isPending).to.equal(true);
      expect(message.sender.toLowerCase()).to.equal(owner.account.address);
      expect(message.receiver.toLowerCase()).to.equal(
        otherAccount.account.address
      );
    });
  });

  describe("Accept", function () {
    it("Should emit an event an accept", async function () {
      const { messenger, otherAccount, publicClient } = await loadFixture(
        deployContract
      );
      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(0),
      });
      await messenger.write.accept([BigInt(0)], {
        account: otherAccount.account.address,
      });

      const logs = await publicClient.getContractEvents({
        address: messenger.address,
        abi: messenger.abi,
        eventName: "MessageConfirmed",
      });
      expect(logs[0].eventName).to.equal("MessageConfirmed");
    });

    it("isPending must be changed", async function () {
      const { messenger, owner, otherAccount, publicClient } =
        await loadFixture(deployContract);

      const first_index = 0;
      await messenger.write.post(["text", otherAccount.account.address]);
      let messages = await messenger.read.getOwnMessages({
        account: otherAccount.account.address,
      });
      expect(messages[0].isPending).to.equal(true);

      await messenger.write.accept([BigInt(first_index)], {
        account: otherAccount.account.address,
      });
      messages = await messenger.read.getOwnMessages({
        account: otherAccount.account.address,
      });
      expect(messages[0].isPending).to.equal(false);
    });

    it("Should send the correct amount of tokens", async function () {
      const { messenger, owner, otherAccount, publicClient, funds } =
        await loadFixture(deployContract);

      const ten_deposit = 10;
      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(ten_deposit),
      });

      expect(
        await publicClient.getBalance({ address: messenger.address })
      ).to.equal(BigInt(ten_deposit + funds));

      const first_index = 0;
      await messenger.write.accept([BigInt(first_index)], {
        account: otherAccount.account.address,
      });

      expect(
        await publicClient.getBalance({ address: messenger.address })
      ).to.equal(BigInt(funds));
    });

    it("Should revert with the right error if called in deplicate", async function () {
      const { messenger, otherAccount } = await loadFixture(deployContract);

      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(1),
      });
      await messenger.write.accept([BigInt(0)], {
        account: otherAccount.account.address,
      });

      await expect(
        messenger.write.accept([BigInt(0)], {
          account: otherAccount.account.address,
        })
      ).to.be.rejectedWith("This message has already been confirmed");
    });
  });

  describe("Deny", function () {
    it("Should emit an event an deny", async function () {
      const { messenger, otherAccount, publicClient } = await loadFixture(
        deployContract
      );
      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(0),
      });
      await messenger.write.deny([BigInt(0)], {
        account: otherAccount.account.address,
      });

      const logs = await publicClient.getContractEvents({
        address: messenger.address,
        abi: messenger.abi,
        eventName: "MessageConfirmed",
      });
      expect(logs[0].eventName).to.equal("MessageConfirmed");
    });

    it("isPending must be changed", async function () {
      const { messenger, otherAccount } = await loadFixture(deployContract);
      const first_index = 0;

      await messenger.write.post(["text", otherAccount.account.address]);
      let messages = await messenger.read.getOwnMessages({
        account: otherAccount.account.address,
      });
      expect(messages[0].isPending).to.equal(true);

      await messenger.write.deny([BigInt(first_index)], {
        account: otherAccount.account.address,
      });
      messages = await messenger.read.getOwnMessages({
        account: otherAccount.account.address,
      });
      expect(messages[0].isPending).to.equal(false);
    });

    it("Should send the correct amount of tokens", async function () {
      const { messenger, owner, otherAccount, publicClient, funds } =
        await loadFixture(deployContract);

      const test_deposit = 10;

      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(test_deposit),
      });

      const first_index = 0;
      await messenger.write.deny([BigInt(first_index)], {
        account: otherAccount.account.address,
      });
      expect(
        await publicClient.getBalance({ address: messenger.address })
      ).to.equal(BigInt(funds));
    });

    it("Should revert with the right error if called in depulicate", async function () {
      const { messenger, owner, otherAccount, publicClient, funds } =
        await loadFixture(deployContract);

      await messenger.write.post(["text", otherAccount.account.address], {
        value: BigInt(1),
      });
      await messenger.write.deny([BigInt(0)], {
        account: otherAccount.account.address,
      });
      await expect(
        messenger.write.deny([BigInt(0)], {
          account: otherAccount.account.address,
        })
      ).to.rejectedWith("This message has already been confirmed");
    });
  });
});

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Messenger {
    // message struct
    uint256 public numOfPendingLimits;

    struct Message {
        address payable sender;
        address payable receiver;
        uint256 depositInWei;
        uint256 timestamp;
        string text;
        bool isPending;
    }

    mapping(address => Message[]) private messagesAtAddress;
    mapping(address => uint256) private numOfPendingAtAddress;

    event NewMessage(
        address sender,
        address receiver,
        uint256 depositInWei,
        uint256 timestamp,
        string text,
        bool isPending
    );

    event MessageConfirmed(address receiver, uint256 index);

    constructor(uint256 _numOfPendingLimits) payable {
        console.log("Here is my first smart contract!");

        numOfPendingLimits = _numOfPendingLimits;
    }

    // received message from user, save in map.
    function post(
        string memory _text,
        address payable _receiver
    ) public payable {
        // check the limit of receiver's message which is pending
        require(
            numOfPendingAtAddress[_receiver] < numOfPendingLimits,
            "The receiver has reached the number of pending limits"
        );

        numOfPendingAtAddress[_receiver] += 1;

        console.log(
            "%s posts text:[%s] token:[%d]",
            msg.sender,
            _text,
            msg.value
        );

        messagesAtAddress[_receiver].push(
            Message(
                payable(msg.sender),
                _receiver,
                msg.value,
                block.timestamp,
                _text,
                true
            )
        );

        emit NewMessage(
            msg.sender,
            _receiver,
            msg.value,
            block.timestamp,
            _text,
            true
        );
    }

    // accept receiving message, receive avax
    function accept(uint256 _index) public {
        // confirm index number's message
        confirmMessage(_index);

        Message memory message = messagesAtAddress[msg.sender][_index];

        //send avax to message receiver
        sendAvax(message.receiver, message.depositInWei);
    }

    // deny receiving message, return avax to message sender
    function deny(uint256 _index) public {
        confirmMessage(_index);

        Message memory message = messagesAtAddress[msg.sender][_index];

        // return avax to message sender
        sendAvax(message.sender, message.depositInWei);
    }

    function confirmMessage(uint256 _index) private {
        Message storage message = messagesAtAddress[msg.sender][_index];

        // Checks for a match between the address at
        // which the function was called and the recipient address of the message.
        require(
            msg.sender == message.receiver,
            "Only the receiver can confirmMessage the message"
        );

        // confirm that message is pending
        require(
            message.isPending == true,
            "This message has already been confirmed"
        );

        // unlocking message's pending state
        message.isPending = false;

        emit MessageConfirmed(message.receiver, _index);
    }

    function sendAvax(address payable _to, uint256 _amountInWei) private {
        (bool success, ) = _to.call{value: _amountInWei}("");
        require(success, "Failed to withdraw AVAX from contract");
    }

    // get All messages whichi user got.
    function getOwnMessages() public view returns (Message[] memory) {
        return messagesAtAddress[msg.sender];
    }
}

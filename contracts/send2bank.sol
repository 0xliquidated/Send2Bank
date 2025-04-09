// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Send2Bank {
    address public constant BANK_ADDRESS = 0x7bF58b368472DDcC31b506627bb9b1b0DBA33D9A;
    uint256 public constant AMOUNT = 0.0001 ether;

    // Event to log successful transfers
    event SentToBank(address indexed sender, uint256 amount);

    // Function to send 0.0001 ETH to the bank address
    function bank() external payable {
        require(msg.value >= AMOUNT, "Must send at least 0.0001 ETH");

        (bool success, ) = BANK_ADDRESS.call{value: AMOUNT}("");
        require(success, "Transfer to bank failed");

        // Refund excess ETH if sent
        if (msg.value > AMOUNT) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - AMOUNT}("");
            require(refundSuccess, "Refund failed");
        }

        emit SentToBank(msg.sender, AMOUNT);
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}
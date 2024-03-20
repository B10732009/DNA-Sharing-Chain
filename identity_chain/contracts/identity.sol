// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Identity {
	address owner;

	constructor() {
		owner = msg.sender;
	}
}

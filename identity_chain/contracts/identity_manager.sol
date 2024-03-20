// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./identity.sol";

contract IdentityManager {
	struct User {
		address userAddress;
		address identityAddress;
		bool exist;
	}
	
	mapping(address => bool) orgList;
	mapping(address => User) userList;

	constructor() {
		orgList[0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA] = true;
	}

	function addUser(address _userAddress) public {
		require(orgList[msg.sender], "only organization administrator can call this function.");
		require(!userList[_userAddress].exist, "this address has been used.");
		Identity identity = new Identity();
		User memory user = User(_userAddress, address(identity), true);
		userList[_userAddress] = user;
	}

	function checkUser(address _userAddress) public view returns(address) {
		return userList[_userAddress].userAddress;
	}
}

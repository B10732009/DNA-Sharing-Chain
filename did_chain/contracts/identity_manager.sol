// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./identity.sol";

contract IdentityManager {
	struct User {
		string userId;
		address userIdentityContractAddress;
		uint userType;
		bool userExist;
	}

	event IdentityManagerEvent(bool res, string msg);
	
	mapping(address => bool) orgList;
	mapping(address => User) userList; // user address => user
	
	constructor() {
		orgList[0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA] = true;
	}

	function createUser(string memory userId, address userAddress, uint userType) public {
		// verify registration data
		if (!orgList[msg.sender]) {
			emit IdentityManagerEvent(false, "only organization administrator can call this function");
			return;
		}
		if (userList[userAddress].userExist) {
			emit IdentityManagerEvent(false, "this address has been used");
			return;
		}
		if (userType != 1 && userType != 2) {
			emit IdentityManagerEvent(false, "invalid user type");
			return;
		}

		// create a new identity contract
		Identity identity = new Identity(userAddress);

		// store binding data
		userList[userAddress] = User(userId, address(identity), userType, true);
		emit IdentityManagerEvent(true, "ok");
	}

	function getUserId(address userAddress) public view returns(string memory) {
		return userList[userAddress].userId;
	}

	function getUserIdentityContractAddress(address userAddress) public view returns(address) {
		return userList[userAddress].userIdentityContractAddress;
	}

	function getUserType(address userAddress) public view returns(uint) {
		return userList[userAddress].userType;
	}

	function getUserExist(address userAddress) public view returns(bool) {
		return userList[userAddress].userExist;
	}

	function _test_createUser(string memory userId, address userAddress, uint userType) public {
		// // verify registration data
		// if (!orgList[msg.sender]) {
		// 	emit IdentityManagerEvent(false, "only organization administrator can call this function");
		// 	return;
		// }
		// if (userList[userAddress].userExist) {
		// 	emit IdentityManagerEvent(false, "this address has been used");
		// 	return;
		// }
		// if (userType != 1 && userType != 2) {
		// 	emit IdentityManagerEvent(false, "invalid user type");
		// 	return;
		// }

		// create a new identity contract
		Identity identity = new Identity(userAddress);

		// store binding data
		userList[userAddress] = User(userId, address(identity), userType, true);
		emit IdentityManagerEvent(true, "ok");
	}
}

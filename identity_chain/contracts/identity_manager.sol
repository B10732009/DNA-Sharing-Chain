// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./identity.sol";

contract IdentityManager {
	struct User {
		string userId; 							// government-created id
		address userIdentityContractAddress;	// address of user's identity contract
		uint userType;							// 0 for person, 1 for organization
		bool userExist;							// flag to check if user exists
	}

	event IdentityManagerEvent(bool status, string msg);
	
	mapping(address => bool) orgList;
	mapping(address => User) userList; // user address => user
	
	constructor() {
		orgList[0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA] = true;
	}

	function createUser(string memory _userId, address _userAddress, uint _userType) public {
		// require(orgList[msg.sender], "only organization administrator can call this function.");
		// require(!userIdList[_userId], "this id has been used.");
		// require(!userList[_userAddress].exist, "this address has been used.");
		// require(_role <= 4, "role should between 0 ~ 4.");

		// check conditions
		if (!orgList[msg.sender]) {
			emit IdentityManagerEvent(false, "only organization administrator can call this function.");
			return;
		}
		if (userList[_userAddress].userExist) {
			emit IdentityManagerEvent(false, "this address has been used.");
			return;
		}
		if (_userType != 1 && _userType != 2) {
			emit IdentityManagerEvent(false, "invalid user type.");
			return;
		}

		// create a new identity contract
		Identity identity = new Identity(_userAddress);

		// put new user object into user list
		userList[_userAddress] = User(_userId, address(identity), _userType, true);
		emit IdentityManagerEvent(true, "ok.");
	}

	function getUserId(address _userAddress) public view returns(string memory) {
		return userList[_userAddress].userId;
	}

	function getUserIdentityContractAddress(address _userAddress) public view returns(address) {
		return userList[_userAddress].userIdentityContractAddress;
	}

	function getUserType(address _userAddress) public view returns(uint) {
		return userList[_userAddress].userType;
	}

	function getUserExist(address _userAddress) public view returns(bool) {
		return userList[_userAddress].userExist;
	}

	// function verify(bytes32 _hashedMsg, uint8 _v, bytes32 _r, bytes32 _s) public pure returns(address) {
	// 	return ecrecover(_hashedMsg, _v, _r, _s);
	// }
}

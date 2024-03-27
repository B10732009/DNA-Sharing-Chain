// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./identity.sol";

contract IdentityManager {
	struct User {
		string userId;
		address userAddress;
		address identityAddress;
	}
	
	mapping(address => bool) orgList;
	mapping(address => User) userList;
	mapping(string => bool) userIdList;
	mapping(address => bool) userAddressList;
	
	constructor() {
		orgList[0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA] = true;
	}

	function addUser(string memory _userId, address _userAddress) public {
		require(orgList[msg.sender], "only organization administrator can call this function.");
		require(!userIdList[_userId], "this id has been used.");
		require(!userAddressList[_userAddress], "this address has been used.");
		userIdList[_userId] = true;
		userAddressList[_userAddress] = true;
		Identity identity = new Identity();
		userList[_userAddress] = User(_userId, _userAddress, address(identity));
	}

	function checkUser(string memory _userId, address _userAddress) public view returns(bool , string memory) {
		if (userIdList[_userId]) {
			return (false, "this id has been used.");
		}
		if (userAddressList[_userAddress]) {
			return (false, "this address has been used.");
		}
		return (true, "ok");
	}
}

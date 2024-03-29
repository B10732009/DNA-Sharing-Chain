// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./identity.sol";

contract IdentityManager {
	struct User {
		string userId;
		address identityAddress;
		uint userRole;
		bool exist;
	}
	
	mapping(address => bool) orgList;
	mapping(address => User) userList; // user address => user infos
	mapping(string => bool) userIdList; // user address => user id
	
	constructor() {
		orgList[0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA] = true;
	}

	function addUser(string memory _userId, address _userAddress, uint _role) public {
		require(orgList[msg.sender], "only organization administrator can call this function.");
		require(!userIdList[_userId], "this id has been used.");
		require(!userList[_userAddress].exist, "this address has been used.");
		require(_role <= 4, "role should between 0 ~ 4.");
		userIdList[_userId] = true;
		Identity identity = new Identity(_userAddress);
		userList[_userAddress] = User(_userId, address(identity), _role, true);
	}

	function checkUser(string memory _userId, address _userAddress, uint _role) public view returns(bool , string memory) {
		if (userIdList[_userId]) {
			return (false, "this id has been used.");
		}
		if (userList[_userAddress].exist) {
			return (false, "this address has been used.");
		}
		if (_role > 4) {
			return (false, "role should between 0 ~ 4.");
		}
		return (true, "ok");
	}

	function getUserId(address _userAddress) public view returns(string memory) {
		return userList[_userAddress].userId;
	}

	function getIdentityAddress(address _userAddress) public view returns(address) {
		return userList[_userAddress].identityAddress;
	}

	function getUserRole(address _userAddress) public view returns(uint) {
		return userList[_userAddress].userRole;
	}

	function getUserExist(address _userAddress) public view returns(bool) {
		return userList[_userAddress].exist;
	}
}

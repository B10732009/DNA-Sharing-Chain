// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Identity {
	address owner;
	mapping(string => string) data;

	constructor(address _owner) {
		owner = _owner;
	}

	function isOwner(address _userAddress) public view returns(bool) {
		return owner == _userAddress;
	}

	function addData(string memory _name, string memory _data) public {
		require(owner == msg.sender, "only owner can add data.");
		data[_name] = _data;
	}

	function getData(string memory _name) public view returns(string memory) {
		return data[_name];
	}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Identity {
	event IdentityEvent(bool res, string msg);
	
	address owner;
	mapping(string => string) data;
	
	constructor(address _owner) {
		owner = _owner;
	}

	function verifySignature(bytes32 _hashedMsg, uint8 _v, bytes32 _r, bytes32 _s) public view returns(bool) {
		return ecrecover(_hashedMsg, _v, _r, _s) == owner;
	}

	function addData(string memory _name, string memory _data, bytes32 _hashedMsg, uint8 _v, bytes32 _r, bytes32 _s) public {
		if (!verifySignature(_hashedMsg, _v, _r, _s)) {
			emit IdentityEvent(false, "only owner can add data");
			return;
		}
		data[_name] = _data;
		emit IdentityEvent(true, "ok");
	}

	function getData(string memory _name, bytes32 _hashedMsg, uint8 _v, bytes32 _r, bytes32 _s) public view returns(string memory) {
		if (!verifySignature(_hashedMsg, _v, _r, _s)) {
			return "only owner can get data";
		}
		return data[_name];
	}

	function _test_addData(string memory _name, string memory _data, bytes32 _hashedMsg, uint8 _v, bytes32 _r, bytes32 _s) public {
		verifySignature(_hashedMsg, _v, _r, _s);
		data[_name] = _data;
		emit IdentityEvent(true, "ok");
	}
}

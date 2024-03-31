/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCaServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

const channelName = 'access-control-channel';
const chaincodeName = 'access-control-chaincode';

const mspOrg1 = 'Org1MSP';
const org1UserId = 'javascriptAppUssssserc';

const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';

function buildCcp(_ccpPath) {
	if (!fs.existsSync(_ccpPath)) {
		throw new Error(`no such file or directory: ${_ccpPath}`);
	}
	const contents = fs.readFileSync(_ccpPath, 'utf8');
	const ccp = JSON.parse(contents);
	console.log(`Loaded the network configuration located at ${_ccpPath}`);
	return ccp;
}

async function buildWallet(_wallets, _walletPath) {
	let wallet;
	if (_walletPath) {
		wallet = await Wallets.newFileSystemWallet(_walletPath);
		console.log(`Built a file system wallet at ${_walletPath}`);
	} else {
		wallet = await Wallets.newInMemoryWallet();
		console.log('Built an in memory wallet');
	}
	return wallet;
}

function buildCaClient(_fabricCaServices, _ccp, _caHostName) {
	const caInfo = _ccp.certificateAuthorities[_caHostName];
	const caClient = new _fabricCaServices(caInfo.url, { verify: false }, caInfo.caName);
	console.log(`Built a CA Client named ${caInfo.caName}`);
	return caClient;
}

async function enrollAdmin(_caClient, _wallet, _orgMspId) {
	try {
		// Check to see if we've already enrolled the admin user.
		const identity = await _wallet.get(adminUserId);
		if (identity) {
			console.log('An identity for the admin user already exists in the wallet');
			return;
		}
		// Enroll the admin user, and import the new identity into the wallet.
		const enrollment = await _caClient.enroll({ 
			enrollmentID: adminUserId, 
			enrollmentSecret: adminUserPasswd 
		});
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: _orgMspId,
			type: 'X.509',
		};
		await _wallet.put(adminUserId, x509Identity);
		console.log('Successfully enrolled admin user and imported it into the wallet');
	} catch (error) {
		console.error(`Failed to enroll admin user : ${error}`);
	}
}

async function registerAndEnrollUser(_caClient, _wallet, _orgMsgId, _userId) {
	try {
		// Check to see if we've already enrolled the user
		const userIdentity = await _wallet.get(_userId);
		if (userIdentity) {
			console.log(`An identity for the user ${_userId} already exists in the wallet`);
			return;
		}
		// Must use an admin to register a new user
		const adminIdentity = await _wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}
		// build a user object for authenticating with the CA
		const provider = _wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
		// Register the user, enroll the user, and import the new identity into the wallet.
		// if affiliation is specified by client, the affiliation value must be configured in CA
		const secret = await _caClient.register({
			affiliation: null, // affiliation,
			enrollmentID: _userId,
			role: 'client'
		}, adminUser);
		const enrollment = await _caClient.enroll({
			enrollmentID: _userId,
			enrollmentSecret: secret
		});
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: _orgMsgId,
			type: 'X.509',
		};
		await _wallet.put(_userId, x509Identity);
		console.log(`Successfully registered and enrolled user ${_userId} and imported it into the wallet`);
	} catch (error) {
		console.error(`Failed to register user : ${error}`);
	}
}

async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccpPath = path.resolve(__dirname, '..', 'fablo-target', 'fabric-config', 'connection-profiles', 'connection-profile-org1.json');
		const ccp = buildCcp(ccpPath);
		// build an instance of the fabric ca services client based on
		const caClient = buildCaClient(FabricCaServices, ccp, 'ca.org1.example.com');
		// setup the wallet to hold the credentials of the application user
		const walletPath = path.join(__dirname, 'wallet');
		const wallet = await buildWallet(Wallets, walletPath);
		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);
		// in a real application this would be done only when a new user was required to be added
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId);

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();
		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);
			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);
			// Test chaincodes
			const a = await contract.submitTransaction('put', 'aaa', 'bbb');
			console.log(a.toString());
			const b = await contract.evaluateTransaction('get', 'aaa');
			console.log(b.toString());

			const temp = await contract.submitTransaction('put', 'abc', JSON.stringify({
				name: 'abc',
				id: 'def'
			}));
			console.log(temp.toString());
			const temp2 = await contract.evaluateTransaction('query', JSON.stringify({
				selector: {
					id: 'def'
				}
			}));
			console.log(temp2.toString());
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		process.exit(1);
	}
}

main();

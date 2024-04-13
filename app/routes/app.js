let express = require('express');
let router = express.Router();
let path = require('path');
let fs = require('fs');
let crypto = require('crypto');
let elliptic = require('elliptic');
const EthSigUtil = require('eth-sig-util');
const { KEYUTIL } = require('jsrsasign');
const { Web3 } = require('web3');
const { Gateway, Wallets } = require('fabric-network');
const FabricCaServices = require('fabric-ca-client');
const FabricCommon = require('fabric-common');
const DID_CONFIG = require('../public/javascripts/did_config');
const openssl = require('openssl-nodejs');

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

async function getAdminIdentity(_caClient, _wallet) {
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('aaaaa');
        return;
    }
    const provider = wallet.getProviderRegistry()
        .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    return adminUser;
}

const channelName = 'access-control-channel';
const chaincodeName = 'access-control-chaincode';

const mspOrg1 = 'Org1MSP';
const org1UserId = 'javascriptAppUssssserc';

const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';

let caClient;
let wallet;
let gateway;
let network;
let accessControlChannel;
let accessControlContract;

async function init() {
    const ccpPath = path.join(__dirname, '..', '..', 'app_chain', 'fablo-target', 'fabric-config', 'connection-profiles', 'connection-profile-org1.json');
    ccp = buildCcp(ccpPath);
    caClient = buildCaClient(FabricCaServices, ccp, 'ca.org1.example.com');
    const walletPath = path.join(__dirname, 'wallet');
    wallet = await buildWallet(Wallets, walletPath);
    await enrollAdmin(caClient, wallet, mspOrg1);
    await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId);
    try {
        gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: {
                enabled: true,
                asLocalhost: true  // using asLocalhost as this gateway is using a fabric network deployed locally
            }
        });
        // Build a network instance based on the channel where the smart contract is deployed
        accessControlChannel = await gateway.getNetwork(channelName);
        // Get the contract from the network.
        accessControlContract = accessControlChannel.getContract(chaincodeName);
    }
    catch (error) {
        console.log(error);
    }
}

init();

async function createTransaction(_userName, _wallet, _fabricCommon) {
    let userJson = await _wallet.get(_userName);
    // console.log(userJson);
    let user = _fabricCommon.User.createUser(
        _userName,
        null,
        userJson.mspId,
        userJson.credentials.certificate,
        null
    );
    // let cryptoSuite = _fabricCommon.Utils.newCryptoSuite();
    // let publicKey = await cryptoSuite.createKeyFromRaw(userJson.credentials.certificate);
    // let identity = new _fabricCommon.Identity(userJson.credentials.certificate, publicKey, userJson.mspId, cryptoSuite);
    // let user = new _fabricCommon.User(_userName);
    // user._cryptoSuite = cryptoSuite;
    // user._identity = identity;

    console.log(user);
    let userContext = gateway.client.newIdentityContext(user);
    // userContext.client.mspid = mspOrg1;
    console.log(userContext);

    let endorsement = accessControlChannel.channel.newEndorsement('access-control-chaincode');
    let proposalBytes = endorsement.build(userContext, {
        fcn: 'get',
        args: ['aaa']
    });
    console.log(proposalBytes);

    const hash = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    const ecdsa = new elliptic.ec(elliptic.curves['p256']);
    const temp = fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8');
    console.log(temp);
    const { prvKeyHex } = KEYUTIL.getKey(temp);
    console.log(prvKeyHex);
    const signKey = ecdsa.keyFromPrivate(prvKeyHex, 'hex');
    const signature = ecdsa.sign(Buffer.from(hash, 'hex'), signKey, { canonical: true });
    const signatureDER = Buffer.from(signature.toDER());
    console.log(signatureDER.toString());

    endorsement.sign(signatureDER);

    console.log(accessControlChannel.channel.getEndorsers());


    const proposalRespone = await endorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    console.log('proposalResponse', proposalRespone);

    let commit = endorsement.newCommit();
    let commitBytes = commit.build(userContext);
    let commitHash = crypto.createHash('sha256')
        .update(commitBytes)
        .digest('hex');
    const commitSignature = ecdsa.sign(Buffer.from(commitHash, 'hex'), signKey, { canonical: true });
    const commitSignatureDER = Buffer.from(commitSignature.toDER());
    const temp123 = commit.sign(commitSignatureDER);
    console.log(temp123);
    const commitResponse = await commit.send({
        requestTimeout: 300000,
        targets: accessControlChannel.channel.getCommitters()
    });
    console.log(commitResponse);
}

async function decodeCsr(csr) {
    return new Promise(function (resolve, reject) {
        openssl(['req', '-text', '-in', { name: 'key.csr', buffer: Buffer.from(csr) }, '-pubkey'], function (error, buffer) {
            resolve(buffer.toString());
        });
    });
}

/* GET home page. */
router.get('/index', function (req, res, next) {
    res.render('app_index', { title: 'Express' });
    // res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/', function (req, res, next) {
    res.redirect('/app/index');
});

router.get('/register', function (req, res, next) {
    res.render('app_register');
});

router.post('/test', async function (req, res) {
    createTransaction('0x3e014e5c311a7d6f652ca4f8bb016f4338a44118', wallet, FabricCommon);
    res.redirect('/app/index');
});

router.post('/register', async function (req, res) {
    const address = req.body.address;
    const message = req.body.message;
    const signature = req.body.signature;
    const appEncryptedCsr = req.body.app_encrypted_csr;
    console.log(address);
    console.log(message);
    console.log(signature);
    console.log(appEncryptedCsr);
    try {
        // const identityChainConfigPath = path.join(__dirname, '..', '..', 'config', 'identity_chain_config.json');
        // const identityChainConfig = JSON.parse(fs.readFileSync(identityChainConfigPath));

        // verify signature
        const web3 = new Web3(DID_CONFIG.URL);
        const recoveredAddress = web3.eth.accounts.recover(message, signature);
        if (recoveredAddress.toLowerCase() != address.toLowerCase()) {
            console.log("Fail to verify the signature.");
            console.log(recoveredAddress, address);
            res.redirect('/app/register');
            return;
        }
        console.log("Successfully verified the signature.");

        // decrypt csr
        const csr = EthSigUtil.decrypt(JSON.parse(appEncryptedCsr), DID_CONFIG.ORG.PRVKEY);
        console.log(csr);

        // decode csr and retrieve common name
        const decodedCsr = await decodeCsr(csr);
        const decodeCsrMatches = decodedCsr.match(/CN\s*=\s*([^\n]+)/);
        const cn = decodeCsrMatches[1];
        console.log('cn =', cn);

        // register a new user with provided csr
        const adminUser = await getAdminIdentity(caClient, wallet);
        const secret = await caClient.register({
            affiliation: null,
            attrs: [{
                name: 'category',
                value: 'ghwoghgoqghoghghoghsglahsagh',
                ecert: true
            }],
            enrollmentID: cn,
            role: 'client'
        }, adminUser);

        const enrollment = await caClient.enroll({
            enrollmentID: cn,
            enrollmentSecret: secret,
            csr: csr.toString('utf8')
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
            },
            mspId: mspOrg1,
            type: 'X.509',
        };
        await wallet.put(address, x509Identity);
        console.log('Successfully create new user in the wallet');

        // create a new user object on app chain
        const createUserResult = await accessControlContract.submitTransaction('createUser', address, 'patient');
        console.log(createUserResult);

        res.redirect('/app/index');
    }
    catch (error) {
        console.log(error);
    }
});

router.get('/manage', function (req, res, next) {
    res.render('app_manage');
});

router.post('/manage', async function (req, res) {
    // createTransaction('0x3e014e5c311a7d6f652ca4f8bb016f4338a44118', wallet, FabricCommon);
    res.redirect('/app/index');
});

router.post('/manage/get_permission', async function (req, res) {
    // get user's address
    const address = req.body.address;
    console.log(address);

    // get permission from app chain
    const permission = await accessControlContract.evaluateTransaction('getPermission', address);
    const permissionJson = JSON.parse(permission.toString());
    console.log(permissionJson);
    res.send({ data: permissionJson.data });
});

router.post('/manage/update_permission', async function (req, res) {
    const address = req.body.address;
    const permission = req.body.permission;
    console.log(address, permission);

    const _userName = address;

    let userJson = await wallet.get(_userName);
    // console.log(userJson);
    let user = FabricCommon.User.createUser(
        _userName,
        null,
        userJson.mspId,
        userJson.credentials.certificate,
        null
    );
    // let cryptoSuite = _fabricCommon.Utils.newCryptoSuite();
    // let publicKey = await cryptoSuite.createKeyFromRaw(userJson.credentials.certificate);
    // let identity = new _fabricCommon.Identity(userJson.credentials.certificate, publicKey, userJson.mspId, cryptoSuite);
    // let user = new _fabricCommon.User(_userName);
    // user._cryptoSuite = cryptoSuite;
    // user._identity = identity;

    console.log(user);
    let userContext = gateway.client.newIdentityContext(user);
    // userContext.client.mspid = mspOrg1;
    console.log(userContext);

    let endorsement = accessControlChannel.channel.newEndorsement('access-control-chaincode');
    let proposalBytes = endorsement.build(userContext, {
        fcn: 'getPermission',
        args: [address]
    });
    console.log(proposalBytes);

    const hash = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    const ecdsa = new elliptic.ec(elliptic.curves['p256']);
    const temp = fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8');
    console.log(temp);
    const { prvKeyHex } = KEYUTIL.getKey(temp);
    console.log(prvKeyHex);
    const signKey = ecdsa.keyFromPrivate(prvKeyHex, 'hex');
    const signature = ecdsa.sign(Buffer.from(hash, 'hex'), signKey, { canonical: true });
    const signatureDER = Buffer.from(signature.toDER());
    console.log(signatureDER.toString());

    endorsement.sign(signatureDER);

    console.log(accessControlChannel.channel.getEndorsers());


    const proposalRespone = await endorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    console.log('proposalResponse', proposalRespone);

    let commit = endorsement.newCommit();
    let commitBytes = commit.build(userContext);
    let commitHash = crypto.createHash('sha256')
        .update(commitBytes)
        .digest('hex');
    const commitSignature = ecdsa.sign(Buffer.from(commitHash, 'hex'), signKey, { canonical: true });
    const commitSignatureDER = Buffer.from(commitSignature.toDER());
    const temp123 = commit.sign(commitSignatureDER);
    console.log(temp123);
    const commitResponse = await commit.send({
        requestTimeout: 300000,
        targets: accessControlChannel.channel.getCommitters()
    });
    console.log(commitResponse);

    // const userJson = await wallet.get(address);
    // console.log('userJson =', userJson);

    // const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    // console.log('user =', user);

    // const userContext = gateway.client.newIdentityContext(user);

    // const endorsement = accessControlChannel.channel.newEndorsement('access-control-chaincode');
    // const proposalBytes = endorsement.build(userContext, {
    //     fcn: '_get',
    //     args: [address]
    // });
    // const hashedProposalBytes = crypto.createHash('sha256')
    //     .update(proposalBytes)
    //     .digest('hex');

    // const keyFile = fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8');
    // const key = KEYUTIL.getKey(keyFile).prvKeyHex;

    // const ecdsa = new elliptic.ec(elliptic.curves['p256']);
    // const signKey = ecdsa.keyFromPrivate(key, 'hex');
    // const signature = ecdsa.sign(Buffer.from(hashedProposalBytes, 'hex'), signKey, { canonical: true });
    // const signatureDer = Buffer.from(signature.toDER());

    // endorsement.sign(signatureDer);
    // const endorsers = accessControlChannel.channel.getEndorsers();
    // const proposalResponse = await endorsement.send({ targets: endorsers });
    // console.log('proposalResponse', proposalResponse);

    // const commit = endorsement.newCommit();
    // const commitBytes = commit.build(userContext);
    // const commitHash = crypto.createHash('sha256')
    //     .update(commitBytes)
    //     .digest('hex');
    // const commitSignature = ecdsa.sign(Buffer.from(commitHash, 'hex'), { canonical: true });
    // const commitSignatureDer = Buffer.from(commitSignature.toDER());
    // commit.sign(commitSignatureDer)
    // const commiters = accessControlChannel.channel.getCommitters();
    // const commitResponse = await commit.send({
    //     requestTimeout: 300000,
    //     targets: commiters
    // });
    // console.log(commitResponse);

    res.redirect('/app/index');
});

module.exports = router;

// openssl ecparam -name prime256v1 -genkey -noout -out key.pem
// openssl req -new -sha256 -key key.pem -nodes -nodes -out key.csr
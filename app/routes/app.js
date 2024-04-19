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
const sqlite3 = require('sqlite3').verbose();

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

let offlineSigningEndorsement;
let offlineSigningCommit;

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

let db;

async function initDatabase() {
    // connect  to database
    db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (error) {
        if (error) {
            console.log(error);
        }
        else {
            console.log('succcessfully connected to database');
        }
    });

    // create table in database
    db.serialize(function () {
        db.run('CREATE TABLE IF NOT EXISTS header (user_id TEXT, data TEXT)');
        db.run('CREATE TABLE IF NOT EXISTS gene (user_id TEXT, chrom TEXT, pos TEXT, id TEXT, ref TEXT, alt TEXT, qual TEXT, filter TEXT, info TEXT, format TEXT)');
    });
}

async function iiiiint() {
    await init();
    await initDatabase();
}
// init();
// initDatabase();
iiiiint();

async function createTransaction(_userName, _wallet, _fabricCommon) {
    // const a = await accessControlContract.evaluateTransaction('updatePermission', address, );




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
        fcn: 'updatePermission',
        args: ['0x3e014e5c311a7d6f652ca4f8bb016f4338a44118', '{chr3: 2}']
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

    const userJson = await wallet.get(address);
    const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    const endorsement = accessControlChannel.channel.newEndorsement('access-control-chaincode');
    const proposalBytes = endorsement.build(userContext, {
        fcn: 'updatePermission',
        args: [address, permission]
    });
    const hashedProposalBytes = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    const keyFile = fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8');
    const key = KEYUTIL.getKey(keyFile).prvKeyHex;
    const ecdsa = new elliptic.ec(elliptic.curves['p256']);
    const signKey = ecdsa.keyFromPrivate(key, 'hex');
    const signature = ecdsa.sign(Buffer.from(hashedProposalBytes, 'hex'), signKey, { canonical: true });
    endorsement.sign(Buffer.from(signature.toDER()));

    const proposalResponse = await endorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    console.log('proposalResponse =', proposalResponse);

    const commit = endorsement.newCommit();
    const commitBytes = commit.build(userContext);
    const hashedCommitBytes = crypto.createHash('sha256')
        .update(commitBytes)
        .digest('hex');
    const commitSignature = ecdsa.sign(Buffer.from(hashedCommitBytes, 'hex'), signKey, { canonical: true });
    commit.sign(Buffer.from(commitSignature.toDER()));
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

router.post('/manage/update_permission/get_endorsement', async function (req, res) {
    // get user's address and permission
    const address = req.body.address;
    const permission = req.body.permission;
    console.log('address =', address);
    console.log('permission =', permission);

    // get user info from local wallet
    const userJson = await wallet.get(address);
    const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    // create a new endorsement proposal
    offlineSigningEndorsement = accessControlChannel.channel.newEndorsement('access-control-chaincode');
    const proposalBytes = offlineSigningEndorsement.build(userContext, {
        fcn: 'updatePermission',
        args: [address, permission]
    });

    // hash the proposal
    const hashedProposalBytes = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    // send hashed proposal to client side
    res.send({ data: hashedProposalBytes });
});

router.post('/manage/update_permission/get_commit', async function (req, res) {
    // get user's address and signed proposal
    const address = req.body.address;
    const endorsementSignatureDer = req.body.endorsementSignatureDer;
    console.log('address =', address);
    console.log('endorsementSignatureDer =', endorsementSignatureDer);

    // form endorsor object, and send it
    offlineSigningEndorsement.sign(Buffer.from(endorsementSignatureDer));
    const proposalResponse = await offlineSigningEndorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    console.log('proposalResponse =', proposalResponse);

    const userJson = await wallet.get(address);
    const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    // create a new commit
    offlineSigningCommit = offlineSigningEndorsement.newCommit();
    const commitBytes = offlineSigningCommit.build(userContext);

    // hash the commit
    const hashedCommitBytes = crypto.createHash('sha256')
        .update(commitBytes)
        .digest('hex');

    // send the commit to client side
    res.send({ data: hashedCommitBytes });
});

router.post('/manage/update_permission/send_commit', async function (req, res) {
    // get user's signed commit
    const commitSignatureDer = req.body.commitSignatureDer;
    console.log('commitSignature =', commitSignatureDer);

    // form commiter object, and send it
    offlineSigningCommit.sign(Buffer.from(commitSignatureDer));
    const commitResponse = await offlineSigningCommit.send({
        requestTimeout: 300000,
        targets: accessControlChannel.channel.getCommitters()
    });
    console.log(commitResponse);

    // send the result to client side
    res.send({ data: commitResponse });
});

router.get('/upload', async function (req, res, next) {
    res.render('app_upload');
});

router.post('/upload', async function (req, res) {
    // get data owner's id and data
    const id = req.body.dna_owner_id;
    const data = req.body.dna_owner_data;

    // separate header part and record part
    const dataLines = data.split(/\r\n/);
    const headers = dataLines.filter(function (dataLine) { return dataLine.slice(0, 2) == '##'; });
    const records = dataLines.filter(function (dataLine) { return dataLine[0] != '#'; });

    // insert data into database
    db.serialize(function () {
        db.run('INSERT INTO header VALUES(?,?)', [id, headers.join('\r\n')]);
        for (const record of records) {
            const items = record.split(/\s+/);
            db.run('INSERT INTO gene VALUES(?,?,?,?,?,?,?,?,?,?)', 
                [id, items[0], items[1], items[2], items[3], items[4], items[5], items[6], items[7], items.slice(8).join('\t')]);
        }
    });
});

router.get('/download', async function (req, res, next) {
    res.render('app_download');
});

router.post('/download', async function (req, res) {
    const address = req.body.address;
    const message = req.body.message;
    const signature = req.body.signature;
    const chrom = req.body.chrom;
    const tags = req.body.tags;
    console.log(address);
    console.log(message);
    console.log(signature);
    console.log('chrom =', chrom);
    console.log('tag =', tag);

    const web3 = new Web3(DID_CONFIG.URL);
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    if (recoveredAddress.toLowerCase() != address.toLowerCase()) {
        console.log("Fail to verify the signature.");
        console.log(recoveredAddress, address);
        res.redirect('/app/register');
        return;
    }
    res.send({ data: 'ok' });
});

module.exports = router;

// openssl ecparam -name prime256v1 -genkey -noout -out key.pem
// openssl req -new -sha256 -key key.pem -nodes -nodes -out key.csr
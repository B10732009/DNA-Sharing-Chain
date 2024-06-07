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
const openssl = require('openssl-nodejs');
const sqlite3 = require('sqlite3').verbose();
const DID_CONFIG = require('../public/javascripts/did_config');
const IDENTITY_MANAGER_ABI = require('../public/javascripts/IdentityManager.abi');
const IDENTITY_ABI = require('../public/javascripts/Identity.abi');

//=== app chain initialization ===//

const channelName = 'access-control-channel';
const patientChaincodeName = 'patient-access-control-chaincode';
const researchInstituteChaincodeName = 'research-institute-access-control-chaincode';
const mspOrg1 = 'Org1MSP';
const org1UserId = 'governmentPeerNode';
const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';
let caClient;
let wallet;
let gateway;
let accessControlChannel;
let patientAccessControlContract;
let researchInstituteAccessControlContract;
let offlineSigningEndorsement;
let offlineSigningCommit;

async function initAppChain() {
    // build CCP
    const ccpPath = path.join(__dirname, '..', '..', 'app_chain', 'fablo-target', 'fabric-config', 'connection-profiles', 'connection-profile-org1.json');
    if (!fs.existsSync(ccpPath)) {
        throw new Error(`no such file or directory: ${ccpPath}`);
    }
    const ccpContent = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpContent);
    console.log(`[APP] Loaded the network configuration located at ${ccpPath}.`);

    // build CA client
    const caHostName = 'ca.org1.example.com';
    const caInfo = ccp.certificateAuthorities[caHostName];
    caClient = new FabricCaServices(caInfo.url, { verify: false }, caInfo.caName);
    console.log(`[APP] Built a CA Client named ${caInfo.caName}.`);

    // create a wallet
    const walletPath = path.join(__dirname, 'wallet');
    if (walletPath) {
        wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`[APP] Built a file system wallet at ${walletPath}.`);
    }
    else {
        wallet = await Wallets.newInMemoryWallet();
        console.log(`[APP] Built an in memory wallet.`);
    }

    // enroll administrator
    if (await wallet.get(adminUserId)) {
        console.log('[APP] An identity for the admin user already exists in the wallet.');
    }
    else {
        const enrollment = await caClient.enroll({
            enrollmentID: adminUserId,
            enrollmentSecret: adminUserPasswd
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspOrg1,
            type: 'X.509',
        };
        await wallet.put(adminUserId, x509Identity);
        console.log('[APP] Successfully enrolled admin user and imported it into the wallet.');
    }

    // register and enroll goverment peer node
    if (await wallet.get(org1UserId)) {
        console.log(`[APP] An identity for the user {${org1UserId}} already exists in the wallet.`);
    }
    else {
        // create a admin user object for registering
        const adminIdentity = await wallet.get(adminUserId);
        const adminUser = await wallet.getProviderRegistry()
            .getProvider(adminIdentity.type)
            .getUserContext(adminIdentity, adminUserId);

        // register and enroll user
        const secret = await caClient.register({
            affiliation: null, // affiliation,
            enrollmentID: org1UserId,
            role: 'client'
        }, adminUser);
        const enrollment = await caClient.enroll({
            enrollmentID: org1UserId,
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspOrg1,
            type: 'X.509',
        };
        await wallet.put(org1UserId, x509Identity);
        console.log(`[APP] Successfully registered and enrolled user {${org1UserId}} and imported it into the wallet.`);
    }

    try {
        // build connection
        gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: {
                enabled: true,
                asLocalhost: true  // using asLocalhost as this gateway is using a fabric network deployed locally
            }
        });

        // build channel and contract instance
        accessControlChannel = await gateway.getNetwork(channelName);
        patientAccessControlContract = accessControlChannel.getContract(patientChaincodeName);
        researchInstituteAccessControlContract = accessControlChannel.getContract(researchInstituteChaincodeName);
    }
    catch (error) {
        console.log(error);
    }
}

//=== database initialization ===//

let db;

async function initDatabase() {
    // connect to database
    db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (error) {
        if (error) {
            console.log(error);
        }
        else {
            console.log('[APP] Successfully connected to database.');
        }
    });

    // create table in database
    db.serialize(function () {
        db.run('CREATE TABLE IF NOT EXISTS header (user_id TEXT, data TEXT)');
        db.run('CREATE TABLE IF NOT EXISTS gene (user_id TEXT, chrom TEXT, pos TEXT, id TEXT, ref TEXT, alt TEXT, qual TEXT, filter TEXT, info TEXT, format TEXT)');
    });
}

async function dbAll(queryStr, queryParams) {
    return new Promise(function (resolve, reject) {
        db.all(queryStr, queryParams, function (error, rows) {
            if (error) {
                reject(error);
            }
            else {
                resolve(rows);
            }
        });
    });
}

async function init() {
    await initAppChain();
    await initDatabase();
}

init();

async function decodeCsr(csr) {
    return new Promise(function (resolve, reject) {
        openssl(['req', '-text', '-in', { name: 'key.csr', buffer: Buffer.from(csr) }, '-pubkey'], function (error, buffer) {
            resolve(buffer.toString());
        });
    });
}

router.get('/index', function (req, res, next) {
    res.render('app_index');
});

router.get('/', function (req, res, next) {
    res.redirect('/app/index');
});

router.get('/register', function (req, res, next) {
    res.render('app_register');
});

router.post('/register', async function (req, res) {
    const type = req.body.type;
    const address = req.body.address;
    const message = req.body.message;
    const signature = req.body.signature;
    const appEncryptedCsr = req.body.appEncryptedCsr;
    console.log('[APP] type =', type);
    console.log('[APP] address =', address);
    console.log('[APP] message =', message);
    console.log('[APP] signature =', signature);
    console.log('[APP] appEncryptedCsr =', appEncryptedCsr);

    try {
        // verify signature
        const web3 = new Web3(DID_CONFIG.URL);
        const recoveredAddress = web3.eth.accounts.recover(message, signature);
        console.log('[APP] recoveredAddress.toLowerCase() =', recoveredAddress.toLowerCase());
        if (recoveredAddress.toLowerCase() != address.toLowerCase()) {
            console.log('[APP] Fail to verify the signature.');
            res.send({ error: 'Fail to verify the signature.' });
            return;
        }
        console.log('[APP] Successfully verified the signature.');

        // verify type
        const identityManagerContract = new web3.eth.Contract(IDENTITY_MANAGER_ABI, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
        const didType = await identityManagerContract.methods.getUserType(address)
            .call({ from: address })
            .catch(function (error) { console.log(error); });
        if ((`${didType}` == '1' && type != 'patient') || (`${didType}` == 2 && type != 'research_institute')) {
            console.log('[APP] Did type error.');
            res.send({ error: 'Did type error.' });
            return;
        }

        // decrypt csr
        const csr = EthSigUtil.decrypt(JSON.parse(appEncryptedCsr), DID_CONFIG.ORG.PRVKEY);
        console.log('[APP] csr =', csr);

        // decode csr and retrieve common name
        const decodedCsr = await decodeCsr(csr);
        const decodeCsrMatches = decodedCsr.match(/CN\s*=\s*([^\n]+)/);
        const cn = decodeCsrMatches[1];
        console.log('[APP] cn =', cn);

        // get admin user
        const adminIdentity = await wallet.get(adminUserId);
        if (!adminIdentity) {
            console.log('[APP] Fail to find admin user in wallet.');
            res.send({ error: 'Fail to find admin user in wallet.' });
            return;
        }
        const adminUser = await wallet.getProviderRegistry()
            .getProvider(adminIdentity.type)
            .getUserContext(adminIdentity, adminUserId);

        // register a new user with provided csr
        const secret = await caClient.register({
            affiliation: null,
            attrs: [{
                name: 'category',
                value: 'governmentPeerNode',
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
        console.log('[APP] Successfully created a new user in the wallet');

        // create a new user object on app chain
        let createUserResult;
        if (type == 'patient') {
            createUserResult = await patientAccessControlContract.submitTransaction('createUser', address);
        }
        else {
            createUserResult = await researchInstituteAccessControlContract.submitTransaction('createUser', address, 3);
        }
        const createUserResultJson = JSON.parse(createUserResult.toString());
        console.log('[APP] createUserResultJson =', createUserResultJson);
        if (createUserResultJson.success) {
            res.send({ success: 'ok' });
        }
        else {
            res.send({ error: 'error' });
        }
    }
    catch (error) {
        console.log(error);
    }
});

router.get('/manage', function (req, res, next) {
    res.render('app_manage');
});

router.post('/manage/get_permission', async function (req, res) {
    // get user's address
    const address = req.body.address;
    console.log('[APP] address =', address);

    // get permission from app chain
    const permission = await patientAccessControlContract.evaluateTransaction('getAccessLevelList', address);
    const permissionJson = JSON.parse(permission.toString());
    console.log('[APP] permissionJson =', permissionJson);

    res.send({ data: permissionJson.data });
});

router.post('/manage/update_permission/get_endorsement', async function (req, res) {
    // get user's address and permission
    const address = req.body.address;
    const permission = req.body.permission;
    console.log('[APP] address =', address);
    console.log('[APP] permission =', permission);

    // get user info from local wallet
    const userJson = await wallet.get(address);
    const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    // create a new endorsement proposal
    offlineSigningEndorsement = accessControlChannel.channel.newEndorsement('patient-access-control-chaincode');
    const proposalBytes = offlineSigningEndorsement.build(userContext, {
        fcn: 'updateAccessLevelList',
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
    console.log('[APP] address =', address);
    console.log('[APP] endorsementSignatureDer =', endorsementSignatureDer);

    // form endorsor object, and send it
    offlineSigningEndorsement.sign(Buffer.from(endorsementSignatureDer));
    const proposalResponse = await offlineSigningEndorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    console.log('[APP] proposalResponse =', proposalResponse);

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
    console.log('[APP] commitSignature =', commitSignatureDer);

    // form commiter object, and send it
    offlineSigningCommit.sign(Buffer.from(commitSignatureDer));
    const commitResponse = await offlineSigningCommit.send({
        requestTimeout: 300000,
        targets: accessControlChannel.channel.getCommitters()
    });
    console.log('[APP] commitResponse =', commitResponse);

    // send the result to client side
    res.send({ data: commitResponse });
});

router.get('/upload', async function (req, res, next) {
    res.render('app_upload');
});

router.post('/upload', async function (req, res) {
    // get data owner's id and data
    const id = req.body.id;
    const data = req.body.data;
    console.log('[APP] id =', id);
    console.log('[APP] data =', data);

    // get hashed id
    const hashedId = crypto.createHash('sha256')
        .update(id.toString())
        .digest('hex');

    // separate header part and record part
    const dataLines = data.split(/\n/g);
    const headers = dataLines.filter(function (dataLine) { return dataLine[0] == '#'; });
    const records = dataLines.filter(function (dataLine) { return dataLine[0] != '#'; });
    console.log('[APP] headers =', headers);
    console.log('[APP] records =', records);

    // insert data into database
    db.serialize(function () {
        db.run('INSERT INTO header VALUES(?,?)', [hashedId, headers.join('\r\n')]);
        for (const record of records) {
            const items = record.split(/\t/g);
            console.log('[APP] items =', items);
            db.run('INSERT INTO gene VALUES(?,?,?,?,?,?,?,?,?,?)',
                [hashedId, items[0], items[1], items[2], items[3], items[4], items[5], items[6], items[7], items.slice(8).join('\t')]);
        }
        console.log('[APP] Finish inserting data to database.');
    });

    res.send({ success: 'ok' });
});

router.post('/upload_access_ticket', async function (req, res) {
    const id = req.body.id;
    const url = req.body.url;
    const accessTicketList = req.body.accessTicketList;
    console.log('[APP] id =', id);
    console.log('[APP] url =', url);
    console.log('[APP] accessTicketList =', accessTicketList);

    const updateAccessTicketListResult = await patientAccessControlContract.submitTransaction('updateAccessTicketList', id, accessTicketList);
    const updateAccessTicketListResultJson = JSON.parse(updateAccessTicketListResult.toString());
    console.log('[APP] updateAccessTicketListResultJson =', updateAccessTicketListResultJson);
    if (updateAccessTicketListResultJson.success) {
        res.send({ success: 'ok' });
    }
    else {
        res.send({ error: 'error' });
    }
});

router.get('/download', async function (req, res, next) {
    res.render('app_download');
});

router.post('/download', async function (req, res) {
    // get user's address, message, signature, chromsome ranges, tags
    const address = req.body.address;
    const message = req.body.message;
    const signature = req.body.signature;
    const chromRanges = req.body.chromRanges;
    console.log('[APP] address =', address);
    console.log('[APP] message =', message);
    console.log('[APP] signature =', signature);
    console.log('[APP] chromRanges =', chromRanges);

    // verify signature with message
    const web3 = new Web3(DID_CONFIG.URL);
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    if (recoveredAddress.toLowerCase() != address.toLowerCase()) {
        console.log("Fail to verify the signature.");
        console.log(recoveredAddress, address);
        res.redirect('/app/register');
        return;
    }

    // get research institute's level
    const getLevelRes = await researchInstituteAccessControlContract.evaluateTransaction('getAccessLevel', address);
    const getLevelResJson = JSON.parse(getLevelRes.toString());
    if (getLevelResJson.error) {
        console.log('[APP] Fail to get level:', getLevelResJson.error);
        res.send({ error: getLevelResJson.error });
        return;
    }
    const level = parseInt(getLevelResJson.data);
    console.log('[APP] level =', level);

    // create a array containing all target chroms
    let chroms = [];
    const splittedChromRanges = chromRanges.split(',');
    for (const chromRange of splittedChromRanges) {
        const splittedChromRange = chromRange.split('-');
        const start = parseInt(splittedChromRange[0]);
        const end = parseInt(splittedChromRange[1]);
        for (let i = start; i <= end; i++) {
            chroms.push(`chr${i}`);
        }
    }

    // create query
    let query = {
        'selector': {
            'accessLevelList': {}
        }
    };
    for (const chrom of chroms) {
        query.selector.accessLevelList[chrom] = { '$lt': level + 1 };
    }

    // query permission from app chain
    const queryResultBuffer = await patientAccessControlContract.evaluateTransaction('queryAccessLevelList', JSON.stringify(query));
    const queryResult = JSON.parse(queryResultBuffer.toString());
    console.log('[APP] queryResult =', queryResult);
    console.log('[APP] queryResult.data =', queryResult.data);

    const identityManagerContract = new web3.eth.Contract(IDENTITY_MANAGER_ABI, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
    for (let i = 0; i < queryResult.data.length; i++) {
        const userId = await identityManagerContract.methods.getUserId(queryResult.data[i].key)
            .call({ from: queryResult.data[i].key })
            .catch(function (error) { console.log(error); });
        console.log('[APP] userId =', userId);

        queryResult.data[i].key = userId;
        queryResult.data[i].value = queryResult.data[i].value.accessTicketList;
    }

    // // query data from database
    // const identityManagerContract = new web3.eth.Contract(IDENTITY_MANAGER_ABI, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
    // for (let i = 0; i < queryResult.data.length; i++) {
    //     // get user (hashed) id
    //     const userId = await identityManagerContract.methods.getUserId(queryResult.data[i].key)
    //         .call({ from: queryResult.data[i].key })
    //         .catch(function (error) { console.log(error); });
    //     console.log('[APP] userId =', userId);

    //     queryResult.data[i].key = userId;

    //     // query data of current target user
    //     const headerObject = await dbAll('SELECT * FROM header WHERE user_id = ?', [userId]);
    //     const recordObject = await dbAll(`SELECT * FROM gene WHERE user_id = ? AND chrom IN (?${',?'.repeat(chroms.length - 1)})`, [userId].concat(chroms));
    //     console.log('[APP] headerObject =', headerObject);
    //     console.log('[APP] recordObject =', recordObject);

    //     // build file text
    //     queryResult.data[i].value = '';
    //     for (const header of headerObject) {
    //         queryResult.data[i].value += header.data;
    //     }
    //     queryResult.data[i].value += '\\r\\n';
    //     for (const record of recordObject) {
    //         queryResult.data[i].value += record.chrom + '\t'
    //             + record.pos + '\t'
    //             + record.id + '\t'
    //             + record.ref + '\t'
    //             + record.alt + '\t'
    //             + record.qual + '\t'
    //             + record.filter + '\t'
    //             + record.info + '\t'
    //             + record.format + '\r\n';
    //     }
    //     queryResult.data[i].value = queryResult.data[i].value.replace(/"/g, '\\"')
    //         .replace(/\r/g, '\\r')
    //         .replace(/\n/g, '\\n');
    //     console.log('[APP] queryResult.data[i].value =', queryResult.data[i].value);
    // }

    // send data back to front end
    res.send({ data: queryResult.data });
});

router.post('/download/request_dna_sequences', async function (req, res) {
    const requestTicket = req.body.requestTicket;
    console.log('[APP] requestTicket =', requestTicket);

    const requesyTicketJson = JSON.parse(requestTicket);
    console.log('[APP] requesyTicketJson =', requesyTicketJson);

    // query data of current target user
    const headerObject = await dbAll('SELECT * FROM header WHERE user_id = ?', [requesyTicketJson.id]);
    const recordObject = await dbAll(`SELECT * FROM gene WHERE user_id = ? AND chrom IN (?)`, [requesyTicketJson.id, requesyTicketJson.chrom]);
    console.log('[APP] headerObject =', headerObject);
    console.log('[APP] recordObject =', recordObject);

    let data = "";
    for (const header of headerObject) {
        data += header.data;
    }
    data += '\\r\\n';
    for (const record of recordObject) {
        data += record.chrom + '\t'
            + record.pos + '\t'
            + record.id + '\t'
            + record.ref + '\t'
            + record.alt + '\t'
            + record.qual + '\t'
            + record.filter + '\t'
            + record.info + '\t'
            + record.format + '\r\n';
    }

    res.send({ id: requesyTicketJson.id, data: data });
});

module.exports = router;

// openssl ecparam -name prime256v1 -genkey -noout -out key.pem
// openssl req -new -sha256 -key key.pem -nodes -nodes -out key.csr
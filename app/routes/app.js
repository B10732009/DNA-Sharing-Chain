let express = require('express');
let router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const elliptic = require('elliptic');
const EthSigUtil = require('eth-sig-util');
const { KEYUTIL } = require('jsrsasign');
const { Web3 } = require('web3');
const { Gateway, Wallets } = require('fabric-network');
const FabricCaServices = require('fabric-ca-client');
const FabricCommon = require('fabric-common');
const openssl = require('openssl-nodejs');
const sqlite3 = require('sqlite3').verbose();
const didConfig = require('../public/javascripts/did_config');
const appConfig = require(path.join(__dirname, '..', 'public', 'javascripts', 'app_config'));
const identityManagerAbi = require('../public/javascripts/IdentityManager.abi');
const identityAbi = require('../public/javascripts/Identity.abi');

const web3 = new Web3(didConfig.url);
const identityManagerContract = new web3.eth.Contract(identityManagerAbi, didConfig.contracts.identityManager.address);

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
    if (await wallet.get(appConfig.admin.id)) {
        console.log('[APP] An identity for the admin user already exists in the wallet.');
    }
    else {
        const enrollment = await caClient.enroll({
            enrollmentID: appConfig.admin.id,
            enrollmentSecret: appConfig.admin.password
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: appConfig.mspId,
            type: 'X.509',
        };
        await wallet.put(appConfig.admin.id, x509Identity);
        console.log('[APP] Successfully enrolled admin user and imported it into the wallet.');
    }

    // register and enroll goverment peer node
    if (await wallet.get(appConfig.orgUserId)) {
        console.log(`[APP] An identity for the user {${appConfig.orgUserId}} already exists in the wallet.`);
    }
    else {
        // create a admin user object for registering
        const adminIdentity = await wallet.get(appConfig.admin.id);
        const adminUser = await wallet.getProviderRegistry()
            .getProvider(adminIdentity.type)
            .getUserContext(adminIdentity, appConfig.admin.id);

        // register and enroll user
        const secret = await caClient.register({
            affiliation: null, // affiliation,
            enrollmentID: appConfig.orgUserId,
            role: 'client'
        }, adminUser);
        const enrollment = await caClient.enroll({
            enrollmentID: appConfig.orgUserId,
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: appConfig.mspId,
            type: 'X.509',
        };
        await wallet.put(appConfig.orgUserId, x509Identity);
        console.log(`[APP] Successfully registered and enrolled user {${appConfig.orgUserId}} and imported it into the wallet.`);
    }

    try {
        // build connection
        gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: appConfig.orgUserId,
            discovery: {
                enabled: true,
                asLocalhost: true  // using asLocalhost as this gateway is using a fabric network deployed locally
            }
        });

        // build channel and contract instance
        accessControlChannel = await gateway.getNetwork(appConfig.channels.accessControl.name);
        patientAccessControlContract = accessControlChannel.getContract(appConfig.chaincodes.patientAccessControl.name);
        researchInstituteAccessControlContract = accessControlChannel.getContract(appConfig.chaincodes.researchInstituteAccessControl.name);
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
        const recoveredAddress = web3.eth.accounts.recover(message, signature);
        console.log('[APP] recoveredAddress.toLowerCase() =', recoveredAddress.toLowerCase());
        if (recoveredAddress.toLowerCase() != address.toLowerCase()) {
            console.log('[APP] Fail to verify the signature.');
            res.send({ error: 'Fail to verify the signature.' });
            return;
        }
        console.log('[APP] Successfully verified the signature.');

        // verify type
        const didType = await identityManagerContract.methods.getUserType(address)
            .call({ from: address })
            .catch(function (error) { console.log(error); });
        if ((`${didType}` == '1' && type != 'patient') || (`${didType}` == '2' && type != 'research_institute')) {
            console.log('[APP] Did type error.');
            res.send({ error: 'Did type error.' });
            return;
        }

        // decrypt csr
        const csr = EthSigUtil.decrypt(JSON.parse(appEncryptedCsr), didConfig.orgs.health.prvkey);
        console.log('[APP] csr =', csr);

        // decode csr and retrieve common name
        const decodedCsr = await decodeCsr(csr);
        const decodeCsrMatches = decodedCsr.match(/CN\s*=\s*([^\n]+)/);
        const cn = decodeCsrMatches[1];
        console.log('[APP] cn =', cn);

        // get admin user
        const adminIdentity = await wallet.get(appConfig.admin.id);
        if (!adminIdentity) {
            console.log('[APP] Fail to find admin user in wallet.');
            res.send({ error: 'Fail to find admin user in wallet.' });
            return;
        }
        const adminUser = await wallet.getProviderRegistry()
            .getProvider(adminIdentity.type)
            .getUserContext(adminIdentity, appConfig.admin.id);

        // register a new user with provided csr
        const secret = await caClient.register({
            affiliation: null,
            attrs: [{
                name: 'category',
                value: 'Peer',
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
            mspId: appConfig.mspId,
            type: 'X.509',
        };

        const id = await identityManagerContract.methods.getUserId(address)
            .call({ from: address })
            .catch(function (error) { console.log(error); });
        await wallet.put(id, x509Identity);
        console.log('[APP] Successfully created a new user in the wallet');

        // create a new access control object on app chain
        let createUserResult;
        if (type == 'patient') {
            createUserResult = await patientAccessControlContract.submitTransaction('createUser', id);
        }
        else {
            const accessLevel = 3; // should be granted by government
            createUserResult = await researchInstituteAccessControlContract.submitTransaction('createUser', id, accessLevel);
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

router.post('/manage/get_access_level_list', async function (req, res) {
    // get user id
    const id = req.body.id;
    console.log('[APP] id =', id);

    // get access level list from app chain
    const accessLevelList = await patientAccessControlContract.evaluateTransaction('getAccessLevelList', id);
    const accessLevelListJson = JSON.parse(accessLevelList.toString());
    console.log('[APP] accessLevelListJson =', accessLevelListJson);
    res.send({ data: accessLevelListJson.data });
});

router.post('/manage/update_access_level_list/get_endorsement', async function (req, res) {
    // get user's address and permission
    const id = req.body.id;
    const accessLevelList = req.body.accessLevelList;
    console.log('[APP] id =', id);
    console.log('[APP] accessLevelList =', accessLevelList);

    // get user info from local wallet
    const userJson = await wallet.get(id);
    const user = FabricCommon.User.createUser(id, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    // create a new endorsement proposal
    offlineSigningEndorsement = accessControlChannel.channel.newEndorsement('patient-access-control-chaincode');
    const proposalBytes = offlineSigningEndorsement.build(userContext, {
        fcn: 'updateAccessLevelList',
        args: [id, accessLevelList]
    });

    // hash the proposal
    const hashedProposalBytes = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    // send hashed proposal to client side
    res.send({ data: hashedProposalBytes });
});

router.post('/manage/update_access_level_list/get_commit', async function (req, res) {
    // get user's address and signed proposal
    const id = req.body.id;
    const endorsementSignatureDer = req.body.endorsementSignatureDer;
    console.log('[APP] id =', id);
    console.log('[APP] endorsementSignatureDer =', endorsementSignatureDer);

    // form endorsor object, and send it
    offlineSigningEndorsement.sign(Buffer.from(endorsementSignatureDer));
    const proposalResponse = await offlineSigningEndorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    console.log('[APP] proposalResponse =', proposalResponse);

    const userJson = await wallet.get(id);
    const user = FabricCommon.User.createUser(id, null, userJson.mspId, userJson.credentials.certificate, null);
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

router.post('/manage/update_access_level_list/send_commit', async function (req, res) {
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

router.post('/upload/upload_dna_sequences', async function (req, res) {
    // get data owner's id and data
    const id = req.body.id;
    const data = req.body.data;
    console.log('[APP] id =', id);
    console.log('[APP] data =', data);

    // separate header and records
    const dataLines = data.split(/\n/g);
    const headers = dataLines.filter(function (dataLine) { return dataLine[0] == '#'; });
    const records = dataLines.filter(function (dataLine) { return dataLine[0] != '#'; });
    console.log('[APP] headers =', headers);
    console.log('[APP] records =', records);

    // insert data into database
    db.serialize(function () {
        db.run('INSERT INTO header VALUES(?,?)', [id, headers.join('\r\n')]);
        for (const record of records) {
            const items = record.split(/\t/g);
            console.log('[APP] items =', items);
            db.run('INSERT INTO gene VALUES(?,?,?,?,?,?,?,?,?,?)',
                [id, items[0], items[1], items[2], items[3], items[4], items[5], items[6], items[7], items.slice(8).join('\t')]);
        }
        console.log('[APP] Finish inserting data to database.');
    });

    res.send({ success: 'ok' });
});

router.post('/upload/upload_access_ticket', async function (req, res) {
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

router.post('/download/query_access_tickets', async function (req, res) {
    // get user's address, message, signature, chromsome ranges, tags
    const id = req.body.id;
    const address = req.body.address;
    const message = req.body.message;
    const signature = req.body.signature;
    const chromRanges = req.body.chromRanges;
    console.log('[APP] id =', id);
    console.log('[APP] address =', address);
    console.log('[APP] message =', message);
    console.log('[APP] signature =', signature);
    console.log('[APP] chromRanges =', chromRanges);

    // verify signature with message
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    if (recoveredAddress.toLowerCase() != address.toLowerCase()) {
        console.log("Fail to verify the signature.");
        console.log(recoveredAddress, address);
        return;
    }

    // get research institute's level
    const getLevelRes = await researchInstituteAccessControlContract.evaluateTransaction('getAccessLevel', id);
    const getLevelResJson = JSON.parse(getLevelRes.toString());
    if (getLevelResJson.error) {
        console.log('[APP] Fail to get level:', getLevelResJson.error);
        res.send({ error: getLevelResJson.error });
        return;
    }
    const level = parseInt(getLevelResJson.data);
    console.log('[APP] level =', level);

    // create an array containing all target chroms
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
            'accessLevelList': {
            }
        }
    };
    for (const chrom of chroms) {
        query.selector.accessLevelList[chrom] = { '$lt': level + 1 };
    }

    // query access levels from app chain
    const queryResultBuffer = await patientAccessControlContract.evaluateTransaction('queryAccessLevelList', JSON.stringify(query));
    const queryResult = JSON.parse(queryResultBuffer.toString());
    console.log('[APP] queryResult =', queryResult);
    console.log('[APP] queryResult.data =', queryResult.data);
    for (let i = 0; i < queryResult.data.length; i++) {
        queryResult.data[i].value = queryResult.data[i].value.accessTicketList;
    }
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

router.post('/test/patientAccessControlContract/createUser', async function (req, res) {
    // console.log(req.body);
    const address = '123'
    const createUserResult = await patientAccessControlContract.submitTransaction('createUser', address);
    const createUserResultJson = JSON.parse(createUserResult.toString());
    if (createUserResultJson.success) {
        res.send({ success: 'ok' });
    }
    else {
        res.send({ error: 'error' });
    }
});

router.post('/test/patientAccessControlContract/updateAccessLevelList', async function (req, res) {
    const address = '123';
    const newAccessLevelList = {
        chr1: 4, chr2: 4, chr3: 4, chr4: 4, chr5: 4, chr6: 4,
        chr7: 4, chr8: 4, chr9: 4, chr10: 4, chr11: 4, chr12: 4,
        chr13: 4, chr14: 4, chr15: 4, chr16: 4, chr17: 4, chr18: 4,
        chr19: 4, chr20: 4, chr21: 4, chr22: 4, chr23: 4, chr24: 4
    };
    const result = await patientAccessControlContract.submitTransaction('updateAccessLevelList', address, JSON.stringify(newAccessLevelList));
    const resultJson = JSON.parse(result.toString());
    if (resultJson.success) {
        res.send({ success: 'ok' });
    }
    else {
        res.send({ error: 'error' });
    }
});

router.post('/test/patientAccessControlContract/updateAccessTicketList', async function (req, res) {
    const address = '123';
    const newAccessTicketList = { "id": "5f1059ff008c294b854f44e80bf29af7794725e7f798f92a30e82d80c4f0cf62", "chrom": "chr3" };
    const result = await patientAccessControlContract.submitTransaction('updateAccessTicketList', address, JSON.stringify(newAccessTicketList));
    const resultJson = JSON.parse(result.toString());
    if (resultJson.success) {
        res.send({ success: 'ok' });
    }
    else {
        res.send({ error: 'error' });
    }
});

router.post('/test/aaa', async function (req, res) {
    // init parameters
    const address = '0x3e014e5c311a7d6f652ca4f8bb016f4338a44118';
    const newAccessLevelList = JSON.stringify({
        chr1: 4, chr2: 4, chr3: 4, chr4: 4, chr5: 4, chr6: 4,
        chr7: 4, chr8: 4, chr9: 4, chr10: 4, chr11: 4, chr12: 4,
        chr13: 4, chr14: 4, chr15: 4, chr16: 4, chr17: 4, chr18: 4,
        chr19: 4, chr20: 4, chr21: 4, chr22: 4, chr23: 4, chr24: 4
    });
    const key = '-----BEGIN EC PRIVATE KEY-----MHcCAQEEID+jOFFCJ2kFF3OhhGbRoGCXgnzEJZfaDLf6NMSTGGVJoAoGCCqGSM49AwEHoUQDQgAEik+JGYuww68SVFf+UjFG1V4uEAcvmVpZt66+bXH4qD6Icxyekhc8u+5X5STJjT0uWscOldBPIlkeisdt26JAxw==-----END EC PRIVATE KEY-----';

    // get user info from local wallet
    const userJson = await wallet.get(address);
    const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    // create a new endorsement proposal
    offlineSigningEndorsement = accessControlChannel.channel.newEndorsement('patient-access-control-chaincode');
    const proposalBytes = offlineSigningEndorsement.build(userContext, {
        fcn: 'updateAccessLevelList',
        args: [address, newAccessLevelList]
    });

    // hash the proposal
    const hashedProposalBytes = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    // retrieve private key from key file
    const prvKey = KEYUTIL.getKey(key).prvKeyHex;

    // sign the proposal
    const ecdsa = new elliptic.ec(elliptic.curves['p256']);
    const endorsementSignKey = ecdsa.keyFromPrivate(prvKey, 'hex');
    const endorsementSignature = ecdsa.sign(Buffer.from(hashedProposalBytes, 'hex'), endorsementSignKey, { canonical: true });
    const endorsementSignatureDer = endorsementSignature.toDER();

    // form endorsor object, and send it
    offlineSigningEndorsement.sign(Buffer.from(endorsementSignatureDer));
    const proposalResponse = await offlineSigningEndorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    // console.log('[APP] proposalResponse =', proposalResponse);

    // const userJson = await wallet.get(address);
    // const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    // const userContext = gateway.client.newIdentityContext(user);

    // create a new commit
    offlineSigningCommit = offlineSigningEndorsement.newCommit();
    const commitBytes = offlineSigningCommit.build(userContext);

    // hash the commit
    const hashedCommitBytes = crypto.createHash('sha256')
        .update(commitBytes)
        .digest('hex');

    // sign the commit
    const commitSignature = ecdsa.sign(Buffer.from(hashedCommitBytes, 'hex'), endorsementSignKey, { canonical: true });
    const commitSignatureDer = commitSignature.toDER();

    // form commiter object, and send it
    offlineSigningCommit.sign(Buffer.from(commitSignatureDer));
    const commitResponse = await offlineSigningCommit.send({
        requestTimeout: 300000,
        targets: accessControlChannel.channel.getCommitters()
    });

    res.send({ data: commitResponse });
});

router.post('/test/bbb', async function (req, res) {
    // init parameters
    const address = '0x3e014e5c311a7d6f652ca4f8bb016f4338a44118';
    const newAccessTicketList = JSON.stringify({ "id": "5f1059ff008c294b854f44e80bf29af7794725e7f798f92a30e82d80c4f0cf62", "chrom": "chr3" });
    const key = '-----BEGIN EC PRIVATE KEY-----MHcCAQEEID+jOFFCJ2kFF3OhhGbRoGCXgnzEJZfaDLf6NMSTGGVJoAoGCCqGSM49AwEHoUQDQgAEik+JGYuww68SVFf+UjFG1V4uEAcvmVpZt66+bXH4qD6Icxyekhc8u+5X5STJjT0uWscOldBPIlkeisdt26JAxw==-----END EC PRIVATE KEY-----';

    // get user info from local wallet
    const userJson = await wallet.get(address);
    const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    const userContext = gateway.client.newIdentityContext(user);

    // create a new endorsement proposal
    offlineSigningEndorsement = accessControlChannel.channel.newEndorsement('patient-access-control-chaincode');
    const proposalBytes = offlineSigningEndorsement.build(userContext, {
        fcn: 'updateAccessTicketList',
        args: [address, newAccessTicketList]
    });

    // hash the proposal
    const hashedProposalBytes = crypto.createHash('sha256')
        .update(proposalBytes)
        .digest('hex');

    // retrieve private key from key file
    const prvKey = KEYUTIL.getKey(key).prvKeyHex;

    // sign the proposal
    const ecdsa = new elliptic.ec(elliptic.curves['p256']);
    const endorsementSignKey = ecdsa.keyFromPrivate(prvKey, 'hex');
    const endorsementSignature = ecdsa.sign(Buffer.from(hashedProposalBytes, 'hex'), endorsementSignKey, { canonical: true });
    const endorsementSignatureDer = endorsementSignature.toDER();

    // form endorsor object, and send it
    offlineSigningEndorsement.sign(Buffer.from(endorsementSignatureDer));
    const proposalResponse = await offlineSigningEndorsement.send({ targets: accessControlChannel.channel.getEndorsers() });
    // console.log('[APP] proposalResponse =', proposalResponse);

    // const userJson = await wallet.get(address);
    // const user = FabricCommon.User.createUser(address, null, userJson.mspId, userJson.credentials.certificate, null);
    // const userContext = gateway.client.newIdentityContext(user);

    // create a new commit
    offlineSigningCommit = offlineSigningEndorsement.newCommit();
    const commitBytes = offlineSigningCommit.build(userContext);

    // hash the commit
    const hashedCommitBytes = crypto.createHash('sha256')
        .update(commitBytes)
        .digest('hex');

    // sign the commit
    const commitSignature = ecdsa.sign(Buffer.from(hashedCommitBytes, 'hex'), endorsementSignKey, { canonical: true });
    const commitSignatureDer = commitSignature.toDER();

    // form commiter object, and send it
    offlineSigningCommit.sign(Buffer.from(commitSignatureDer));
    const commitResponse = await offlineSigningCommit.send({
        requestTimeout: 300000,
        targets: accessControlChannel.channel.getCommitters()
    });

    res.send({ data: commitResponse });
});


module.exports = router;

// openssl ecparam -name prime256v1 -genkey -noout -out key.pem
// openssl req -new -sha256 -key key.pem -nodes -nodes -out key.csr
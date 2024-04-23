let express = require('express');
let router = express.Router();
let path = require('path');
let fs = require('fs');
let crypto = require('crypto');
const { Web3 } = require('web3');
const DID_CONFIG = require('../public/javascripts/did_config');
const IDENTITY_MANAGER_ABI = require('../public/javascripts/IdentityManager.abi');
const IDENTITY_ABI = require('../public/javascripts/Identity.abi');

router.get('/index', function (req, res, next) {
    res.render('did_index');
});

router.get('/', function (req, res, next) {
    res.redirect('/did/index');
});

router.get('/register', function (req, res, next) {
    res.render('did_register');
});

router.post('/register', async function (req, res) {
    // get values from post request
    const id = req.body.id;
    const address = req.body.address;
    const type = req.body.type;
    console.log('[DID] id =', id);
    console.log('[DID] address =', address);
    console.log('[DID] type =', type);
    console.log('[DID] create user...');

    // government api
    // create an unique id for user
    const hashedId = crypto.createHash('sha256')
        .update(id.toString())
        .digest('hex');

    try {
        // create identity manager contract instance
        const web3 = new Web3(DID_CONFIG.URL);
        const contract = new web3.eth.Contract(IDENTITY_MANAGER_ABI, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);

        // create a new user
        const tx = {
            gas: 2000000,
            gasPrice: 30000000000,
            data: contract.methods
                .createUser(hashedId, address, type)
                .encodeABI(),
            from: DID_CONFIG.ORG.ADDRESS,
            to: DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS
        }
        const signedTx = await web3.eth.accounts.signTransaction(tx, `0x${DID_CONFIG.ORG.PRVKEY}`);
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        // get events emitted from the contract
        const returnValuesObject = await contract.getPastEvents('IdentityManagerEvent');
        const returnValues = returnValuesObject[0].returnValues;
        console.log('[DID] returnValues =', returnValues);
        if (returnValues.status) {
            res.send({ success: 'ok' });
        }
        else {
            res.send({ error: returnValues.msg });
        }
    }
    catch (error) {
        console.log(error);
    }
});

router.get('/manage', function (req, res, next) {
    res.render('did_manage');
});

module.exports = router;

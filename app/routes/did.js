let express = require('express');
let router = express.Router();
let path = require('path');
let fs = require('fs');
let crypto = require('crypto');
const { Web3 } = require('web3');
const DID_CONFIG = require('../public/javascripts/did_config');

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
    const role = req.body.role;
    console.log(id);
    console.log(address);
    console.log(role);

    // create an unique id for user
    const hashedId = crypto.createHash('sha256')
        .update(id.toString())
        .digest('hex');
    console.log(hashedId);

    // get contract abi
    const identityChainConfigPath = path.join(__dirname, '..', '..', 'config', 'identity_chain_config.json');
    const identityChainConfig = JSON.parse(fs.readFileSync(identityChainConfigPath));
    const contractAbiPath = path.join(__dirname, '..', '..', 'identity_chain', 'build', 'contracts', 'IdentityManager.json')
    const contractAbi = JSON.parse(fs.readFileSync(contractAbiPath)).abi;
    try {
        // create identity manager contract instance
        const web3 = new Web3(DID_CONFIG.URL);
        const contract = new web3.eth.Contract(contractAbi, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
        
        // create a new user
        const tx = {
            gas: 2000000,
            gasPrice: 30000000000,
            data: contract.methods
                .addUser(hashedId, address, role)
                .encodeABI(),
            from: identityChainConfig.orgs.identity_chain.address,
            to: identityChainConfig.contracts.identity_manager.address
        }
        const signedTx = await web3.eth.accounts.signTransaction(tx, identityChainConfig.orgs.identity_chain.key);
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        // // get events emitted from the contract
        const returnValuesObject = await contract.getPastEvents('Result');
        const returnValues = returnValuesObject[0].returnValues;
        console.log(returnValues);

        res.redirect('/did/index');
    }
    catch (error) {
        console.log(error);
    }
});

router.get('/manage', function (req, res, next) {
    res.render('did_manage');
});

module.exports = router;

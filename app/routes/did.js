let express = require('express');
let router = express.Router();
let path = require('path');
let fs = require('fs');
let crypto = require('crypto');
const { Web3 } = require('web3');

router.get('/index', function (req, res, next) {
    res.render('did_index', { title: 'Express' });
});

router.get('/', function (req, res, next) {
    res.redirect('/did/index');
});

router.get('/register', function (req, res, next) {
    res.render('did_register', { title: 'Express' });
});

router.post('/register', async function (req, res) {
    console.log(req.body.id);
    console.log(req.body.address);
    console.log(req.body.role);
    const id = req.body.id;
    const address = req.body.address;
    const role = req.body.role;
    const hashedId = crypto.createHash('sha256')
        .update(id.toString())
        .digest('hex');
    console.log(hashedId);
    const identityChainConfigPath = path.join(__dirname, '..', '..', 'config', 'identity_chain_config.json');
    const identityChainConfig = JSON.parse(fs.readFileSync(identityChainConfigPath));
    const contractAbiPath = path.join(__dirname, '..', '..', 'identity_chain', 'build', 'contracts', 'IdentityManager.json')
    const contractAbi = JSON.parse(fs.readFileSync(contractAbiPath)).abi;
    try {
        const web3 = new Web3(identityChainConfig.url);
        const contract = new web3.eth.Contract(contractAbi, identityChainConfig.contracts.identity_manager.address);
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
        const returnValues = await contract.getPastEvents('Result');
        console.log(returnValues);

        res.redirect('/did/index');
    }
    catch (error) {
        console.log(error);
    }
});

router.get('/manage', function (req, res, next) {
    res.render('did_manage', { title: 'Express' });
});

module.exports = router;

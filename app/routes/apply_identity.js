let express = require('express');
let router = express.Router();
let path = require('path');
let fs = require('fs');
const { Web3 } = require('web3');


router.get('/', function (req, res, next) {
    // res.sendFile(path.join(__dirname, '..', 'views', 'apply_identity.html'));
    res.render('apply_identity', { 'title': 'Express' });
});

router.post('/', async function (req, res) {
    console.log(req.body.username);
    console.log(req.body.id);
    console.log(req.body.address);
    try {
        const identityChainConfigPath = path.join(__dirname, '..', '..', 'config', 'identity_chain_config.json');
        const identityChainConfig = JSON.parse(fs.readFileSync(identityChainConfigPath));
        const contractAbiPath = path.join(__dirname, '..', '..', 'identity_chain', 'build', 'contracts', 'IdentityManager.json')
        const contractAbi = JSON.parse(fs.readFileSync(contractAbiPath)).abi;

        const web3 = new Web3(identityChainConfig.url);
        const contract = new web3.eth.Contract(contractAbi, identityChainConfig.contracts.identity_manager.address);
        const checkUserResult = await contract.methods
            .checkUser(req.body.id, req.body.address)
            .call({ from: identityChainConfig.orgs.identity_chain.address });

        if (!checkUserResult['0']) {
            console.log(`Fail to generate new idenity: ${checkUserResult['1']}`);
            res.redirect('/apply_identity');
        }
        else {
            const addUserResult = await contract.methods
                .addUser(req.body.id, req.body.address)
                .send({
                    from: identityChainConfig.orgs.identity_chain.address,
                    gas: 2000000,
                    gasPrice: 30000000000
                })
                .catch(function (error) {
                    console.log(error);
                });
            console.log(addUserResult);
            console.log('Successfully generate new identity.')
            res.redirect('/index');
        }
    }
    catch (error) {
        console.log(error);
    }
});

module.exports = router;

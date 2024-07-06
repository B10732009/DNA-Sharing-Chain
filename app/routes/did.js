let express = require('express');
let router = express.Router();
const crypto = require('crypto');
const { Web3 } = require('web3');
const didConfig = require('../public/javascripts/did_config');
const identityManagerAbi = require('../public/javascripts/IdentityManager.abi');
const identityAbi = require('../public/javascripts/Identity.abi');

const web3 = new Web3(didConfig.url);
const identityManagerContract = new web3.eth.Contract(identityManagerAbi, didConfig.contracts.identityManager.address);

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
    // get registrar's id, address, type
    const id = req.body.id;
    const address = req.body.address;
    const type = req.body.type;
    console.log('[DID] id =', id);
    console.log('[DID] address =', address);
    console.log('[DID] type =', type);

    // government api
    // create an unique id for user
    const uniqueId = crypto.createHash('sha256')
        .update(id.toString())
        .digest('hex');

    // create user
    await identityManagerContract.methods.createUser(uniqueId, address, type)
        .send({ from: didConfig.orgs.interior.address, gas: 2000000, gasPrice: 30000000000 })
        .catch(function (error) { console.log(error); });

    // get events emitted from the contract
    const returnValuesObject = await identityManagerContract.getPastEvents('IdentityManagerEvent');
    const returnValues = returnValuesObject[0].returnValues;
    console.log('[DID] returnValues =', returnValues);
    if (returnValues.res) {
        res.send({ success: returnValues.msg });
    }
    else {
        res.send({ error: returnValues.msg });
    }
});

router.get('/manage', function (req, res, next) {
    res.render('did_manage');
});

router.post('/test/createUser', async function (req, res) {
    const id = "b123456789";
    const address = "0x75c4fb2e81a6d3420125f5145182f528d1699146";
    const type = "2";
    const uniqueId = crypto.createHash('sha256')
        .update(id.toString())
        .digest('hex');
    await identityManagerContract.methods.createUser(uniqueId, address, type)
        .send({ from: didConfig.ORG.ADDRESS, gas: 2000000, gasPrice: 30000000000 })
        .catch(function (error) { console.log(error); });
    const returnValuesObject = await identityManagerContract.getPastEvents('IdentityManagerEvent');
    res.send({ success: 'ok' });

});

router.post('/test/addDataCsr', async function (req, res) {
    const name = 'CSR';
    const encryptedCsr = '{"version":"x25519-xsalsa20-poly1305","nonce":"XVjrmxBXpcRTVWaI+AMMpyWFeQMOszs+","ephemPublicKey":"HtfFqJOEF+rhN+DTP6hn1/Bwou9kneZwBqcbKKUv/Ek=","ciphertext":"mU0ZcENOnC6bz7buVjW2NaxFkgde4vW4/b4HoQvMk/aAow/DPlwiiDzScqRZrK6g7MI7wLGW9oOBJb1seEta3pTbCg7fXU87b9jm9wVs5noAGk+bSWFv8Q70RNCpIk4Y5xQ9f8qH6CFgkzAkbTo0ea/d1zQYgsB07P6XqVeTgqwcUa5VE1kIC/to9wewkIeR8BvOZuNb4pWVDSl8/mIaCQu0kG0l0EX0464yAtpznA5rei5871J26m/+Z1H0LNLdLsgi2DT2Et6FUrsSmU8QMF1Tbj287UQSK6SlZjgiNUOMicZMYXXmN+fKT3ESRM0OiKq6XuegHUbhVccl9QFcnhxtkhmXVAApX6P5Dehj5GWxrQRfC4qlD2bC4MSxsrV3EyI+upeTKKCrXSeH1kISvKTrjgFz2Wp2hd1LBYARvIvoOwNHIGnTXEmfcJNvcSalqVy54quBjlM1/Vok/7U0fbCkw/c6vHZqASG8k6xd+X4zt0Fe7y2suii0pcPNiX7YeWABfNB8+O077blw99mBUY+O1zZhUCy6wN/z/m8Obkuy4tfPn8MAmUCpPxk7s4H3tEwgY5thDlSGrgpnh849liDmr5BcAAVgkGysMkFetzS7Xab3xSdFIuApSuXOZUm8azUUuDXMxZ7j77bZrw=="}';
    const hashedMsg = '0xdfed2d117d3480382fd791c975618a60c07575f417ea54f46f7a7fb80b58d249'
    const v = 27;
    const r = '0x7b7bbd44b5e0c9b09e9c31ef1f2bdcfc9fb6f2064d71fc520c1677d1a46fd49a';
    const s = '0x3eb4a47b3002db9540bf0028751075731481cfc7fd0755e336a5c3a75412e08b';
    const address = '0x3e014e5c311a7d6f652ca4f8bb016f4338a44118';
    const addDataResult = await identityContract.methods.addData(name, encryptedCsr, hashedMsg, v, r, s)
        .send({ from: address, gas: 2000000, gasPrice: 30000000000 })
        .catch(function (error) { console.log(error); });
    const returnValuesObject = await identityContract.getPastEvents('IdentityEvent');
    res.send({ success: 'ok' });
});

router.post('/test/addDataKey', async function (req, res, next) {
    const name = 'KEY';
    const encryptedKey = '{"version":"x25519-xsalsa20-poly1305","nonce":"VIci+SszlJnoYn+lj80zgDU+Zdz5urVD","ephemPublicKey":"E+1jdqSuEfLKWLtxib47sxtAiriX4xgngZ9mBb+Hymo=","ciphertext":"RNqDDTnWp+gVS+BTl8pZsCB65xTh56s/d9yDxYSuvIjcLzBWa+mri3rlVoZalrf1eakIDLLDajYrBDQ8TAFJ7EBbBA0ClahngeK8BQ+CO/fnkPB1WJvoQTW6/fNcEoaY7xqrwVkSSamUnss3WVMlvGWjx4ZetPvaLFS5Wu6w/oxzaixrsKQJEL++O//txmg9zPJYgAWf5o9ul3YROx7ImjqCLq533ARW2W7OdI/A2ZheONAr7qxaLC0R3y/4LXThpU4cH48xOtWbsS/NHLc5GuHrBjoA+3c32zzChVZVKlO0FFu7d2q1Be2rXCcHLrC7qeEu"}';
    const hashedMsg = '0xdfed2d117d3480382fd791c975618a60c07575f417ea54f46f7a7fb80b58d249'
    const v = 27;
    const r = '0x7b7bbd44b5e0c9b09e9c31ef1f2bdcfc9fb6f2064d71fc520c1677d1a46fd49a';
    const s = '0x3eb4a47b3002db9540bf0028751075731481cfc7fd0755e336a5c3a75412e08b';
    const address = '0x3e014e5c311a7d6f652ca4f8bb016f4338a44118';
    const addDataResult = await identityContract.methods.addData(name, encryptedKey, hashedMsg, v, r, s)
        .send({ from: address, gas: 2000000, gasPrice: 30000000000 })
        .catch(function (error) { console.log(error); });
    const returnValuesObject = await identityContract.getPastEvents('IdentityEvent');
    res.send({ success: 'ok' });
});

router.post('/test/getUserIdentityContractAddress', async function (req, res, next) {
    const address = "0x75c4fb2e81a6d3420125f5145182f528d1699146";
    const getUserIdentityContractAddressResult = await identityManagerContract.methods.getUserIdentityContractAddress(address)
        .call({ from: address })
        .catch(function (error) { console.log(error); });
    res.send({ success: getUserIdentityContractAddressResult });
});

module.exports = router;

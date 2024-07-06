const IdentityManager = artifacts.require('IdentityManager');
const Identity = artifacts.require('Identity');

const fs = require('fs');
const path = require('path');

contract('IdentityManager', function () {
    it('Test createUser()', async function () {
        const instance = await IdentityManager.deployed();
        const receipt = await instance._test_createUser(
            '5f1059ff008c294b854f44e80bf29af7794725e7f798f92a30e82d80c4f0cf62', 
            '0x3e014e5c311a7d6f652ca4f8bb016f4338a44118',
            1);
        console.log('Gas used of _test_createUser() =', receipt.receipt.gasUsed);
    });

    it('Test _test_addData(csr)', async function () {
        const encryptedCsr = '{"version":"x25519-xsalsa20-poly1305","nonce":"XVjrmxBXpcRTVWaI+AMMpyWFeQMOszs+","ephemPublicKey":"HtfFqJOEF+rhN+DTP6hn1/Bwou9kneZwBqcbKKUv/Ek=","ciphertext":"mU0ZcENOnC6bz7buVjW2NaxFkgde4vW4/b4HoQvMk/aAow/DPlwiiDzScqRZrK6g7MI7wLGW9oOBJb1seEta3pTbCg7fXU87b9jm9wVs5noAGk+bSWFv8Q70RNCpIk4Y5xQ9f8qH6CFgkzAkbTo0ea/d1zQYgsB07P6XqVeTgqwcUa5VE1kIC/to9wewkIeR8BvOZuNb4pWVDSl8/mIaCQu0kG0l0EX0464yAtpznA5rei5871J26m/+Z1H0LNLdLsgi2DT2Et6FUrsSmU8QMF1Tbj287UQSK6SlZjgiNUOMicZMYXXmN+fKT3ESRM0OiKq6XuegHUbhVccl9QFcnhxtkhmXVAApX6P5Dehj5GWxrQRfC4qlD2bC4MSxsrV3EyI+upeTKKCrXSeH1kISvKTrjgFz2Wp2hd1LBYARvIvoOwNHIGnTXEmfcJNvcSalqVy54quBjlM1/Vok/7U0fbCkw/c6vHZqASG8k6xd+X4zt0Fe7y2suii0pcPNiX7YeWABfNB8+O077blw99mBUY+O1zZhUCy6wN/z/m8Obkuy4tfPn8MAmUCpPxk7s4H3tEwgY5thDlSGrgpnh849liDmr5BcAAVgkGysMkFetzS7Xab3xSdFIuApSuXOZUm8azUUuDXMxZ7j77bZrw=="}';
        const hashedMsg = '0xdfed2d117d3480382fd791c975618a60c07575f417ea54f46f7a7fb80b58d249'
        const v = 27;
        const r = '0x7b7bbd44b5e0c9b09e9c31ef1f2bdcfc9fb6f2064d71fc520c1677d1a46fd49a';
        const s = '0x3eb4a47b3002db9540bf0028751075731481cfc7fd0755e336a5c3a75412e08b';
        const instance = await Identity.deployed();
        const receipt = await instance._test_addData('CSR', encryptedCsr, hashedMsg, v, r, s);
        console.log('Gas used of _test_addDatateUser() =', receipt.receipt.gasUsed);
    });

    it('Test _test_addData(key)', async function () {
        const encryptedKey = '{"version":"x25519-xsalsa20-poly1305","nonce":"VIci+SszlJnoYn+lj80zgDU+Zdz5urVD","ephemPublicKey":"E+1jdqSuEfLKWLtxib47sxtAiriX4xgngZ9mBb+Hymo=","ciphertext":"RNqDDTnWp+gVS+BTl8pZsCB65xTh56s/d9yDxYSuvIjcLzBWa+mri3rlVoZalrf1eakIDLLDajYrBDQ8TAFJ7EBbBA0ClahngeK8BQ+CO/fnkPB1WJvoQTW6/fNcEoaY7xqrwVkSSamUnss3WVMlvGWjx4ZetPvaLFS5Wu6w/oxzaixrsKQJEL++O//txmg9zPJYgAWf5o9ul3YROx7ImjqCLq533ARW2W7OdI/A2ZheONAr7qxaLC0R3y/4LXThpU4cH48xOtWbsS/NHLc5GuHrBjoA+3c32zzChVZVKlO0FFu7d2q1Be2rXCcHLrC7qeEu"}';
        const hashedMsg = '0xdfed2d117d3480382fd791c975618a60c07575f417ea54f46f7a7fb80b58d249'
        const v = 27;
        const r = '0x7b7bbd44b5e0c9b09e9c31ef1f2bdcfc9fb6f2064d71fc520c1677d1a46fd49a';
        const s = '0x3eb4a47b3002db9540bf0028751075731481cfc7fd0755e336a5c3a75412e08b';
        const instance = await Identity.deployed();
        const receipt = await instance._test_addData('KEY', encryptedKey, hashedMsg, v, r, s);
        console.log('Gas used of _test_addDatateUser() =', receipt.receipt.gasUsed);
    });
});
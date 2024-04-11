async function getMetamaskAccount() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            document.getElementById('address').value = account;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}

async function signWithMetamask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            const msg = document.getElementById('message').value;

            const web3 = new Web3(window.ethereum);
            const signature = await web3.eth.personal.sign(msg, account);
            document.getElementById('signature').value = signature;
        }
        catch (error) {
            console.log(error);
        }
    }
}

async function provideCsr() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // get user account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            // create identity contract instance
            const web3 = new Web3(DID_CONFIG.URL);
            const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
            const identityAddress = await identityManagerContract.methods.getIdentityAddress(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

            // sign message
            const msg = '[DNASSSYSTEM] Sign this message to provide CSR';
            const hexMsg = web3.utils.toHex(msg);
            let signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [hexMsg, account]
            });

            // create materials for ecrecover
            signature = signature.slice(2);
            const r = `0x${signature.slice(0, 64)}`;
            const s = `0x${signature.slice(64, 128)}`;
            let v = web3.utils.toDecimal(`0x${signature.slice(128, 130)}`);
            if (v != 27 && v != 28) {
                v += 27;
            }
            const hashedMsg = web3.utils.sha3(`\x19Ethereum Signed Message:\n${msg.length}${msg}`);

            // get encrypted csr from identity contract
            const encryptedCsr = await identityContract.methods.getData('DNASSSYSTEM_CSR', hashedMsg, v, r, s)
                .call({ from: account })
                .catch(function (error) { console.log(error); });

            // decrypt csr
            const csr = await window.ethereum.request({
                method: 'eth_decrypt',
                params: [encryptedCsr, account]
            });
            console.log('csr =', csr);

            // encrypt csr with DNASSYSTEM's public key
            const appEncryptedCsr = EthSigUtil.encrypt(DID_CONFIG.ORG.PUBKEY, { data: csr }, 'x25519-xsalsa20-poly1305');
            const appEncryptedCsrString = JSON.stringify(appEncryptedCsr);
            document.getElementById('app_encrypted_csr').value = appEncryptedCsrString;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}

// async function temp() {
//     let temp = await window.ethereum.request({
//         method: 'eth_getEncryptionPublicKey',
//         params: ["0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA"]
//     });
//     console.log('temp = ', temp);
// }

// temp();
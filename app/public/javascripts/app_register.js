const ethWeb3 = new Web3(window.ethereum);
const web3 = new Web3(didConfig.url);
const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, didConfig.contracts.identityManager.address);

async function getSignature() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }

    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    document.getElementById('address').value = account;

    // sign message
    const msg = document.getElementById('message').value;
    const signature = await ethWeb3.eth.personal.sign(msg, account);
    document.getElementById('signature').value = signature;
}

async function getCsr() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }
    
    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];

    // create identity contract instance
    
    const identityAddress = await identityManagerContract.methods.getUserIdentityContractAddress(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });
    const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

    // sign message
    const msg = 'APP_REGISTER';
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
    const encryptedCsr = await identityContract.methods.getData('DNA_CSR', hashedMsg, v, r, s)
        .call({ from: account })
        .catch(function (error) { console.log(error); });

    // decrypt csr
    const csr = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedCsr, account]
    });

    // encrypt csr with the ministry of health and welfare's public key
    const appEncryptedCsr = EthSigUtil.encrypt(didConfig.orgs.health.pubkey, { data: csr }, 'x25519-xsalsa20-poly1305');
    const appEncryptedCsrString = JSON.stringify(appEncryptedCsr);
    document.getElementById('app-encrypted-csr').value = appEncryptedCsrString;
}

async function register() {
    const type = document.getElementById('type').value;
    const address = document.getElementById('address').value;
    const message = document.getElementById('message').value;
    const signature = document.getElementById('signature').value;
    const appEncryptedCsr = document.getElementById('app-encrypted-csr').value;
    console.log('type =', type);
    console.log('address =', address);
    console.log('message =', message);
    console.log('signature =', signature);
    console.log('appEncryptedCsr =', appEncryptedCsr);

    if (`${type}` == '0') {
        alert('[APP] Please select a type.');
        return;
    }
    if (!signature) {
        alert('[APP] Please sign the message first.');
        return;
    }
    if (!appEncryptedCsr) {
        alert('[APP] Please provide your encrpyted CSR.');
        return;
    }

    const registerRes = await fetch('/app/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: type,
            address: address,
            message: message,
            signature: signature,
            appEncryptedCsr: appEncryptedCsr
        })
    });
    const registerResJson = await registerRes.json();
    console.log('registerResJson =', registerResJson);

    if (registerResJson.success) {
        alert('[APP] Successfully registered.');
        window.location.href = '/app/index';
    }
    else {
        alert(`[APP] Fail to register: ${registerResJson.error}`);
    }
}
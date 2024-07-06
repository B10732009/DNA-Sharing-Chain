const web3 = new Web3(didConfig.url);
const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, didConfig.contracts.identityManager.address);

async function getInfos() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }

    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];

    // get type, id, identity contract address
    const type = await identityManagerContract.methods.getUserType(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });
    const id = await identityManagerContract.methods.getUserId(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });
    const identityContractAddress = await identityManagerContract.methods.getUserIdentityContractAddress(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });
    document.getElementById('identity-info-type').value = type;
    document.getElementById('identity-info-id').value = id;
    document.getElementById('identity-info-identity-contract-address').value = identityContractAddress;
}

async function uploadEncryptedData() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }

    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];

    // get user's public key
    const encryptionPublicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [account]
    });

    // create identity contract instance
    const identityAddress = await identityManagerContract.methods.getUserIdentityContractAddress(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });
    const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

    // sign message
    const msg = 'DID_UPLOAD_DATA';
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

    // get name & data
    const name = document.getElementById('upload-encrypted-data-name').value;
    const file = document.getElementById('upload-encrypted-data-data').files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(file, 'utf8');
    fileReader.onload = async function (event) {
        // encrypt data
        const data = event.target.result; // content of the file
        const encryptedData = EthSigUtil.encrypt(encryptionPublicKey, { data: data }, 'x25519-xsalsa20-poly1305');
        const encryptedDataString = JSON.stringify(encryptedData);
        console.log('encryptedDataString =', encryptedDataString);

        // for test
        console.log('encryptedDataString =', encryptedDataString);
        console.log('hashedMsg =', hashedMsg);
        console.log('v =', v);
        console.log('r =', r);
        console.log('s =', s);

        // upload to user's identity contract
        const addDataResult = await identityContract.methods.addData(name, encryptedDataString, hashedMsg, v, r, s)
            .send({
                from: account,
                gas: 2000000,
                gasPrice: 30000000000
            })
            .catch(function (error) { console.log(error); });

        // get events emitted from the contract
        const returnValuesObject = await identityContract.getPastEvents('IdentityEvent');
        const returnValues = returnValuesObject[0].returnValues;
        console.log('returnValues =', returnValues);
        if (returnValues.res) {
            alert('[DID] Successfully encrypted and uploaded data.');
        }
        else {
            alert('[DID] Fail to encrypt and upload data:', returnValues.msg);
        }
    }
}

async function downloadEncryptedData() {
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

    // sing message
    const msg = 'DID_DOWNLOAD_DATA';
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

    // get name from elements
    const name = document.getElementById('download-encrypted-data-name').value;

    // download from user's identity contract
    const encryptedDataString = await identityContract.methods.getData(name, hashedMsg, v, r, s)
        .call({ from: account })
        .catch(function (error) { console.log(error); });

    // decrypt data
    const data = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedDataString, account]
    });
    document.getElementById('download-encrypted-data-data').value = data;
}
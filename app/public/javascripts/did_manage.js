async function showIdentityInformations() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // get user account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            // create identity manager contract instance
            const web3 = new Web3(DID_CONFIG.URL);
            const contract = new web3.eth.Contract(IdentityManagerAbi, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);

            // get role, hashed id
            const role = await contract.methods.getUserRole(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            const hashedId = await contract.methods.getUserId(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });

            // assign values to elements
            switch (role) {
                case '1':
                    document.getElementById('identity-info-role').value = 'patient';
                    break;
                case '2':
                    document.getElementById('identity-info-role').value = 'hospital';
                    break;
                default:
                    document.getElementById('identity-info-role').value = 'reserach center';
            }
            document.getElementById('identity-info-id').value = hashedId;
            document.getElementById('identity-info-address').value = account;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}

async function uploadEncryptedData() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // get user account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            // get user's public key
            const encryptionPublicKey = await window.ethereum.request({
                method: 'eth_getEncryptionPublicKey',
                params: [account]
            });

            // create identity contract instance
            const web3 = new Web3(DID_CONFIG.URL);
            const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
            const identityAddress = await identityManagerContract.methods.getIdentityAddress(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

            // sign message
            const msg = '[DID SYSTEM] Sign this message to call identity functions.';
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

            // get values from elements
            const name = document.getElementById('upload-encrypted-data-name').value;
            const file = document.getElementById('upload-encrypted-data-data').files[0];
            const fileReader = new FileReader();
            fileReader.readAsText(file, 'utf8');
            fileReader.onload = async function (event) {
                // encrypt data
                const data = event.target.result; // content of the file
                const encryptedData = EthSigUtil.encrypt(encryptionPublicKey, { data: data }, 'x25519-xsalsa20-poly1305');
                const encryptedDataString = JSON.stringify(encryptedData);
                console.log(encryptedDataString);

                // upload to user's identity contract
                const addDataResult = await identityContract.methods.addData(name, encryptedDataString, hashedMsg, v, r, s)
                    .send({
                        from: account,
                        gas: 2000000,
                        gasPrice: 30000000000
                    })
                    .catch(function (error) { console.log(error); });

                // get events emitted from the contract
                const returnValuesObject = await identityContract.getPastEvents('IdentityResult');
                const returnValues = returnValuesObject[0].returnValues;
                console.log(returnValues);
            }
        }
        catch (error) {
            console.log('Error connecting to MetaMask:');
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}

async function downloadEncryptedData() {
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

            // sing message
            const msg = '[DID SYSTEM] Sign this message to call identity functions.';
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

            // get values from elements
            const name = document.getElementById('download-encrypted-data-name').value;

            // download from user's identity contract
            const encryptedDataString = await identityContract.methods.getData(name, hashedMsg, v, r, s)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            console.log(encryptedDataString);

            // decrypt data
            const data = await window.ethereum.request({
                method: 'eth_decrypt',
                params: [encryptedDataString, account]
            });

            document.getElementById('download-encrypted-data-data').value = data;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}
async function showIdentityInformations() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            const web3 = new Web3("http://localhost:8545");
            const contract = new web3.eth.Contract(IdentityManagerAbi, "0xe6042703475d0dd1bc2eb564a55f1832c2527171");
            const role = await contract.methods.getUserRole(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            const hashedId = await contract.methods.getUserId(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
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
            console.error('Error connecting to MetaMask:', error);
        }
    }
    else {
        console.error('MetaMask is not installed');
    }
}

async function uploadEncryptedData() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            const encryptionPublicKey = await window.ethereum.request({
                method: 'eth_getEncryptionPublicKey',
                params: [account]
            });
            const name = document.getElementById('upload-encrypted-data-name').value;
            const data = document.getElementById('upload-encrypted-data-data').value;
            const encryptedData = EthSigUtil.encrypt(encryptionPublicKey, { data: data }, 'x25519-xsalsa20-poly1305');
            const encryptedDataString = JSON.stringify(encryptedData);
            console.log(encryptedData);
            const web3 = new Web3("http://localhost:8545");
            const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, "0xe6042703475d0dd1bc2eb564a55f1832c2527171");
            const identityAddress = await identityManagerContract.methods.getIdentityAddress(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            console.log('identityAddress', identityAddress);
            const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

            const msg = '[DID SYSTEM] Sign this message to call identity functions.';
            const hexMsg = web3.utils.toHex(msg);
            let signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [hexMsg, account]
            });
            signature = signature.slice(2);
            const r = `0x${signature.slice(0, 64)}`;
            const s = `0x${signature.slice(64, 128)}`;
            let v = web3.utils.toDecimal(`0x${signature.slice(128, 130)}`);
            if (v != 27 && v != 28) {
                v += 27;
            }
            const hashedMsg = web3.utils.sha3(`\x19Ethereum Signed Message:\n${msg.length}${msg}`);
            const addDataResult = await identityContract.methods.addData('abc', encryptedDataString, hashedMsg, v, r, s)
                .send({
                    from: account,
                    gas: 2000000,
                    gasPrice: 30000000000
                })
                .catch(function (error) { console.log(error); });
            console.log(addDataResult);
            const returnValuesObject = await identityContract.getPastEvents('IdentityResult');
            const returnValues = returnValuesObject[0].returnValues;
            console.log(returnValues);
            // console.log('a = ', a.toLowerCase());


            // const tx = {
            //     // gas: '200',
            //     // gasPrice: '300',
            //     data: identityContract.methods.addData(name, encryptedData)
            //         .encodeABI(),
            //     from: account,
            //     to: identityAddress
            // };
            // const txHash = await window.ethereum.request({
            //     method: 'eth_sendTransaction',
            //     params: [tx]
            // });
            // console.log(`transaction hash: ${txHash}`);
        }
        catch (error) {
            console.error('Error connecting to MetaMask:', error);
        }
    }
    else {
        console.error('MetaMask is not installed');
    }
}

async function downloadEncryptedData() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            const name = document.getElementById('download-encrypted-data-name').value;
            console.log('name', name);
            const web3 = new Web3("http://localhost:8545");
            const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, "0xe6042703475d0dd1bc2eb564a55f1832c2527171");
            const identityAddress = await identityManagerContract.methods.getIdentityAddress(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            console.log('identityAddress', identityAddress);
            const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

            const msg = '[DID SYSTEM] Sign this message to call identity functions.';
            const hexMsg = web3.utils.toHex(msg);
            let signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [hexMsg, account]
            });
            signature = signature.slice(2);
            const r = `0x${signature.slice(0, 64)}`;
            const s = `0x${signature.slice(64, 128)}`;
            let v = web3.utils.toDecimal(`0x${signature.slice(128, 130)}`);
            if (v != 27 && v != 28) {
                v += 27;
            }
            const hashedMsg = web3.utils.sha3(`\x19Ethereum Signed Message:\n${msg.length}${msg}`);
            const encryptedDataString = await identityContract.methods.getData('abc', hashedMsg, v, r, s)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            console.log(encryptedDataString);
            // const encryptedData = JSON.parse(encryptedDataString);
            const data = await window.ethereum.request({
                method: 'eth_decrypt',
                params: [encryptedDataString, account]
            })
            document.getElementById('download-encrypted-data-data').value = data;
            // console.log(`transaction hash: ${txHash}`);
        }
        catch (error) {
            console.error('Error connecting to MetaMask:', error);
        }
    }
    else {
        console.error('MetaMask is not installed');
    }
}
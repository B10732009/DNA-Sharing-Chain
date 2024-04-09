async function getMetamaskAccount() {
    if (typeof window.ethereum !== 'undefined') {
        const web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await web3.eth.getAccounts();
            document.getElementById('address').value = accounts[0];
        }
        catch (error) {
            console.error('Error connecting to MetaMask:', error);
        }
    }
    else {
        console.error('MetaMask is not installed');
    }
}

async function signWithMetamask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            const web3 = new Web3(window.ethereum);
            const msg = '[APP SYSTEM] Sign this message to request creating account.';
            const signature = await web3.eth.personal.sign(msg, account);
            document.getElementById('signature').value = signature;
            // console.log(signature);
            // const ra = await web3.eth.personal.ecRecover(msg, signature);
            // console.log(ra);
        }
        catch (error) {
            console.log(error);
        }
    }
    
    // const msg = '[APP SYSTEM] Sign this message to request creating account.';
    // const hexMsg = web3.utils.toHex(msg);
    // let signature = await window.ethereum.request({
    //     method: 'personal_sign',
    //     params: [hexMsg, account]
    // });
    // signature = signature.slice(2);
    // const r = `0x${signature.slice(0, 64)}`;
    // const s = `0x${signature.slice(64, 128)}`;
    // let v = web3.utils.toDecimal(`0x${signature.slice(128, 130)}`);
    // if (v != 27 && v != 28) {
    //     v += 27;
    // }
    // const hashedMsg = web3.utils.sha3(`\x19Ethereum Signed Message:\n${msg.length}${msg}`);
}
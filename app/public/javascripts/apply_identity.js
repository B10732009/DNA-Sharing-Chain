async function connect() {
    if (typeof window.ethereum !== 'undefined') {
        const web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];
            document.getElementById('address').value = account;
        }
        catch (error) {
            console.error('Error connecting to MetaMask:', error);
        }
    }
    else {
        console.error('MetaMask is not installed');
    }
}

async function test() {
    let temp = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: ['0x3E014E5c311a7D6F652CA4F8bb016f4338A44118']
    });
    console.log(temp);

    console.log(Object.keys(ethSigUtil));

    const temp2 = ethSigUtil.ethSigUtil.encrypt(temp, {data: 'abcde123'}, 'x25519-xsalsa20-poly1305');
    console.log(temp2);
    console.log('aaa');
    
    // const temp3 = ethSigUtil.ethSigUtil.decrypt(temp2, 'df207d299d941818bb4f7822cf003662370a7d685016dfc3f1e2cac03d47fc1d');
    const temp3 = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [JSON.stringify(temp2), '0x3E014E5c311a7D6F652CA4F8bb016f4338A44118']
    })
    console.log(temp3);
}

test();

async function connect() {
    if (typeof window.ethereum !== 'undefined') {
        const web3 = new Web3(window.ethereum);
        try {
            // request account access if needed
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            // get the current connected accounts
            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];
            // put to the address slot
            // <input> element doesn't have "innerText" property,
            // use "value" instead
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

async function check() {
    const identityChainConfig = {
        "url": "http://localhost:8545",
        "orgs": {
            "identity_chain": {
                "address": "0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA",
                "key": "0x0cc0c2de7e8c30525b4ca3b9e0b9703fb29569060d403261055481df7014f7fa"
            }
        },
        "contracts": {
            "identity_manager": {
                "address": "0xe6042703475d0dd1bc2eb564a55f1832c2527171"
            }
        }
    }
    const address = document.getElementById('address').value;
    alert(address);
    try {
        const web3 = new Web3(identityChainConfig.url);
        const contract = new web3.eth.Contract(IdentityManagerAbi, identityChainConfig.contracts.identity_manager.address);
        const checkUserResult = await contract.methods
            .checkUser(address)
            .call({ from: identityChainConfig.orgs.identity_chain.address });
        console.log(checkUserResult);
        // if (!checkUserResult['0']) {
        //     console.log(`Fail to generate new idenity: ${checkUserResult['1']}`);
        //     res.redirect('/apply_identity?');
        // }
        // else {
        //     const addUserResult = await contract.methods
        //         .addUser(req.body.id, req.body.address, req.body.role)
        //         .send({
        //             from: identityChainConfig.orgs.identity_chain.address,
        //             gas: 2000000,
        //             gasPrice: 30000000000
        //         })
        //         .catch(function (error) {
        //             console.log(error);
        //         });
        //     console.log(addUserResult);
        //     console.log('Successfully generate new identity.')
        //     res.redirect('/index');
        // }
    }
    catch (error) {
        console.log(error);
    }
}
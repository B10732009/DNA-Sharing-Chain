async function uploadData() {
    try {

    }
    catch {

    }
}

async function downloadData() {
    try {

    }
    catch {
        
    }
}

async function main() {
    try {
        const web3 = new Web3(identityChainConfig.url);
        const contract = new web3.eth.Contract(contractAbi, identityChainConfig.contracts.identity_manager.address);
        const checkUserResult = await contract.methods
            .checkUser(req.body.id, req.body.address, req.body.role)
            .call({ from: identityChainConfig.orgs.identity_chain.address });

        if (!checkUserResult['0']) {
            console.log(`Fail to generate new idenity: ${checkUserResult['1']}`);
            res.redirect('/apply_identity?');
        }
        else {
            const addUserResult = await contract.methods
                .addUser(req.body.id, req.body.address, req.body.role)
                .send({
                    from: identityChainConfig.orgs.identity_chain.address,
                    gas: 2000000,
                    gasPrice: 30000000000
                })
                .catch(function (error) {
                    console.log(error);
                });
            console.log(addUserResult);
            console.log('Successfully generate new identity.')
            res.redirect('/index');
        }
    }
    catch (error) {
        console.log(error);
    }
}

main();
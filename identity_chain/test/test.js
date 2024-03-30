const { Web3 } = require('web3');
const fs = require("fs");

const web3 = new Web3('http://localhost:8545');

async function test() {
    const abi = JSON.parse(fs.readFileSync("../build/contracts/IdentityManager.json")).abi;
    const addr = '0xE6042703475D0dd1bC2eB564a55F1832c2527171';
    const contract = new web3.eth.Contract(abi, addr);

    try {
        // const res1 = await contract.methods
        //     .addUser('F123456789', '0xc0d8F541Ab8B71F20c10261818F2F401e8194049', 3)
        //     .send({
        //         from: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA',
        //         gas: 2000000,
        //         gasPrice: 30000000000
        //     }).catch(function (error) {
        //         console.log(error);
        //     });
        // console.log(res1);

        // const res2 = await contract.methods
        //     .checkUser('F123456789', '0xc0d8F541Ab8B71F20c10261818F2F401e8194049', 2)
        //     .call({ from: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA' });
        // console.log(res2);

        let transactionObject = {
            gas: 2000000,
            gasPrice: 30000000000,
            data: contract.methods.addUser('F1234567as', '0xc0d8F541Ab8B71F20c10261818F2F401e8194049', 3).encodeABI(),
            from: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA',
            to: '0xE6042703475D0dd1bC2eB564a55F1832c2527171'
        }
        console.log("ppp");

        // const temp = await web3.eth.accounts.signTransaction(transactionObject, '0x0cc0c2de7e8c30525b4ca3b9e0b9703fb29569060d403261055481df7014f7fa', function (error, signedTx) {
        //     console.log("asdf");
        //     if (error) {
        //         console.log("error");
        //     }
        //     else {
        //         console.log("here");
        //         const temp2 = web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        //             .on('recipt', function (recipt) {
        //                 console.log(recipt);
        //             })
        //             .on('error', async function (error) {
        //                 console.log(error);
        //             });
        //         console.log("temp2");
        //         console.log(temp2);
        //     }
        // });
        // console.log(temp);
        // contract.once()
        // const temp3 = contract.once('Result', function (error, event) {
        //     console.log("ddd");
        // });
        // console.log(temp3);

        const temp = await web3.eth.accounts.signTransaction(transactionObject, '0x0cc0c2de7e8c30525b4ca3b9e0b9703fb29569060d403261055481df7014f7fa');
        // console.log(temp);
        const temp2 = await web3.eth.sendSignedTransaction(temp.rawTransaction)
            .on('receipt', function (receipt) {
                console.log("aaa");
                console.log(receipt);
            });

        const temp3 = await contract.getPastEvents('Result', {
            filter: {
                // sender: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA'
            }
        });
        console.log(temp3);
        console.log(temp3[0].returnValues);


    }
    catch (error) {
        console.log(error);
    }
}

test();

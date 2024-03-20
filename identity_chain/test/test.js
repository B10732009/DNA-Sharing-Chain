const { Web3 } = require('web3');
const fs = require("fs");

const web3 = new Web3('http://localhost:8545');

async function test() {
    const abi = JSON.parse(fs.readFileSync("../build/contracts/IdentityManager.json")).abi;
    const addr = '0xE6042703475D0dd1bC2eB564a55F1832c2527171';
    const contract = new web3.eth.Contract(abi, addr);

    try {
        const res1 = await contract.methods
            .addUser('0xc0d8F541Ab8B71F20c10261818F2F401e8194049')
            .send({
                from: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA',
                gas: 2000000,
                gasPrice: 30000000000
            }).catch(function (error) {
                console.log(error);
            });
        console.log(res1);

        const res2 = await contract.methods
            .checkUser('0xc0d8F541Ab8B71F20c10261818F2F401e8194049')
            .call({ from: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA' });
        console.log(res2);
    }
    catch (error) {
        console.log(error);
    }
}

test();

const Web3 = require('web3');

const address = "0xc0d8F541Ab8B71F20c10261818F2F401e8194049";
const privateKey = "0xb97de1848f97378ee439b37e776ffe11a2fff415b2f93dc240b2d16e9c184ba9";
const msg = "hello, world!";
const web3 = new Web3('http://localhost:8545');
const encryptedMsg = web3.eth.accounts.encrypt(msg, address);
console.log(encryptedMsg);


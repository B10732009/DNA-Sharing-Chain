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

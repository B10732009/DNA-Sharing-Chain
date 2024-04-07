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

function checkFieldValues() {
    const roleFieldValue = document.getElementById('role').value;
    if (roleFieldValue == 0) {
        alert('[ERROR] Please select a role.');
        return false;
    }
    const addressFieldValue = document.getElementById('address').value;
    if (!addressFieldValue) {
        alert('[ERROR] Please provide a metamask account.');
        return false;
    }
    return true;
}
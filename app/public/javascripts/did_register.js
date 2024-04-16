async function getMetamaskAccount() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            document.getElementById('address').value = account;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}

// function checkFieldValues() {
//     const roleFieldValue = document.getElementById('role').value;
//     if (roleFieldValue == 0) {
//         alert('[ERROR] Please select a role.');
//         return false;
//     }
//     const addressFieldValue = document.getElementById('address').value;
//     if (!addressFieldValue) {
//         alert('[ERROR] Please provide a metamask account.');
//         return false;
//     }
//     return true;
// }
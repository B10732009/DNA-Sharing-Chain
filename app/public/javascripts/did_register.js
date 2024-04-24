async function getAddress() {
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

async function register() {
    // get element values
    const type = document.getElementById('type').value;
    const id = document.getElementById('id').value;
    const address = document.getElementById('address').value;
    console.log('type =', type);
    console.log('id =', id);
    console.log('address =', address);

    // check all values are valid
    if (`${type}` == '0') {
        alert('[DID] Please select a type.');
        return;
    }
    if (!id) {
        alert('[DID] Please input your id.');
        return;
    }
    if (!address) {
        alert('[DID] Please input your metamask address.');
        return;
    }

    // post to server to register a new identity
    const registerRes = await fetch('/did/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: type,
            id: id,
            address: address
        })
    });
    const registerResJson = await registerRes.json();
    console.log('registerResJson =', registerResJson);

    if (registerResJson.success) {
        alert('[DID] Successfully created a new identity.');
        window.location.href = '/did/index';
    }
    else {
        alert(`[DID] Fail to create a new identity: ${registerResJson.error}`);
    }
}
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

async function signWithMetamask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            const msg = document.getElementById('message').value;

            const web3 = new Web3(window.ethereum);
            const signature = await web3.eth.personal.sign(msg, account);
            document.getElementById('signature').value = signature;
        }
        catch (error) {
            console.log(error);
        }
    }
}

async function download() {
    const address = document.getElementById('address').value;
    const message = document.getElementById('message').value;
    const signature = document.getElementById('signature').value;
    const chrom = document.getElementById('chrom').value;
    const tags = document.getElementById('tags').value;

    const downloadRes = await fetch('/app/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address: address,
            message: message,
            signature: signature,
            chrom: chrom,
            tags:tags
        })
    });
    const downloadResJson = await downloadRes.json();
    console.log('downloadResJson =', downloadResJson);
    
}
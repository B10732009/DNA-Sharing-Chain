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
            console.log('msg =', msg);
            console.log(account);

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

    // get query result
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
    const queryResult = downloadResJson.data;

    const tbody = document.getElementById('tbody');
    for (const item of queryResult) {
        // add a new row containing two cells
        const row = tbody.insertRow();
        const cell0 = row.insertCell(0);
        const cell1 = row.insertCell(1);

        // set id
        cell0.innerText = item.key;

        // set download button
        const button = document.createElement('button');
        button.innerText = 'download';
        button.setAttribute('class', 'form-button form-table-button-selected-color');
        button.setAttribute('type', 'button');
        button.setAttribute('onclick', `downloadFile('${item.key}.vcf', '${item.value}'); return false;`);
        cell1.appendChild(button);
    }


    console.log('downloadResJson =', downloadResJson);
    
}

async function downloadFile(fileName, fileContent) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
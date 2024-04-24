async function getSignature() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            document.getElementById('address').value = account;

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

async function query() {
    const address = document.getElementById('address').value;
    const message = document.getElementById('message').value;
    const signature = document.getElementById('signature').value;
    const chromRanges = document.getElementById('chrom-ranges').value;
    console.log('address =', address);
    console.log('message =', message);
    console.log('signature =', signature);
    console.log('chromRanges =', chromRanges);

    // get query result
    const downloadRes = await fetch('/app/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address: address,
            message: message,
            signature: signature,
            chromRanges: chromRanges
        })
    });
    const downloadResJson = await downloadRes.json();
    const queryResult = downloadResJson.data;

    const tbody = document.getElementById('tbody');
    
    // remove old table items
    while (tbody.rows.length > 0) {
        tbody.deleteRow(0);
    }

    // add new table items
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
        button.setAttribute('onclick', `download('${item.key}.vcf', '${item.value}'); return false;`);
        cell1.appendChild(button);
    }

    alert('[APP] Available data has been refreshed.');
}

async function download(fileName, fileContent) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
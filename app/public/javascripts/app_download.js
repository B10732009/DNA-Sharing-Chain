const ethWeb3 = new Web3(window.ethereum);
const web3 = new Web3(didConfig.url);
const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, didConfig.contracts.identityManager.address);

function readFile(file) {
    return new Promise(function (resolve, reject) {
        const fileReader = new FileReader();
        fileReader.readAsText(file, 'utf8');
        fileReader.onload = async function (event) {
            resolve(event.target.result);
        }
    });
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

async function getSignature() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }

    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    document.getElementById('address').value = account;

    // sign message
    const msg = document.getElementById('message').value;
    const signature = await ethWeb3.eth.personal.sign(msg, account);
    document.getElementById('signature').value = signature;
}

async function queryAccessTickets() {
    const address = document.getElementById('address').value;
    const message = document.getElementById('message').value;
    const signature = document.getElementById('signature').value;
    const chromRanges = document.getElementById('chrom-ranges').value;
    console.log('address =', address);
    console.log('message =', message);
    console.log('signature =', signature);
    console.log('chromRanges =', chromRanges);

    // get user id
    const id = await identityManagerContract.methods.getUserId(address)
        .call({ from: address })
        .catch(function (error) { console.log(error); });

    // get query result
    const queryAccessTicketsRes = await fetch('/app/download/query_access_tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: id,
            address: address,
            message: message,
            signature: signature,
            chromRanges: chromRanges
        })
    });
    const queryAccessTicketsResJson = await queryAccessTicketsRes.json();
    const queryAccessTicketsResult = queryAccessTicketsResJson.data;
    console.log('queryAccessTicketsResult =', queryAccessTicketsResult);

    // display available tickets in table
    // remove old table items
    const tbody = document.getElementById('tbody');
    while (tbody.rows.length > 0) {
        tbody.deleteRow(0);
    }

    // add new table items
    for (const item of queryAccessTicketsResult) {
        const id = item.key;
        const tickets = item.value;
        for (const ticketName in tickets) {
            const row = tbody.insertRow();
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            const cell2 = row.insertCell(2);

            cell0.innerText = `${id.slice(0, 6)}...${id.slice(-6)}`;
            cell1.innerText = tickets[ticketName].url;

            const button = document.createElement('button');
            button.innerText = 'download';
            button.setAttribute('class', 'form-button form-table-button-selected-color');
            button.setAttribute('type', 'button');
            button.setAttribute('onclick', `download('${id}.ticket', '${tickets[ticketName].content}'); return false;`);
            cell2.appendChild(button);
        }
    }

    alert('[APP] Available data has been refreshed.');
}

async function requestDnaSequences() {
    const requestUrl = document.getElementById('request_url').value;
    const requestTicket = document.getElementById('request_ticket').files[0];
    const requestTicketContent = await readFile(requestTicket);
    console.log('requestUrl =', requestUrl);
    console.log('requestTicketContent =', requestTicketContent);

    const requestRes = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requestTicket: requestTicketContent
        })
    });
    const requestResJson = await requestRes.json();
    console.log('requestResJson =', requestResJson);

    await download(requestResJson.id, requestResJson.data);
}

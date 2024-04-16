let permission = {};

async function createTable() {
    // create table
    const tbody = document.getElementById('tbody');
    for (let i = 0; i < 23; i++) {
        const row = tbody.insertRow();
        for (let j = 0; j < 5; j++) {
            const cell = row.insertCell(j);
            if (j == 0) {
                cell.innerText = `#CHR${i + 1}`;
            }
            else {
                const button = document.createElement('button');
                button.setAttribute('id', `button-${i}-${j}`);
                button.setAttribute('class', 'form-button form-table-button-color');
                console.log(permission);
                console.log(permission[`chr${i + 1}`]);
                if (j - 1 == permission[`chr${i + 1}`]) {
                    button.setAttribute('class', 'form-button form-table-button-selected-color');
                }
                else {
                    button.setAttribute('class', 'form-button form-table-button-color');
                }
                button.setAttribute('onclick', `setPermission(${i}, ${j});`);
                button.setAttribute('type', 'button');
                cell.appendChild(button);
            }
        }
    }
}

function setPermission(i, j) {
    // update permission list
    permission[`chr${i}`] = j - 1;
    console.log(permission);

    // update table button color
    for (let k = 1; k < 5; k++) {
        const button = document.getElementById(`button-${i}-${k}`);
        button.classList.remove('form-table-button-selected-color');
        button.classList.add('form-table-button-color');
    }
    const button = document.getElementById(`button-${i}-${j}`);
    button.classList.remove('form-table-button-color');
    button.classList.add('form-table-button-selected-color');
}

function wrapPermission() {
    document.getElementById('permission').value = JSON.stringify(permission);
}

async function updatePermission() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // get user account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            // create identity contract instance
            const web3 = new Web3(DID_CONFIG.URL);
            const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, DID_CONFIG.CONTRACTS.IDENTITY_MANAGER.ADDRESS);
            const identityAddress = await identityManagerContract.methods.getUserIdentityContractAddress(account)
                .call({ from: account })
                .catch(function (error) { console.log(error); });
            const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

            // sign message
            const msg = '[DNASSSYSTEM] Sign this message to provide CSR';
            const hexMsg = web3.utils.toHex(msg);
            let signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [hexMsg, account]
            });

            // create materials for ecrecover
            signature = signature.slice(2);
            const r = `0x${signature.slice(0, 64)}`;
            const s = `0x${signature.slice(64, 128)}`;
            let v = web3.utils.toDecimal(`0x${signature.slice(128, 130)}`);
            if (v != 27 && v != 28) {
                v += 27;
            }
            const hashedMsg = web3.utils.sha3(`\x19Ethereum Signed Message:\n${msg.length}${msg}`);

            // get encrypted key from identity contract
            const encryptedKey = await identityContract.methods.getData('DNASSSYSTEM_KEY', hashedMsg, v, r, s)
                .call({ from: account })
                .catch(function (error) { console.log(error); });

            // decrypt key
            const key = await window.ethereum.request({
                method: 'eth_decrypt',
                params: [encryptedKey, account]
            });
            console.log('key =', key);

            //=== offline signing client-side flow ===//

            // get endorsement proposal
            const getEndorsementRes = await fetch('/app/manage/update_permission/get_endorsement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: account,
                    permission: JSON.stringify(permission)
                })
            });
            const getEndorsementResJson = await getEndorsementRes.json();
            const hashedProposalBytes = getEndorsementResJson.data;
            console.log('hashedProposalBytes =', hashedProposalBytes);

            // retrieve private key from key file
            const prvKey = Jsrsasign.KEYUTIL.getKey(key).prvKeyHex;

            // sign the proposal
            const ecdsa = new Elliptic.ec(Elliptic.curves['p256']);
            const endorsementSignKey = ecdsa.keyFromPrivate(prvKey, 'hex');
            const endorsementSignature = ecdsa.sign(Buffer.from(hashedProposalBytes, 'hex'), endorsementSignKey, { canonical: true });
            const endorsementSignatureDer = endorsementSignature.toDER();
            console.log('endorsementSignatureDer =', endorsementSignatureDer);

            // send back the signed proposal, and get commit
            const getCommitRes = await fetch('/app/manage/update_permission/get_commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: account,
                    endorsementSignatureDer: endorsementSignatureDer
                })
            });
            const getCommitResJson = await getCommitRes.json();
            const hashedCommitBytes = getCommitResJson.data;
            console.log('hashedCommitBytes =', hashedCommitBytes);

            // sign the commit
            const commitSignature = ecdsa.sign(Buffer.from(hashedCommitBytes, 'hex'), endorsementSignKey, { canonical: true });
            const commitSignatureDer = commitSignature.toDER();

            // send back the signed commit
            const sendCommitRes = await fetch('/app/manage/update_permission/send_commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commitSignatureDer: commitSignatureDer
                })
            });
            const sendCommitResJson = await sendCommitRes.json();
            console.log(sendCommitResJson.data);
        }
        catch (error) {
            console.log(error);
        }
    }
}

async function init() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            document.getElementById('address').value = account;

            const res = await fetch('/app/manage/get_permission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: account })
            });
            const resJson = await res.json();
            permission = resJson.data;
            console.log(permission);
            createTable();
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        console.log('MetaMask is not installed');
    }
}

init();
// createTable();

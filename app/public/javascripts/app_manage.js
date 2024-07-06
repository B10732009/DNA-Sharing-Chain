const web3 = new Web3(didConfig.url);
const identityManagerContract = new web3.eth.Contract(IdentityManagerAbi, didConfig.contracts.identityManager.address);

let accessLevelList = {};

async function createTable() {
    // create table
    const tbody = document.getElementById('tbody');
    for (let i = 1; i <= 24; i++) {
        const row = tbody.insertRow();
        for (let j = 0; j < 6; j++) {
            const cell = row.insertCell(j);
            if (j == 0) {
                cell.innerText = `#chr${i}`;
            }
            else {
                const button = document.createElement('button');
                button.setAttribute('id', `button-${i}-${j}`);
                button.setAttribute('class', 'form-button form-table-button-color');
                if (j - 1 == accessLevelList[`chr${i}`]) {
                    button.setAttribute('class', 'form-button form-table-button-selected-color');
                }
                else {
                    button.setAttribute('class', 'form-button form-table-button-color');
                }
                button.setAttribute('onclick', `setAccessLevel(${i}, ${j});`);
                button.setAttribute('type', 'button');
                cell.appendChild(button);
            }
        }
    }
}

function setAccessLevel(i, j) {
    // update access level list
    accessLevelList[`chr${i}`] = j - 1;

    // update table button color
    for (let k = 1; k < 6; k++) {
        const button = document.getElementById(`button-${i}-${k}`);
        button.classList.remove('form-table-button-selected-color');
        button.classList.add('form-table-button-color');
    }
    const button = document.getElementById(`button-${i}-${j}`);
    button.classList.remove('form-table-button-color');
    button.classList.add('form-table-button-selected-color');
}

async function updateAccessLevelList() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }

    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];

    // create identity contract instance
    const identityAddress = await identityManagerContract.methods.getUserIdentityContractAddress(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });
    const identityContract = new web3.eth.Contract(IdentityAbi, identityAddress);

    // sign message
    const msg = 'APP_UPDATE_ACCESS_LEVEL_LIST';
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
    const encryptedKey = await identityContract.methods.getData('DNA_KEY', hashedMsg, v, r, s)
        .call({ from: account })
        .catch(function (error) { console.log(error); });

    // decrypt key
    const key = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedKey, account]
    });
    console.log('key =', key);

    //=== offline signing client-side flow ===//

    // get user's id
    const id = await identityManagerContract.methods.getUserId(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });

    // get endorsement proposal
    const getEndorsementRes = await fetch('/app/manage/update_access_level_list/get_endorsement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: id,
            accessLevelList: JSON.stringify(accessLevelList)
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
    const getCommitRes = await fetch('/app/manage/update_access_level_list/get_commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: id,
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
    const sendCommitRes = await fetch('/app/manage/update_access_level_list/send_commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            commitSignatureDer: commitSignatureDer
        })
    });
    const sendCommitResJson = await sendCommitRes.json();
    console.log('sendCommitResJson.data =', sendCommitResJson.data);
    if (sendCommitResJson.data.status == 'SUCCESS') {
        alert('[APP] Successfully updated access level list.');
    }
    else {
        alert('[APP] Fail to update access level list:', sendCommitResJson.data.info);
    }
}

async function getAccessLevelList() {
    if (typeof window.ethereum == 'undefined') {
        console.log('MetaMask is not installed');
        return;
    }

    // get user account
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    document.getElementById('address').value = account;

    // get user id
    const id = await identityManagerContract.methods.getUserId(account)
        .call({ from: account })
        .catch(function (error) { console.log(error); });

    const res = await fetch('/app/manage/get_access_level_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    });
    const resJson = await res.json();
    accessLevelList = resJson.data;
    console.log('accessLevelList =', accessLevelList);
}

async function init() {
    await getAccessLevelList();
    await createTable();
}

init();

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

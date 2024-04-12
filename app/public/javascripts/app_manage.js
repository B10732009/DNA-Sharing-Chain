function createTable(permissionString) {
    // parse permision
    const permission = JSON.parse(permissionString);
    console.log(permission);

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
                if (j == permission[`CHR${i + 1}`]) {
                    button.setAttribute('class', 'form-button form-table-button-selected-color');
                }
                else {
                    button.setAttribute('class', 'form-button form-table-button-color');
                }
                cell.appendChild(button);
            }
        }
    }


}

function setColor(permissionString) {
    // set color
    const permission = JSON.parse(permissionString);
    for (let i = 0; i < 23; i++) {
        for (let j = 1; j < 5; j++) {
            document.getElementById(`button-${i}-${j}`).style['background-color'] = '#ADADAD';
        }
    }
}

createTable('{"CHR3":2}');
// setColor("{}");
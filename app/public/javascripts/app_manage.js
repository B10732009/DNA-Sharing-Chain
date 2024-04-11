function createTable() {
    const tbody = document.getElementById('tbody');
    for (let i = 0; i < 23; i++) {
        let row = tbody.insertRow();
        let cell = row.insertCell(0);
        cell.innerText = `#CHR${i + 1}`;
        for (let j = 1; j < 5; j++) {
            let cell = row.insertCell(j);
            let button = document.createElement('button');
            button.innerText = 'abc';
            cell.appendChild(button);
        }
    }
}

createTable();
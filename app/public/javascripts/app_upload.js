async function readDnaDataFile() {
    const file = document.getElementById('dna-owner-data-file').files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(file, 'utf8');
    fileReader.onload = async function (event) {
        alert(event.target.result.replace(/\r/g, "\n"));
        console.log(event.target.result);
        document.getElementById('dna-owner-data').value = event.target.result.replace(/\r/g, "\n"); // content of the file
    };
}

async function upload() {
    const id = document.getElementById('id').value;
    const files = document.getElementById('file').files;
    console.log('id =', id);
    console.log('files =', files);

    if (!id) {
        alert('[APP] Please input the data owner\'s id.');
        return;
    }
    if (files.length == 0) {
        alert('[APP] Please upload data file.');
        return;
    }

    const file = files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(file, 'utf8');
    fileReader.onload = async function (event) {
        const data = event.target.result.replace(/\r/g, "\n"); // content of the file
        const uploadRes = await fetch('/app/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id,
                data: data
            })
        });
        const uploadResJson = await uploadRes.json();
        console.log('uploadResJson =', uploadResJson);
    
        if (uploadResJson.success) {
            alert('[APP] Successfully uploaded file.');
        }
        else {
            alert(`[APP] Fail to upload: ${uploadResJson.error}`);
        }
    };
}

function readFile(file) {
    return new Promise(function (resolve, reject) {
        const fileReader = new FileReader();
        fileReader.readAsText(file, 'utf8');
        fileReader.onload = async function (event) {
            resolve(event.target.result);
        }
    });
}

async function uploadAccessTickets() {
    const id = document.getElementById('id2').value;
    const url = document.getElementById('url').value;
    const files = document.getElementById('tickets').files;
    console.log('url =', url);
    console.log('tickets =', tickets);

    let accessTicketList = {
        // chr1: 'MHcCAQEEID+jOFFCJ2kFF3OhhGbRoGCXgnzEJZfaDLf6NMSTGGVJoAoGCCqGSM49',
        // chr2: 'MHcCAQEEID+jOFFCJ2kFF3OhhGbRoGCXgnzEJZfaDLf6NMSTGGVJoAoGCCqGSM49'
    };
    for (let i = 0; i < files.length; i++) {
        const name = files[i].name;
        const content = await readFile(files[i]);
        accessTicketList[name] = {
            url: url,
            content: content
        };
    }


    // for (let i = 0; i < files.length; i++) {
    //     const fileReader = new FileReader();
    //     fileReader.onload = async function (event) {
    //         const name = event.target.fileName;
    //         const data = event.target.result.replace(/\r/g, "\n"); // content of the file
    //         console.log(data);
    //         accessTicketList[name] = data;
    //     }
    //     fileReader.readAsText(files[i], 'utf8');
    // }

    // 0x3e014e5c311a7d6f652ca4f8bb016f4338a44118

    console.log('accessTicketList =', accessTicketList);

    const uploadAccessTicketRes = await fetch('/app/upload_access_ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: id,
            url: url,
            accessTicketList: JSON.stringify(accessTicketList)
        })
    });
    const uploadAccessTicketResJson = await uploadAccessTicketRes.json();
    console.log('uploadAccessTicketResJson =', uploadAccessTicketResJson);

    if (uploadAccessTicketResJson.success) {
        alert('[APP] Successfully uploaded access tickets.');
    }
    else {
        alert(`[APP] Fail to upload access tickets: ${uploadResJson.error}`);
    }
}




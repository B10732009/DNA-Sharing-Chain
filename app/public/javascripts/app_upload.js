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




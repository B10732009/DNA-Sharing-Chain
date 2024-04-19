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

// async function upload() {
//     await readDnaDataFile();
// }




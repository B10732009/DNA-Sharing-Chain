const fs = require('fs');
const path = require('path');

for (const arg  of process.argv.slice(2)) {
    console.log(arg);
}

const abiFileDir = path.join(__dirname, 'build', 'contracts');
const abiFileList = fs.readdirSync(abiFileDir);

for (const abiFile of abiFileList) {
    if (abiFile.length > 6 && abiFile.slice(-6) == 'abi.js') {
        continue;
    }
    const abi = JSON.parse(fs.readFileSync(path.join(abiFileDir, abiFile))).abi;
    const newAbiName = abiFile.slice(0, -5);
    const newAbiFileName = `${newAbiName}.abi.js`;
    const content = `const ${newAbiName}Abi = ${JSON.stringify(abi)};`;
    fs.writeFileSync(path.join(abiFileDir, newAbiFileName), content);
}
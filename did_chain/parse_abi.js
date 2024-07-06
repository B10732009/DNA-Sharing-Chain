const fs = require('fs');
const path = require('path');

const abiFileDir = path.join(__dirname, 'build', 'contracts');
const newAbiFileDir = path.join(__dirname, '..', 'app', 'public', 'javascripts');
const abiFileList = ['IdentityManager.json', 'Identity.json'];

for (const abiFile of abiFileList) {
    const abi = JSON.parse(fs.readFileSync(path.join(abiFileDir, abiFile))).abi;
    const newAbiName = abiFile.slice(0, -5);
    const newAbiFileName = `${newAbiName}.abi.js`;
    const content = `const ${newAbiName}Abi = ${JSON.stringify(abi)}; if (typeof module !== undefined && module.exports) { module.exports = ${newAbiName}Abi; }`;
    fs.writeFileSync(path.join(newAbiFileDir, newAbiFileName), content);
}
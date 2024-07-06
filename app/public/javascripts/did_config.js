const didConfig = {
    "url": "http://localhost:8545",
    "orgs": {
        "interior": {
            "address": "0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA",
            "prvkey": "0cc0c2de7e8c30525b4ca3b9e0b9703fb29569060d403261055481df7014f7fa",
            "pubkey": "j+RKu+f3B47jMOrftObdXGcsFEME0LLZYwS3SbbTQGI="
        },
        "health": {
            "address": "0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA",
            "prvkey": "0cc0c2de7e8c30525b4ca3b9e0b9703fb29569060d403261055481df7014f7fa",
            "pubkey": "j+RKu+f3B47jMOrftObdXGcsFEME0LLZYwS3SbbTQGI="
        }
    },
    "contracts": {
        "identityManager": {
            "address": "0xe6042703475d0dd1bc2eb564a55f1832c2527171"
        },
        "identity": {
            "address": "0x4a41672e9a217C3193b12483400b03CE1851e145"
        }
    }
};

if (typeof module !== undefined && module.exports) {
    module.exports = didConfig;
}

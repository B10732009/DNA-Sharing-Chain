const appConfig = {
    'channels': {
        'accessControl': {
            'name': 'access-control-channel'
        }
    },
    'chaincodes': {
        'patientAccessControl': {
            'name': 'patient-access-control-chaincode'
        },
        'researchInstituteAccessControl': {
            'name': 'research-institute-access-control-chaincode'
        }
    },
    'mspId': 'Org1MSP',
    'orgUserId': 'Peer',
    'admin': {
        'id': 'admin',
        'password': 'adminpw'
    }
}

if (typeof module !== undefined && module.exports) {
    module.exports = appConfig;
}
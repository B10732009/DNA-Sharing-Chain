'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCaServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const FabricCommon = require('fabric-common');

const openssl = require('openssl-nodejs');

const temp = openssl('openssl ecparam -name prime256v1 -genkey -noout -out key.pem',
    function (err, res) {
        console.log(res);
    });
// console.log(temp);
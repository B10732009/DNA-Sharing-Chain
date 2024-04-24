# PPDNASSP

## Environment
- device : Ubuntu 20.04.5 LTS
- node : v20.11.1
- nvm : 0.39.1
- ganache : 7.9.2 
    - @ganache/cli: 0.10.2
    - @ganache/core: 0.10.2
- truffle
    - Truffle v5.11.5 (core: 5.11.5)
    - Ganache v7.9.1
    - Solidity - 0.8.13 (solc-js)
    - Node v20.11.1
    - Web3.js v1.10.0
- browserify : 17.0.0

## Build
### Identity Chain
- Go to folder `identity_chain/`.
    ```bash
    cd identity_chain/
    ```
- Build ganache network.
    ```bash
    ganache -s 0 --gasPrice 0
    ```
- Deploy smart contracts.
    ```bash
    truffle migrate
    ```
- Retrieve abi data & copy to app.
    ```bash
    node retrieve_abi.js
    ```

### App Chain
- Go to folder `app_chain/`.
    ```bash
    cd app_chain/
    ```
- Download [fablo](https://github.com/hyperledger-labs/fablo) main script.
- Build hyperledger fabric network by fablo.
    ```bash
    ./fablo up
    ```

### Bundle Files
Use browserify to bundle up all required modules.

- Go to folder `bundle_files/`.
    ```bash
    cd bundle_files/
    ```
- Install modules.
    ```bash
    npm install
    ```
- Bundle up all required modules.
    ```bash
    browserify buffer.js -s Buffer -o ../app/public/javascripts/buffer.bundle.js
    browserify elliptic.js -s Elliptic -o ../app/public/javascripts/elliptic.bundle.js
    browserify eth_sig_util.js -s EthSigUtil -o ../app/public/javascripts/eth_sig_util.bundle.js
    browserify jsrsasign.js -s Jsrsasign -o ../app/public/javascripts/jsrsasign.bundle.js
    browserify eth_sig_util.js -s EthSigUtil -o ../app/public/javascripts/eth_sig_util.bundle.js
    browserify web3.js -s Web3 -o ../app/public/javascripts/web3.bundle.js
    ```
### App
- Install modules.
    ```bash
    npm install
    ```
- Start app.
    ```bash
    npm start
    ```
- Open browser.
    - DID : `localhost:3000/did`
    - APP : `localhost:3000/` or `localhost:3000/app`
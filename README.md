# DNA-SHARING-CHAIN

Sample Dapp for *"DNA-Sharing-Chain: A Privacy Preserving DNA Sequence Sharing Ecosystem"*.

## Environment

- OS: Ubuntu 20.04.5 LTS
- Node: v20.11.1
- NVM: 0.39.1
- Ganache: 7.9.2 (@ganache/cli: 0.10.2, @ganache/core: 0.10.2)
- Truffle
    - Truffle v5.11.5 (core: 5.11.5)
    - Ganache v7.9.1
    - Solidity - 0.8.13 (solc-js)
    - Node v20.11.1
    - Web3.js v1.10.0
- Browserify: 17.0.0
- Metamask browser extension

## Build

### Decentralized Identity Chain (DID-Chain)

1. Install ganache & truffle
   
    ```bash
    npm install -g ganache
    ```
    ```bash
    npm install -g truffle
    ```
    
2. Build up ganache network
    
    ```bash
    ganache -s 0 --gasPrice 0 --blockTime 0.5 
    ```
    
3. Deploy smart contracts
    
    ```bash
    cd did_chain/
    ```
    ```bash
    truffle migrate
    ```

### DNA Sharing Chain (APP-Chain)

1. Install [fablo](https://github.com/hyperledger-labs/fablo) environment
    
    - Put the fablo script at `/app_chain/`.

2. Build up hyperledger fabric network
    
    ```bash
    cd app_chain/
    ```
    ```bash
    ./fablo up
    ```
    - To shut down the network
        
        ```bash
        ./fablo down
        ```
    - To clean all data
        
        ```bash
        ./fablo prune
        ```
        - You should do this after modifying chaincodes.

### Dapp

1. Parse ABI files
    
    ```bash
    cd did_chain/
    ```
    ```bash
    node parse_abi.js
    ```
    - The ABI files (*.abi.js) will be generated at `/app/public/javascripts/`.

2. Bundle up packages

    ```bash
    cd bundle_files/
    ```
    ```bash
    npm install
    ```
    ```bash
    npm run build
    ```
    - The bundle files (*.bundle.js) will be generated at `/app/public/javascripts/`.

3. Start the Dapp

    ```bash
    cd app/
    ```
    ```bash
    npm install
    ```
    ```bash
    npm start
    ```
    - Open browser.

        - DID-Chain: [http://localhost:3000/did](http://localhost:3000/did)
        - APP-Chain: [http://localhost:3000/](http://localhost:3000/) or [http://localhost:3000/app/](http://localhost:3000/app/)

    - If you get an error like

        ```log
        2024-07-06T12:46:53.547Z - error: [DiscoveryResultsProcessor]: parseDiscoveryResults[access-control-channel] - Channel:access-control-channel received discovery error:access denied...
        ```
        Delete the folder `/app/routes/wallet/` and restart the system again.

### Data Generator (Optional)

Generate sample data in VCF format. Written in C++.

```bash
cd data_generator/
```
```bash
./data_generator.cpp <output_file_path> <record_number>
```

## References

- [Hyperledger Fabric Docs](https://hyperledger-fabric.readthedocs.io/en/latest/index.html)
- [Hyperledger Fabric Contract API](https://hyperledger.github.io/fabric-chaincode-node/main/api/)
- [Hyperledger Fabric SDK for Node.js](https://hyperledger.github.io/fabric-sdk-node/)
- [Hyperledger Fabric Offline Private Key Transaction Signing Flow](https://lists.hyperledger.org/g/fabric/topic/93454249?p=%2C%2C%2C20%2C0%2C0%2C0%3A%3Arecentpostdate%2Fsticky%2C%2C%2C20%2C0%2C280%2C93454249)
- [Fablo](https://github.com/hyperledger-labs/fablo)
- [Node.js Express Framework](https://www.runoob.com/nodejs/nodejs-express-framework.html)
- [Solidity by Example](https://solidity-by-example.org/)
- [Solidity Tutorial](https://www.tutorialspoint.com/solidity/index.htm)
- [Ethereum Sign](https://mirror.xyz/rbtree.eth/y2oMRSSKy3kI-fYL9P2nAmJUXhxV1P2x4vAy_7D9-MM)
- [Ecrecover Example](https://github.com/sogoiii/ecrecover-example)
- [Truffle Test Tutorial](https://chunyu-hsiao93.medium.com/truffle-%E6%99%BA%E8%83%BD%E5%90%88%E7%B4%84%E6%B8%AC%E8%A9%A6%E6%B5%81%E7%A8%8B%E7%B0%A1%E6%98%93%E6%93%8D%E4%BD%9C%E6%95%99%E5%AD%B8-f7b0d5fc3880)

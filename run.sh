#! /bin/bash

IDENTITY_CHAIN_DIR=identity_chain
APP_CHAIN_DIR=app_chain
APP_DIR=app
BROWSERIFY_DIR=browserify

GANACHE_SEED=0

function _ganache() {
    cd ${IDENTITY_CHAIN_DIR}
    ganache -s ${GANACHE_SEED} --gasPrice 0
}

function _truffle() {
    cd ${IDENTITY_CHAIN_DIR}
    truffle migrate --reset
    node retrieve_abi.js
}

function _app() {
    cd ${APP_DIR}
    npm test
}

function _browserify() {
    cd ${BROWSERIFY_DIR}
    npm install
    browserify eth_sig_util.js -s EthSigUtil -o eth_sig_util.bundle.js
    browserify web3.js -s Web3 -o web3.bundle.js
}

function main() {
    case $1 in
        "g")
            _ganache
            ;;
        "t")
            _truffle
            ;;
        "a")
             _app
             ;;
        "b")
            _browserify
            ;;
        *)
            echo "error"
            ;;
    esac
}

main $1
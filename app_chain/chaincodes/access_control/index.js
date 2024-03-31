'use strict';

const { Contract } = require('fabric-contract-api');

class AccessControlContract extends Contract {
    constructor() {
        super('AccessControlContract');
    }

    async instantiate() {
        // function that will be invoked on chaincode instantiation
    }

    async put(ctx, key, value) {
        await ctx.stub.putState(key, Buffer.from(value));
        return { success: 'OK' };
    }

    async get(ctx, key) {
        const buffer = await ctx.stub.getState(key);
        if (!buffer || !buffer.length) {
            return { error: 'NOT_FOUND' };
        }
        return { success: 'OK', data: buffer.toString() };
    }

    async query(ctx, queryString) {
        let queryIterator = await ctx.stub.getQueryResult(queryString);
        let queryResults = [];
        let iterator = await queryIterator.next();
        while (!iterator.done) {
            if (iterator.value) {
                queryResults.push({
                    key: iterator.value.key.toString('utf8'),
                    value: JSON.parse(iterator.value.value.toString('utf8'))
                });
            }
            iterator = await queryIterator.next();
        }
        queryIterator.close();
        return { success: 'OK', data: queryResults };
    }

    // async putPrivateMessage(ctx, collection) {
    //   const transient = ctx.stub.getTransient();
    //   const message = transient.get("message");
    //   await ctx.stub.putPrivateData(collection, "message", message);
    //   return { success: "OK" };
    // }

    // async getPrivateMessage(ctx, collection) {
    //   const message = await ctx.stub.getPrivateData(collection, "message");
    //   const messageString = message.toBuffer ? message.toBuffer().toString() : message.toString();
    //   return { success: messageString };
    // }

    // async verifyPrivateMessage(ctx, collection) {
    //   const transient = ctx.stub.getTransient();
    //   const message = transient.get("message");
    //   const messageString = message.toBuffer ? message.toBuffer().toString() : message.toString();
    //   const currentHash = crypto.createHash("sha256").update(messageString).digest("hex");
    //   const privateDataHash = (await ctx.stub.getPrivateDataHash(collection, "message")).toString("hex");
    //   if (privateDataHash !== currentHash) {
    //     return { error: "VERIFICATION_FAILED" };
    //   }
    //   return { success: "OK" };
    // }
}

exports.contracts = [AccessControlContract];

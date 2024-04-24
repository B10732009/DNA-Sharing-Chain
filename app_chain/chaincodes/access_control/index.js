'use strict';

const { Contract } = require('fabric-contract-api');

class AccessControlContract extends Contract {
    constructor() {
        super('AccessControlContract');
    }

    async instantiate() {
        // function that will be invoked on chaincode instantiation
    }

    async createUser(ctx, address, role, level) {
        const userInfo = { role: role };
        if (role == 'patient') {
            userInfo.permission = {
                chr1: 0, chr2: 0, chr3: 0, chr4: 0, chr5: 0, chr6: 0,
                chr7: 0, chr8: 0, chr9: 0, chr10: 0, chr11: 0, chr12: 0,
                chr13: 0, chr14: 0, chr15: 0, chr16: 0, chr17: 0, chr18: 0,
                chr19: 0, chr20: 0, chr21: 0, chr22: 0, chr23: 0, chr24: 0
            }
        }
        else {
            userInfo.level = level;
        }
        await ctx.stub.putState(address, Buffer.from(JSON.stringify(userInfo)));
        return { success: 'ok' };
    }

    async updatePermission(ctx, address, newPermission) {
        const buffer = await ctx.stub.getState(address);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        let userInfo = JSON.parse(buffer.toString());
        if (userInfo.role != 'patient') {
            return { error: 'only patient can update permission' };
        }
        userInfo.permission = JSON.parse(newPermission);
        await ctx.stub.putState(address, Buffer.from(JSON.stringify(userInfo)));
        return { success: 'ok' };
    }

    async getPermission(ctx, address) {
        const buffer = await ctx.stub.getState(address);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        const userInfo = JSON.parse(buffer);
        if (userInfo.role != 'patient') {
            return { error: 'only patient can get permission' };
        }
        return { success: 'ok', data: userInfo.permission };
    }

    async getLevel(ctx, address) {
        const buffer = await ctx.stub.getState(address);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        const userInfo = JSON.parse(buffer);
        if (userInfo.role != 'research_institute') {
            return { error: 'only research institute can get level' };
        }
        return { success: 'ok', data: userInfo.level };
    }

    async getRole(ctx, address) {
        const buffer = await ctx.stub.getState(address);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        const userInfo = JSON.parse(buffer);
        return { success: 'ok', data: userInfo.role };
    }

    async put(ctx, key, value) {
        await ctx.stub.putState(key, Buffer.from(value));
        return { success: 'ok' };
    }

    async get(ctx, key) {
        const buffer = await ctx.stub.getState(key);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        return { success: 'ok', data: buffer.toString() };
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
        return { success: 'ok', data: queryResults };
    }
}

exports.contracts = [AccessControlContract];

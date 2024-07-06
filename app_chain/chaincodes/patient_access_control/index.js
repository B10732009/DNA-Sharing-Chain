'use strict';

const { Contract } = require('fabric-contract-api');

class PatientAccessControlContract extends Contract {
    constructor() {
        super('PatientAccessControlContract');
    }

    async instantiate() {
        // function that will be invoked on chaincode instantiation
    }

    async createUser(ctx, id) {
        const patientAccessControlObject = {
            accessLevelList: {
                chr1: 4, chr2: 4, chr3: 4, chr4: 4, chr5: 4, chr6: 4,
                chr7: 4, chr8: 4, chr9: 4, chr10: 4, chr11: 4, chr12: 4,
                chr13: 4, chr14: 4, chr15: 4, chr16: 4, chr17: 4, chr18: 4,
                chr19: 4, chr20: 4, chr21: 4, chr22: 4, chr23: 4, chr24: 4
            },
            accessTicketList: {
            }
        };
        const buffer = Buffer.from(JSON.stringify(patientAccessControlObject));
        await ctx.stub.putState(id, buffer);
        return { success: 'ok' };
    }

    async updateAccessLevelList(ctx, id, newAccessLevelList) {
        const buffer = await ctx.stub.getState(id);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        let patientAccessControlObject = JSON.parse(buffer.toString());
        patientAccessControlObject.accessLevelList = JSON.parse(newAccessLevelList);
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(patientAccessControlObject)));
        return { success: 'ok' };
    }

    async getAccessLevelList(ctx, id) {
        const buffer = await ctx.stub.getState(id);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        const patientAccessControlObject = JSON.parse(buffer.toString());
        return { success: 'ok', data: patientAccessControlObject.accessLevelList };
    }

    async queryAccessLevelList(ctx, queryString) {
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

    async updateAccessTicketList(ctx, id, newAccessTicketList) {
        const buffer = await ctx.stub.getState(id);
        if (!buffer || !buffer.length) {
            return { error: 'not found' };
        }
        let patientAccessControlObject = JSON.parse(buffer.toString());
        patientAccessControlObject.accessTicketList = JSON.parse(newAccessTicketList);
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(patientAccessControlObject)));
        return { success: 'ok' };
    }

    // async put(ctx, key, value) {
    //     await ctx.stub.putState(key, Buffer.from(value));
    //     return { success: 'ok' };
    // }

    // async get(ctx, key) {
    //     const buffer = await ctx.stub.getState(key);
    //     if (!buffer || !buffer.length) {
    //         return { error: 'not found' };
    //     }
    //     return { success: 'ok', data: buffer.toString() };
    // }
}

exports.contracts = [PatientAccessControlContract];

const identityManager = artifacts.require("IdentityManager");
const identity = artifacts.require("Identity");

module.exports = function (deployer) {
  deployer.deploy(identityManager);
  // deployer.deploy(identity, '0x3e014e5c311a7d6f652ca4f8bb016f4338a44118'); // only for test
};

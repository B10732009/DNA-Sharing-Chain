const identityManager = artifacts.require("IdentityManager");

module.exports = function (deployer) {
  deployer.deploy(identityManager);
};

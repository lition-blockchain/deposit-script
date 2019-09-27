const fs = require('fs');
const Web3 = require('web3');

const keystorePath = process.env.KEYSTORE_PATH || './keystore/';
const sponsorAddress = process.env.SPONSOR_ADDRESS || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const providerUrl = process.env.PROVIDER_URL || 'https://ropsten.infura.io/v3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const tokenAddress = process.env.TOKEN_ADDRESS || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const registryAddress = process.env.REGISTRY_ADDRESS || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const stake = process.env.STAKE || '100000';

const web3 = new Web3(providerUrl);

const files = fs.readdirSync(keystorePath);
for (let i = 0; i < files.length; i++) {
  const keystore = fs.readFileSync(keystorePath + files[i]).toString();
  web3.eth.accounts.wallet.decrypt([JSON.parse(keystore)], '');
}

const addresses = [];
for (var i = 0; i < web3.eth.accounts.wallet.length; i++) {
  addresses.push(web3.eth.accounts.wallet[i].address);
}

const tokenAbi = require('./tokenAbi');
const TestToken = new web3.eth.Contract(tokenAbi, tokenAddress);
const registryAbi = require('./registryAbi');
const LitionRegistry = new web3.eth.Contract(registryAbi, registryAddress);

(async () => {
  const nonce = await web3.eth.getTransactionCount(sponsorAddress);
  const promises = [];
  for (let i = 0; i < web3.eth.accounts.wallet.length; i++) {
    promises.push(
      web3.eth.sendTransaction({
        from: sponsorAddress,
        to: web3.eth.accounts.wallet[i].address,
        value: web3.utils.toWei('0.01'),
        gas: 21000,
        nonce: nonce + i,
      })
    );
  }
  await Promise.all(promises);

  for (let i = 0; i < web3.eth.accounts.wallet.length; i++) {
    const address = web3.eth.accounts.wallet[i].address;
    const count = await web3.eth.getTransactionCount(address);
    console.log({ address, count });

    TestToken.methods.mint(address, web3.utils.toWei(stake)).send({
      from: address,
      gas: 100000,
      nonce: count
    }).then(console.log).catch(console.error);

    TestToken.methods.approve(registryAddress, web3.utils.toWei(stake)).send({
      from: address,
      gas: 100000,
      nonce: count + 1
    }).then(console.log).catch(console.error);

    LitionRegistry.methods.requestDepositInChain(2, web3.utils.toWei(stake)).send({
      from: address,
      gas: 200000,
      nonce: count + 2
    }).then(console.log).catch(console.error);

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  console.log('Waiting for transaction receipts...')
})();

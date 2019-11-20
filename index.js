const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

import {
  LibraClient,
  LibraNetwork,
  LibraWallet,
  Mnemonic,
  Account as LibraAccount
} from 'kulap-libra';

import { generateMnemonic } from 'bip39';

app.use(express.json());

// routes go here
app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})

async function main(res) {
  const client = new LibraClient({
    network: LibraNetwork.Testnet
  });

  const wallet = new LibraWallet({
    mnemonic: 'upgrade salt test stable drop paddle'
  });

  const account = wallet.newAccount();

  // mint 2 libracoins to users accounts
  await client.mintWithFaucetService(account.getAddress(), 20e6);
  await res.send(account.getAddress().toHex())
}

async function checkBalance(res) {
  const client = new LibraClient({
    network: LibraNetwork.Testnet
  });

  const accountAddress = '5b11978aff577ce80d92fe84df0b3addead6fde60d0ea3c063279a75872a3774';
  const accountState = await client.getAccountState(accountAddress);

  // log account balance
  await res.send(accountState.balance.toString());

  // Account state has other information that you could be interested in such as `sequenceNumber`.
}

async function checkTransfer(res, amount) {
  const client = new LibraClient({
    network: LibraNetwork.Testnet
  })

  var mnemonic = generateMnemonic(256);

  const wallet = new LibraWallet({
    mnemonic: mnemonic,

  });
  const account = wallet.newAccount();
  await client.mintWithFaucetService(account.getAddress(), 20e6);
  const account2Address = 'e3dc341f99d3c1329dbeda40ec3d3bfe424ede9c59d87399266f3b705784ccd5';
  console.log("Generated address is: " + account.getAddress().toHex());
  console.log("Transfering...");
  const response = await client.transferCoins(account, account2Address, Number(amount)*1e6);
  console.log("Transfer done.");
  // wait for transaction confirmation
  return res.send("transaction done")
}

async function checkStatus(res) {
  const client = new LibraClient({
    network: LibraNetwork.Testnet
  });
  const accountAddress = '5b11978aff577ce80d92fe84df0b3addead6fde60d0ea3c063279a75872a3774';
  const sequenceNumber = 43; //can also use a string for really large sequence numbers;

  const transaction = await client.getAccountTransaction(accountAddress, sequenceNumber).then(function() {

    res.send("transaction done")

  });

}

app.get('/api', (req, res) => {

  let data = {
    from: req.query.from
  }

  main(res)

})

app.post('/transaction', (req, res) => {
  let data = {
    amount: req.body.amount
  }

  return checkTransfer(res, data.amount)

})

app.get('/balance', (req, res) => {

  checkBalance(res)

})

app.get('/checkStatus', (req, res) => {



})

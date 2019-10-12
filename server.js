import { LibraClient, LibraNetwork, LibraWallet, Account as LibraAccount } from 'kulap-libra';
import _ from 'lodash';

const express = require('express');
const app = express();
const libraClient = new LibraClient({ network: LibraNetwork.Testnet });
const mongo = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const rand = require("random-key");

app.use(express.json());

app.get('/', function (req, res) {
	mongo.connect(url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	  }, (err, client) => {
	  if (err) {
	    console.error(err)
	    return
	  }
	  const db = client.db('local');
		const collection = db.collection('Users');
		collection.find().toArray((err, items) => {
		  console.log(items)
		});
	});
});

app.get('/account/create', function (req, res) {
	const phoneNumber = req.body.number;
	const wallet = new LibraWallet();
	const account = wallet.newAccount();
	var config = wallet.getConfig();
	const publicKey = account.getAddress().toHex();
	const mnemonic = config.mnemonic;
	const secretKey = {"secret_key": rand.generate()};

	mongo.connect(url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	  }, (err, client) => {
	  if (err) {
	    console.error(err)
	    return;
	  }
	  const db = client.db('local');
	  const collection = db.collection('Users');
	  const userWalletInfo = {"public_key": publicKey, "mnemonic": mnemonic};
	  const userId = {"_id": phoneNumber};
	  const userEntry = _.merge(userId, userWalletInfo, secretKey);
	  collection.insertOne(userEntry, (err, result) => {
	  	return res.send(userEntry);
	  });
	});	
});

app.post('/account/information', function (req, res) {
	const number = req.body.number;
	mongo.connect(url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	  }, (err, client) => {
	  if (err) {
	    console.error(err)
	    return;
	  }
	  const db = client.db('local');
	  const collection = db.collection('Users');
	  collection.findOne({"_id": number}, (err, user) => {
	  	return res.send(user);
	  });
	});
});

app.post('/transaction', async function (req, res) {
	console.log(req.body);
	const amount = Number(req.body.amount)*1e6;
	const receiver = req.body.receiver;
	const number = req.body.number;
	console.log("data");
	console.log(amount);
	console.log(receiver);
	console.log(number);
	mongo.connect(url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	  }, (err, client) => {
	  if (err) {
	    console.error(err)
	    return;
	  }
	  const db = client.db('local');
	  const users = db.collection('Users');
	  const societies = db.collection('Societies');
	  users.findOne({"_id": number}, async (err, user) => {
	  	societies.findOne({"_id": receiver}, async (err, society) => {
  			const walletOfSender = new LibraWallet({"mnemonic": user.mnemonic});
			const accountOfSender = walletOfSender.newAccount();
			await libraClient.transferCoins(accountOfSender, society['public_key'], amount);
			const transactions = db.collection('Transactions');
			// Identifier of a transaction stored in MongoDB could be the id of the TX stored in the ledger (in Libra) as it is unique too
			// Instead of current date, we could use date associated to the transaction stored in the ledger (in Libra)
			// Sender and receiver are identified through the public key and official identifier, respectively, as other data can change (phone number for the user and public key for the society, respectively)
			const transaction = {'sender': user['public_key'], 'receiver': society['_id'], 'date': Date.now(), 'amount': amount};
			transactions.insertOne(transaction, (err, result) => {
		  		return res.end("OK");
		  	});
	  	});
	  });
	});
});

app.post('/account/update', function (req, res) {
	const initiator = req.body.initiator; // Phone number used to ask for update, could (should) be saved for audit purpose
	const currentNumber = req.body.current;
	const newNumber = req.body.new;
	const secretKey = req.body.secret_key;
	mongo.connect(url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	  }, (err, client) => {
	  if (err) {
	    console.error(err)
	    return;
	  }
	  const db = client.db('local');
	  const collection = db.collection('Users');
	  collection.findOne({"_id": currentNumber}, (err, user) => {
	  	if(user["secret_key"] == secretKey) {
	  		console.log("OK");
			user._id = newNumber;
			collection.insertOne(user, (err, result) => {
		  	});
			collection.deleteOne({"_id": currentNumber}, (err, result) => {
		  	});
			return res.send(user);
	  	} else {
	  		return res.send("ERROR");
	  	}
	  });
	});
});

app.post('/account/migration', async function (req, res) {
	// An entry should be added in a specific db for audit purposes
	const receiver = req.body.receiver;
	const number = req.body.number;
	mongo.connect(url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	  }, (err, client) => {
	  if (err) {
	    console.error(err)
	    return;
	  }
	  const db = client.db('local');
	  const collection = db.collection('Users');
	  collection.findOne({"_id": number}, async (err, user) => {
	  	const walletOfSender = new LibraWallet({"mnemonic": user.mnemonic});
		const accountOfSender = walletOfSender.newAccount();
		const accountState = await libraClient.getAccountState(accountOfSender.getAddress().toHex());
		await libraClient.transferCoins(accountOfSender, receiver, Number(accountState.balance));
		return res.end("OK");
	  });
	});
});

app.get('/account/:accountId/mint/:amount', async function (req, res) {
	var parameters = req.params;
	await libraClient.mintWithFaucetService(parameters.accountId, parameters.amount);
	return res.send("OK");
});

app.get('/account/:accountId/balance', async function (req, res) {
	var parameters = req.params;
	const accountAddress = parameters.accountId;
  	const accountState = await libraClient.getAccountState(accountAddress);
 
  	// log account balance
  	console.log(accountState.balance.toString());
  	return res.send(accountState.balance);
});

app.listen(process.env.EXPRESS_PORT || 3000);
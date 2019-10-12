connection = new Mongo();
db = connection.getDB("local");
db.createCollection('Users');
db.createCollection('Societies');
db.createCollection('Transactions');
quit();
var express = require('express');
var app = express();
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://user:password@ds141175.mlab.com:41175/ouhk';
var bodyParser = require('body-parser');

app.use(session({
	secret: 'restaurant',
	resave: true,
	saveUninitialized: false
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Controller
app.get('/', function(req, res) {
	sess = req.session;
	if(sess.user) {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			findRestaurants(db, function(result) {
				db.close();
				res.render('index', {user: sess.user, restaurants: result});
			});
		});
	} else {
		res.render('login', {prompt: ''});
	}
});

app.post('/register', function(req, res) {
	var criteria = {};
	criteria['userid'] = req.body.userid;
	criteria['password'] = req.body.password;
	
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		createUser(db, criteria, function(result) {
			db.close();
			if (result)
				res.render('login', {prompt: 'Registration complete. Please login.'});
			else
				res.render('login', {prompt: 'User ID: "' + criteria['userid'] + '" is taken. Try another.'});
		});
	});
});

app.post('/login', function(req, res) {
	var criteria = {};
	criteria['userid'] = req.body.userid;
	criteria['password'] = req.body.password;

	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		findUser(db, criteria, function(result) {
			db.close();
			if (result) {
				sess = req.session;
				sess.user = criteria['userid'];
				res.redirect('/');
			} else {
				res.render('login', {prompt: 'Incorrect user ID or password.'});
			}
		});
	});
});

app.get('/logout', function(req, res) {
	req.session.destroy(function(err) {
		assert.equal(err, null);
		res.redirect('/');
	});
});

// Model
function createUser(db, criteria, callback) {
	db.collection('users').insertOne(criteria, function(err, result) {
		try {
			assert.equal(err, null);
		} catch (err) {
			console.error('User ID: "' + criteria['userid'] + '" is taken. Insert user failed.');
		}
		callback(result);
	});
}

function findUser(db, criteria, callback) {
	db.collection('users').findOne(criteria, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

function findRestaurants(db, callback) {
	var restaurants = [];
	var cursor = db.collection('restaurants').find({});
	cursor.each(function(err, result) {
		assert.equal(err, null); 
		if (result != null)
			restaurants.push(result);
		else
			callback(restaurants);
	});
}

app.listen(process.env.PORT || 8099);
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
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Controller
app.get('/', function(req, res) {
	if(req.session._id) {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			findRestaurants(db, function(result) {
				db.close();
				res.render('index', {restaurants: result});
			});
		});
	} else {
		res.render('login', {prompt: ''});
	}
});

app.post('/register', function(req, res) {
	var user = {};
	user['userid'] = req.body.userid;
	user['password'] = req.body.password;
	
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		createUser(db, user, function(result) {
			db.close();
			if (result) {
				res.render('login', {prompt: 'Registration complete. Please login.'});
			} else {
				res.render('login', {prompt: 'User ID: "' + user['userid'] + '" is taken. Try another.'});
			}
		});
	});
});

app.post('/login', function(req, res) {
	var user = {};
	user['userid'] = req.body.userid;
	user['password'] = req.body.password;

	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		findUser(db, user, function(result) {
			db.close();
			console.log(result + 'dffd');
			if (result) {
				req.session._id = result._id;
				req.session.userid = user['userid'];
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

app.get('/restaurant', function(req, res) {
	var criteria = {};
	criteria['_id'] = new ObjectId(req.query._id);
	
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		findRestaurantById(db, criteria, function(result) {
			db.close();
			if (result)
				res.render('restaurant', {restaurant: result});
			else
				res.render('login', {prompt: 'Incorrect user ID or password.'});
		});
	});
});

// Model
function createUser(db, user, callback) {
	db.collection('users').insertOne(user, function(err, result) {
		try {
			assert.equal(err, null);
		} catch (err) {
			console.error('User ID: "' + user['userid'] + '" is taken. Insert user failed.');
		}
		callback(result);
	});
}

function findUser(db, user, callback) {
	db.collection('users').findOne(user, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

function findRestaurants(db, callback) {
	var restaurants = [];
	var cursor = db.collection('restaurants').find({});
	cursor.each(function(err, result) {
		assert.equal(err, null); 
		if (result != null) {
			restaurants.push(result);
		} else {
			callback(restaurants);
		}
	});
}

function findRestaurantById(db, criteria, callback) {
	db.collection('restaurants').findOne(criteria, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

app.listen(process.env.PORT || 8099);

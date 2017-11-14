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
			
      (db, function(result) {
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

app.post('/createRestaurants', function(req, res) {
	var restaurant = {};
	restaurant['name'] = req.body.name;
	restaurant['owner'] = req.body.owner;
	console.log(restaurant);

	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		createRestaurant(db, restaurant, function(result) {
			db.close();
			console.log(result);
			if (result) {
				res.render('createRestaurant', {prompt: 'success'});
			} else {
				res.render('createRestaurant', {prompt: 'failed'});
			}
		});
	});
});

app.get('/createRestaurant', function(req, res) {
	res.render('createRestaurant', {prompt: ''});
});

app.get('/restaurant', function(req, res) {
	if(req.session._id) {
		var restaurant = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			findRestaurantById(db, restaurant, function(result) {
				db.close();
				res.render('restaurant', {restaurant: result});
			});
		});
	} else {
		res.redirect('/');
	}
});

app.get('/rate', function(req, res) {
	if(req.session._id) {
		var restaurant = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		res.render('rate', {restaurant: restaurant});
	} else {
		res.redirect('/');
	}
});

app.get('/doRate', function(req, res) {
	if(req.session._id) {
		var restaurant = {};
		var grade = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		grade['user'] = req.session.userid;
		grade['score'] = req.query.score;
		
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			
			checkIfRated(db, restaurant, req.session.userid, function(result) {
				db.close();
				//
			});
			
			insertGrade(db, restaurant, grade, function(result) {
				db.close();
				res.redirect('/restaurant?_id=' + req.query._id);
			});
		});
	} else {
		res.redirect('/');
	}
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

function createRestaurant(db, rest, callback) {
	db.collection('restaurants').insertOne(rest, function(err, result) {
		try {
			assert.equal(err, null);
		} catch (err) {
			console.error('User ID: "' + rest['name'] + '" is taken. Insert user failed.');
		}
		callback(result);
	});
}

function findRestaurantById(db, restaurant, callback) {
	db.collection('restaurants').findOne(restaurant, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

function insertGrade(db, restaurant, grade, callback) {
	db.collection('restaurants').updateOne(restaurant, {$push: {'grades': grade}}, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

function checkIfRated(db, restaurant, userid, callback) {
	db.collection('restaurants').findOne(restaurant, {'grades': {$elemMatch: {'user': userid}}}, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

app.listen(process.env.PORT || 8099);
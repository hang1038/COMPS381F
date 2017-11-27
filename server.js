var express = require('express');
var app = express();
var session = require('cookie-session');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://user:password@ds141175.mlab.com:41175/ouhk';
var bodyParser = require('body-parser');

var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');

const fileUpload = require('express-fileupload');

app.use(fileUpload());


// *********** express-fileloader
app.use(session({
	name: 'session',
	keys: ['key1', 'key2']
}));
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// API
app.get('/api/restaurant/read', function(req, res) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		findRestaurants(db, {}, function(result) {
			db.close();
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(result));
		});
	});
});

app.get('/api/restaurant/read/:key/:value', function(req, res) {
	var criteria = {};
	criteria[req.params.key] = req.params.value;
	
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err, null);
		findRestaurants(db, criteria, function(result) {
			db.close();
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(result));
		});
	});
});

app.post('/create', function(req, res) {
  console.log(req.body);
  var rest = {};
  for (data in req.body){
	console.log(req.body[data]);
	rest[data] = req.body[data];
  }
  var message = {};
  if (rest['name'] != null && rest['owner'] != null){
    console.log("data enought");

		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			createRestaurant(db, rest, function(result) {
				db.close();
				//console.log(result);
				
				if (result) {
					res.status(200);
					res.setHeader('Content-Type', 'application/json');
					console.log(result);
					message['status'] = "ok"
					message['_id'] = result['ops'][0]['_id'];
					res.send(JSON.stringify(message));
				} else {
					res.status(404);
					res.setHeader('Content-Type', 'application/json');
					
					message['status'] = "error";
					res.send(JSON.stringify(message));
				}
			});
		});
  }else{
    	res.status(200);
	res.setHeader('Content-Type', 'application/json');
					
	message['status'] = "failed";
	res.send(JSON.stringify(message));
  }

});

// Controller
app.get('/', function(req, res) {
	if(req.session.authenticated) {
		var criteria = {};
		for (i in req.query) {
			criteria[i] = req.query[i];
		}
		
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			findRestaurants(db, criteria, function(result) {
				db.close();
				res.status(200);
				res.render('index', {restaurants: result, criteria: criteria});
			});
		});
	} else {
		res.status(401);
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
				res.status(200);
				res.render('login', {prompt: 'Registration complete. Please login.'});
			} else {
				res.status(400);
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
				req.session.authenticated = true;
				req.session._id = result._id;
				req.session.userid = result.userid;
				res.redirect('/');
			} else {
				res.status(400);
				res.render('login', {prompt: 'Incorrect user ID or password.'});
			}
		});
	});
});

app.get('/logout', function(req, res) {
	req.session = null;
	res.redirect('/');
});

app.post('/createRestaurants', function(req, res) {
	
	var restaurant = {};
	restaurant['restaurant_id'] = randomID();
	restaurant['owner'] = req.session.userid;


	console.log(req.files.photoToUpload.mimetype); 

	console.log(req.files.photoToUpload.data.toString('base64'));

	var mimetype = req.files.photoToUpload.mimetype;
	var base64 = req.files.photoToUpload.data.toString('base64');
	

	restaurant['name'] = req.body.name;
	restaurant['borough'] = req.body.borough;
	restaurant['cuisine'] = req.body.cuisine;
	restaurant['address_street'] = req.body.address_street;
	restaurant['address_building'] = req.body.address_building;
	restaurant['address_zipcode'] = req.body.address_zipcode;
	restaurant['address_coord'] = req.body.address_coord;

	console.log("here is rest " + restaurant['name']);

	restaurant['photo_mimetype'] = mimetype;
	restaurant['photo'] = base64;


		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			createRestaurant(db, restaurant, function(result) {
				db.close();
				//console.log(result);
				if (result) {
					res.render('createRestaurant', {prompt: 'success'});
				} else {
					res.render('createRestaurant', {prompt: 'failed'});
				}
			});
		});
});

app.get('/createRestaurant', function(req, res) {
	//console.log(randomID());
	res.render('createRestaurant', {prompt: ''});
});

app.get('/deleteRestaurant', function(req, res) {
	if(req.session.authenticated) {
		var restaurant = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		console.log(restaurant['_id']);
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			deleteRestaurant(db, restaurant, function(result) {
				db.close();
				if (result) {
					res.render('deleteRestaurant', {message: 'success delete restaurant'});
				}
			});
		});

	}
	
});

app.get('/editRestaurant', function(req, res) {
	if(req.session.authenticated) {
		var restaurant = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			findRestaurantById(db, restaurant, function(result) {
				db.close();
				if (result) {
					res.status(200);
					res.render('editRestaurant', {restaurant: result, message:"-"});
				} else {
					res.status(400).end('restaurant id:' + req.query._id + ' not found!');
				}
			});
		});
	} else {
		res.redirect('/');
	}
});

app.post('/updateRestaurant', function(req, res) {

	var restaurant = {};
	var updateID = {};
	updateID['_id'] = new ObjectId(req.query._id);
	restaurant['_id'] = new ObjectId(req.query._id);
	restaurant['owner'] = req.session.userid;

	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
	      var filename = files.photoToUpload.path;
	      var mimetype = files.photoToUpload.type;

		restaurant['name'] = fields.name;
		restaurant['borough'] = fields.borough;
		restaurant['cuisine'] = fields.cuisine;
		restaurant['address_street'] = fields.address_street;
		restaurant['address_building'] = fields.address_building;
		restaurant['address_zipcode'] = fields.address_zipcode;
		restaurant['address_coord'] = fields.address_coord;
		
		console.log("here is rest " + restaurant['name'] + "id " + restaurant['restaurant_id'] + "mimetype " + mimetype);

	      fs.readFile(filename, function(err,data) {
		if (mimetype != "application/octet-stream"){
			var base64 = new Buffer(data).toString('base64');
			restaurant['photo'] = base64;
			restaurant['photo_mimetype'] = mimetype;
console.log("photo type" + mimetype);
		}
console.log("enter2");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			updateRestaurant(db, updateID, restaurant, function(result){
				console.log("enter");
				db.close();
				if (result) {
					res.status(200);
					res.redirect('/restaurant?_id='+updateID['_id']);
				} else {
					res.status(400).end('restaurant id:' + req.query._id + ' not found!');
				}
			});
			
			
		});
		
	      })
	});

});


app.get('/restaurant', function(req, res) {
	if(req.session.authenticated) {
		var restaurant = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			findRestaurantById(db, restaurant, function(result) {
				db.close();
				if (result) {
					res.status(200);
					res.render('restaurant', {restaurant: result});
				} else {
					res.status(400).end('restaurant id:' + req.query._id + ' not found!');
				}
			});
		});
	} else {
		res.redirect('/');
	}
});

app.get('/map', function(req,res) {
	res.status(200);
	res.render('map.ejs', {lat:req.query.lat,lon:req.query.lon,title:req.query.title});
});

app.get('/rate', function(req, res) {
	if(req.session.authenticated) {
		var restaurant = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		res.status(200);
		res.render('rate', {restaurant: restaurant});
	} else {
		res.redirect('/');
	}
});

app.get('/doRate', function(req, res) {
	if(req.session.authenticated) {
		var restaurant = {};
		var grade = {};
		restaurant['_id'] = new ObjectId(req.query._id);
		grade['user'] = req.session.userid;
		grade['score'] = req.query.score;
		
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err, null);
			insertGrade(db, restaurant, grade, req.session.userid, function(result) {
				db.close();
				if (result) {
					res.redirect('/restaurant?_id=' + req.query._id);
				} else {
					res.status(400);
					res.render('error', {error: 'You have already rated this restaurant'});
				}
			});
		});
	} else {
		res.redirect('/');
	}
});

// Model
function randomID(){
	return Math.floor(Math.random() * 1000000000);
}

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

function findRestaurants(db, criteria, callback) {
	var restaurants = [];
	var cursor = db.collection('restaurants').find(criteria);
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


function deleteRestaurant(db, rest, callback) {
	db.collection('restaurants').deleteOne(rest, function(err, result) {
		try {
			assert.equal(err, null);
		} catch (err) {
			console.error('error');
		}
		callback(result);
	});
}

function updateRestaurant(db, restaurant, updateRest, callback) {
	db.collection('restaurants').findOne(restaurant,  function(err, result) {
		assert.equal(err, null);
		if (result) {
			db.collection('restaurants').updateOne(restaurant, { $set: updateRest }, function(err, result) {
				assert.equal(err, null);
				callback(result);
			});
		}
	});
}

function findRestaurantById(db, restaurant, callback) {
	db.collection('restaurants').findOne(restaurant, function(err, result) {
		assert.equal(err, null);
		callback(result);
	});
}

function insertGrade(db, restaurant, grade, userid, callback) {
	db.collection('restaurants').findOne(restaurant, {'grades': {$elemMatch: {'user': userid}}}, function(err, result) {
		assert.equal(err, null);
		if (result.grades) {
			callback(null);
		} else {
			db.collection('restaurants').updateOne(restaurant, {$push: {'grades': grade}}, function(err, result) {
				assert.equal(err, null);
				callback(result);
			});
		}
	});
}

app.listen(8099,'localhost');

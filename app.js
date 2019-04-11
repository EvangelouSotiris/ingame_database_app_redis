const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const body_parser = require('body-parser');
const method_override = require('method-override')
const redis = require('redis');

const port = 3000;

const app = express();
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended:false}));

app.use(method_override('_method'));

var client = redis.createClient(); //create my new client
//Connecting to REDIS database
client.on('connect', function() {
	console.log('Redis client is now connected. Host:127.0.0.1, Port:6379');
});

client.on('error', function(error) {
	console.log('Redis client did not connect due to error: ' + error);
});

// Search Page
app.get('/', function(req, res, next){
	res.render('searchplayers');
});

app.listen(port, function(){
	console.log('Server started on port '+ port);
});

// Search processing
app.post('/player/search', function(req,res,next){
	let alias = req.body.alias;
	client.hgetall(alias, function(err, obj){
		if (!obj){
			res.render('searchplayers',{
				error : 'Player does not exist.'
			});
		}
		else {
			obj.alias = alias;
			res.render('details',{
				user:obj
			});
		}
	});
});

app.get('/register', function(req, res, next){
	res.render('addplayer');
});

app.post('/register', function(req,res,next){
	let alias = req.body.alias;
	let firstname = req.body.firstname;
	let lastname = req.body.lastname;
	let email = req.body.email;
	let race = req.body.race;
	let pclass = req.body.class;
	let password = req.body.password;

	client.hmset(alias , [
		'firstname', firstname,
		'lastname', lastname,
		'email', email,
		'race', race,
		'class', pclass,
		'password', password,
		'gold', 500,
		'level', 0
	], function(err,reply){
		if (err) {
			console.log(err);
		}
		console.log(reply);
		res.redirect('/');
	});

	alias_inv = alias+'::inventory'
	client.sadd(alias_inv, 'clothes','potions','weapons', 'ingredients')
});

app.get('/login', function(req, res, next){
	res.render('login');
});

app.post('/login' , function(req, res, next){
	let alias = req.body.alias;
	let pass  = req.body.password;
	client.hget(alias, "password" , function(err, obj){
		console.log(obj);
		console.log(pass)
		if (!obj) {
			res.render('login',{
				error : 'alias is incorrect'
			});
		}
		else {
			if (obj != pass){
				res.render('login',{
					error : 'password is incorrect'
				});	
				return			
			} 
			obj.alias = alias;
			res.render('ingame',{
				user:obj
			});
		}
	}.bind( {pass: pass} ));
});

/*
var bluebird = require('bluebird')
bluebird.promisifyAll(redis);

function read_json_into_database(filename,client) {  // Giving a .json file this function sets the fields/values in the database
	var parsed_json_file = require(filename);
	//parsed_json_file = JSON.parse(parsed_json_file);
	for (head_field in parsed_json_file) {  // users
		for (sub_field in parsed_json_file[head_field]){
			client.sadd(head_field, sub_field);  // users = {user1, user2, ...}
			sub_key_name = head_field + "::" + sub_field;
			for (field in parsed_json_file[head_field][sub_field]) {  // user1
				client.sadd(sub_key_name, field);  // users::user1 = {level, name, inventory, ...}
				lower_sub_key_name = sub_key_name + '::' + field; // name,level,inventory...
				if (field == 'inventory') {
					for (itemlist in parsed_json_file[head_field][sub_field][field]){
						client.sadd(lower_sub_key_name,itemlist)  // users::user1::inventory = {clothes, ingredients...}
						item_category_key = lower_sub_key_name + "::" + itemlist
						if (itemlist == "weapons") {
							for (var i = 0; i< parsed_json_file[head_field][sub_field][field][itemlist].length; i++) {
								client.sadd(item_category_key,parsed_json_file[head_field][sub_field][field][itemlist][i])
								// users::user1::inventory::weapons = [w1,w2...]
							}
						}
						else if(itemlist == "clothes") {
							for (cloth_type in parsed_json_file[head_field][sub_field][field][itemlist]) {
								client.sadd(item_category_key,cloth_type)
								cloth_type_key = item_category_key + "::" + cloth_type
								for (var i = 0; i< parsed_json_file[head_field][sub_field][field][itemlist][cloth_type].length; i++) {
									client.sadd(cloth_type_key,parsed_json_file[head_field][sub_field][field][itemlist][cloth_type][i])
									// users::user1::inventory::clothes::boots = [b1,b2...]
								} 
							}
						}
						else {
							for (item in parsed_json_file[head_field][sub_field][field][itemlist]) {
								client.sadd(item_category_key,item)
								item_key = item_category_key + "::" + item 
								client.set(item_key, parsed_json_file[head_field][sub_field][field][itemlist][item])
								// users::user1::inventory::ingredients::dragonthorn = 1
							}
						}
					}
				}
				else {
					client.set(lower_sub_key_name,parsed_json_file[head_field][sub_field][field])
					// users::user1::name = "sotiris"
				}
			}
		}
	}
	return client;
}

function add_user(username,firstname,surname,age,email,race,chosenclass,client) {
	
	if (check_existence("users",client) == 1){
		console.log("yuh")
		if (client.exists(username)!=1){
			client.sadd("users",username)
			userkey = "users::"+username
			client.sadd(userkey,"name")
			client.sadd(userkey,"surname")
			client.sadd(userkey,"age")
			client.sadd(userkey,"email")
			client.sadd(userkey,"race")
			client.sadd(userkey,"class")
			client.sadd(userkey,"level")
			client.sadd(userkey,"gold")
			client.sadd(userkey,"inventory")
			client.set([userkey+"::name", firstname , userkey+"::surname", surname, userkey+"::age", age,
				userkey+"::email", email,userkey+"::race", race,userkey+"::class", chosenclass, userkey+"::level", 0,
				userkey+"::gold", 500,userkey+"::inventory", inventory,])
		}
	}
}

read_json_into_database('./db_data.json',client);
add_user("leut","leuteris","chatzief","22","left@kati.pl","argonian","tank",client);
*/
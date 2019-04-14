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
			res.render('details',{user:obj});
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

	client.exists(alias, function(err, obj){
		if (obj == 1) {
			res.render('addplayer',{
				error : 'There is already a player with this alias.'
			});
			return
		}
		else {
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
		}
	});
});

app.get('/login', function(req, res, next){
	res.render('login');
});

app.post('/login' , function(req, res, next){
	let alias = req.body.alias;
	let pass  = req.body.password;
	client.hget(alias, "password" , function(err, obj){
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
			res.render('ingame',{layout:'logged', alias: alias});
		}
	}.bind({pass: pass, alias: alias}));
});


let game_actions = require("./gameobj.json");

app.post('/loot', function(req, res, next){
	let alias = req.body.alias;
	let types = Object.keys(game_actions['loot']);
	let rand_type = types[Math.floor(Math.random() * types.length)];
	let rand_loot = game_actions['loot'][rand_type][Math.floor(Math.random() * game_actions['loot'][rand_type].length)]
	res.render("loot",{layout:'logged' , loot:rand_loot});
});
app.post('/info', function(req, res, next){
	let alias = req.body.alias;
	client.hgetall(alias, function(err, obj){
		obj.alias = alias;
		res.render("info",{layout:'logged', user: obj});
	});
});
app.post('/inventory', function(req, res, next){
	let alias = req.body.alias;
	let actual_key = alias + '::inventory'
	client.smembers(actual_key, function(err, inv){
		alias = actual_key.substring(0,actual_key.length-11)
		client.smembers(actual_key + "::weapons",function(err, weapons){
			client.smembers(actual_key + "::clothes",function(err, clothes){
				client.smembers(actual_key + "::ingredients",function(err, ingr){
					res.render("inventory",{layout:'logged', inv : inv, alias: alias, weapons : weapons, clothes:clothes , ingr:ingr});
				}.bind({inv : inv, alias: alias, weapons : weapons, clothes:clothes}));
			}.bind({inv : inv, alias: alias, weapons : weapons}));
		}.bind({inv : inv, alias: alias}));
	});
});
app.post('/sell', function(req, res, next){
	res.render("sell",{layout:'logged'});
});
app.post('/buy', function(req, res, next){
	res.render("buy",{layout:'logged'});
});
app.post('/trash', function(req, res, next){
	res.render("trash",{layout:'logged'});
});
app.post('/findtreasure', function(req, res, next){
	res.render("findtreasure",{layout:'logged'});
});



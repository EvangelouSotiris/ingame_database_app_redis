const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const body_parser = require('body-parser');
const method_override = require('method-override')
const redis = require('redis');

const port = 3000;  //webapp on localhost:3000

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

app.listen(port, function(){
	console.log('Server started on port '+ port);
});


// Search Page
app.get('/', function(req, res, next){
	res.render('searchplayers');
});

// Search processing
app.post('/player/search', function(req,res,next){
	let alias = req.body.alias;
	client.hgetall(alias, function(err, obj){  // get every field in the hash <alias>
		if (!obj){  // if obj is not returned (null) then the alias doesn't exist.
			res.render('searchplayers',{
				error : 'Player does not exist.'
			});
		}
		else {
			obj.alias = alias;
			res.render('details',{user:obj});  // if he exists render his acc details
		}
	});
});


app.get('/register', function(req, res, next){
	res.render('addplayer');  // render the register form page
});

app.post('/register', function(req,res,next){  // update fields with the form inputs
	let alias = req.body.alias;
	let firstname = req.body.firstname;
	let lastname = req.body.lastname;
	let email = req.body.email;
	let race = req.body.race;
	let pclass = req.body.class;
	let password = req.body.password;

	client.exists(alias, function(err, obj){  // check if registered alias already exists in redis
		if (obj == 1) {
			res.render('addplayer',{
				error : 'There is already a player with this alias.'
			});
			return
		}
		else {  // there is no player with this alias
			client.hmset(alias , [
				'firstname', firstname,
				'lastname', lastname,
				'email', email,
				'race', race,
				'class', pclass,
				'password', password,
				'gold', 500,  // initial gold and level
				'level', 0
			], function(err,reply){
				if (err) {
					console.log(err);
				}
				console.log(reply);
				res.redirect('/');  // in case of error return to home page and show the error in console
			});

			alias_inv = alias+'::inventory'  // create an inventory key for the new player
			client.sadd(alias_inv, 'clothes','weapons', 'ingredients')  // add members in the set
		}
	});
});


app.get('/login', function(req, res, next){
	res.render('login');  // render log in form page
});

app.post('/login' , function(req, res, next){
	let alias = req.body.alias;  // login requires alias and password
	let pass  = req.body.password;
	client.hget(alias, "password" , function(err, obj){  // get the password of the given alias
		if (!obj) {
			res.render('login',{
				error : 'alias is incorrect'  // if the password doesn't return then the alias doesn't exist
			});
		}
		else {
			if (obj != pass){
				res.render('login',{
					error : 'password is incorrect'  // if the password isn't correct return error
				});	
				return			
			}
			res.render('ingame',{layout:'logged', alias: alias});  //if alias and its password are correct render ingame page for the user with this alias
		}
	}.bind({pass: pass, alias: alias}));
});


let game_actions = require("./gameobj.json");  // json handwritten, contains the different objects of the game

//loot and find treasure have the exact same functionality with two distinct differences:
//looting an enemy levels up the player and rewards him with a looted item, most likely a weapon or cloth.
//finding a treasure doesn't level up the player, and is most likely an ingredient or a cloth

app.post('/loot', function(req, res, next){
	let alias = req.body.alias;
	let types = Object.keys(game_actions['loot']);
	let rand_type = types[Math.floor(Math.random() * types.length)];  // random reward from the json loot field
	let rand_loot = game_actions['loot'][rand_type][Math.floor(Math.random() * game_actions['loot'][rand_type].length)]
	client.hincrby(alias, "level", 1)
	if (rand_type == 'gold') {
		client.hincrby(alias, "gold" , rand_loot);
		res.render("loot",{layout:'logged' , loot:rand_loot, money: true, levelup : true});  // the same page is rendered with find
	}
	else {
		client.lpush(alias + '::inventory::' + rand_type, rand_loot);
		res.render("loot",{layout:'logged' , loot:rand_loot, levelup : true});
	}
});

app.post('/findtreasure', function(req, res, next){
	let alias = req.body.alias;
	let types = Object.keys(game_actions['find']);
	let rand_type = types[Math.floor(Math.random() * types.length)];  // random reward from the json find field
	let rand_loot = game_actions['find'][rand_type][Math.floor(Math.random() * game_actions['find'][rand_type].length)]
	if (rand_type == 'gold') {
		client.hincrby(alias, "gold" , rand_loot);  // if gold was found, increase the hash field gold
		res.render("loot",{layout:'logged' , loot:rand_loot, money: true, levelup : false});
	}
	else {
		client.lpush(alias + '::inventory::' + rand_type, rand_loot);  // add a new item into the inventory
		res.render("loot",{layout:'logged' , loot:rand_loot, levelup : false});
	}
});


app.post('/info', function(req, res, next){  // shows the account details of the user
	let alias = req.body.alias;
	client.hgetall(alias, function(err, obj){  // get every hash field for alias
		obj.alias = alias;
		res.render("info",{layout:'logged', user: obj});
	});
});


app.post('/inventory', function(req, res, next){  // shows the inventory details of the user
	let alias = req.body.alias;
	let actual_key = alias + '::inventory'
	client.smembers(actual_key, function(err, inv){
		alias = actual_key.substring(0,actual_key.length-11)
		client.lrange(actual_key + "::weapons",0,-1,function(err, weapons){
			client.lrange(actual_key + "::clothes",0,-1,function(err, clothes){  // show all the list contents
				client.lrange(actual_key + "::ingredients",0,-1,function(err, ingr){
					res.render("inventory",{layout:'logged', inv : inv, alias: alias, weapons : weapons, clothes:clothes , ingr:ingr});
				}.bind({inv : inv, alias: alias, weapons : weapons, clothes:clothes}));
			}.bind({inv : inv, alias: alias, weapons : weapons}));
		}.bind({inv : inv, alias: alias}));
	});
});


// function that finds every item possessed and prints it in sell page, with an error if provided
function display_sell_info(actual_key, sell_table,req, res, error="Nothing"){
	client.smembers(actual_key, function(err, inv){
		alias = actual_key.substring(0,actual_key.length-11)
		client.lrange(actual_key + "::weapons",0,-1,function(err, weapons){
			var dict = {'weapons':{},'clothes':{},'ingredients':{}};
			for (i in weapons) {
				dict['weapons'][weapons[i]] = sell_table[weapons[i]];  // finds the price of the item from the json file
			}
			client.lrange(actual_key + "::clothes",0,-1,function(err, clothes){
				for (i in clothes) {
					dict['clothes'][clothes[i]] = sell_table[clothes[i]];
				}	
				client.lrange(actual_key + "::ingredients",0,-1,function(err, ingredients){
					for (i in ingredients) {
						dict['ingredients'][ingredients[i]] = sell_table[ingredients[i]];
					}
					if (error == "Nothing"){
						res.render("sell",{
							layout:'logged', 
							alias : alias,
							weapons : dict['weapons'], 
							clothes: dict['clothes'], 
							ingredients: dict['ingredients']
						});
						return;
					}
					else {
						res.render("sell",{
							layout:'logged',
							alias : alias,
							weapons : dict['weapons'], 
							clothes: dict['clothes'], 
							ingredients: dict['ingredients'],
							error : error
						});
						return;
					}
				}.bind({inv : inv, alias: alias, dict : dict}));
			}.bind({inv : inv, alias: alias, dict : dict}));
		}.bind({inv : inv, alias: alias, sell_table: sell_table}));
	});
}

app.post('/sell', function(req, res, next){
	let alias = req.body.alias;
	let actual_key = alias + '::inventory'
	let sell_table = game_actions['store']['sell']
	if (req.body.homescreen){  // back button
		res.render('ingame',{layout:'logged', alias: alias});
		return;
	}
	if (req.body.item_to_sell){  // if there is an item to sell specified
		let item_to_sell = req.body.item_to_sell;
		if (item_to_sell in sell_table){  // if the item exists in game (in the json)
			client.smembers(actual_key, function(err, inv){
				alias = actual_key.substring(0,actual_key.length-11)
				client.lrange(actual_key + "::weapons",0,-1,function(err, weapons){
					var dict = {'weapons':{},'clothes':{},'ingredients':{}};
					for (i in weapons) {
						dict['weapons'][weapons[i]] = sell_table[weapons[i]];
					}
					client.lrange(actual_key + "::clothes",0,-1,function(err, clothes){
						for (i in clothes) {
							dict['clothes'][clothes[i]] = sell_table[clothes[i]];
						}	
						client.lrange(actual_key + "::ingredients",0,-1,function(err, ingredients){
							for (i in ingredients) {
								dict['ingredients'][ingredients[i]] = sell_table[ingredients[i]];
							}	
							if (item_to_sell in dict['weapons'] || item_to_sell in dict['clothes'] || item_to_sell in dict['ingredients']){
								client.hincrby(alias, "gold",sell_table[item_to_sell]);
								if (item_to_sell in dict['weapons']){
									client.lrem(alias+"::inventory::weapons" , 1, item_to_sell);
								}
								if (item_to_sell in dict['clothes']){
									client.lrem(alias+"::inventory::clothes" , 1, item_to_sell);
								}
								if (item_to_sell in dict['ingredients']){
									client.lrem(alias+"::inventory::ingredients" , 1, item_to_sell);
								}

								res.render("sell",{
									layout:'logged',
									alias : alias,
									weapons : dict['weapons'], 
									clothes: dict['clothes'], 
									ingredients: dict['ingredients'],
									error : "The item has been sold."
								});
								return;
							}

							else {
								res.render("sell",{
									layout:'logged', 
									alias : alias,
									weapons : dict['weapons'], 
									clothes: dict['clothes'], 
									ingredients: dict['ingredients'],
									error : "You don't possess the item."
								});
								return;
							}
						}.bind({inv : inv, alias: alias, dict : dict, item_to_sell:item_to_sell}));
					}.bind({inv : inv, alias: alias, dict : dict, item_to_sell:item_to_sell}));
				}.bind({inv : inv, alias: alias, sell_table: sell_table, item_to_sell: item_to_sell}));
			});
		}
		else { 
			display_sell_info(actual_key, sell_table, req,res, error="The item doesn't exist.");
		}
	}
	else{  // first time opening sell page
		display_sell_info(actual_key, sell_table,req, res);
	}
});


app.post('/buy', function(req, res, next){  // implements the "buy from store" functionality
	let alias = req.body.alias;
	if (req.body.homescreen){  // back button
		res.render('ingame',{layout:'logged', alias: alias});
		return;
	}
	if (req.body.item_for_purchase){  // item specified by user
		let item_for_purchase = req.body.item_for_purchase;
		let item = req.body.item_for_purchase.toLowerCase();
		if (item in game_actions['store']['buy']) {
			let price = game_actions['store']['buy'][item]
			client.hget(alias, 'gold', function(err, obj){
				if (obj >= price) {  // bought new item
					client.hincrby(alias, "gold" , -price);  // increase gold by negative value
					if (game_actions['loot']['weapons'].includes(item)) {
						client.lpush(alias + '::inventory::weapons', item);  
					}
					if (game_actions['loot']['clothes'].includes(item)) {
						client.lpush(alias + '::inventory::clothes', item)
					}
					if (game_actions['find']['ingredients'].includes(item)) {
						client.lpush(alias + '::inventory::ingredients', item)
					}
					res.render("buy",{layout:'logged', alias: alias, error : 'The purchase has been made'});
					return;
				}
				else {
					res.render("buy",{layout:'logged', alias: alias, error : 'You don\'t have enough gold for this purchase.'});
					return;
				}
			}.bind({price : price, alias : alias, item: item, game_actions : game_actions}));
		}
		else {
			res.render("buy",{layout:'logged', alias: alias, error : 'The item you chose doesn\'t exist'});
			return;
		}
	}
	else {
		res.render("buy",{layout:'logged', alias: alias});  // first time in buy page
		return;
	}
});



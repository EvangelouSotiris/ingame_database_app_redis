var redis = require('redis');
var client = redis.createClient(); //create my new client

//Connecting to REDIS database
client.on('connect', function() {
	console.log('Redis client is now connected. Host:127.0.0.1, Port:6379');
});

client.on('error', function(error) {
	console.log('Redis client did not connect due to error: ' + error);
});


function read_json_into_database(filename) {  // Giving a .json file this function sets the fields/values in the database
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
}

read_json_into_database('./db_data.json');

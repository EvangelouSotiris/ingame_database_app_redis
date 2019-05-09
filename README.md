# Redis database application for handling users and their in-game data
Project of creating a Redis database for users and their in-game data for the ECE428 course.

# Prerequisites
> NodeJS and NPM
```
sudo apt-get install nodejs
sudo apt-get install npm
```
> Redis
```
sudo apt-get install redis-server
```
If running in Linux (I use Ubuntu 18.04 or 19.04), in /etc/redis/redis.conf you will need to edit "supervised no" to
```
supervised systemd
```
# Troubleshooting
- This application and redis installation has not been tested in Windows OS. <br>
- If the port 3000 has a service already running on it, please change it in the code to run your web app.

# Run
Firstly, clone the project by using:
```
git clone https://github.com/EvangelouSotiris/ingame_database_app_redis.git
```
Run by changing your directory to where the app.js file is and running it:
```
cd ingame_database_app_redis
node app
```
Then open your favourite browser to localhost:3000 and explore the app. **enjoy**

# Checked out list
At this point the user can search for other users ,register a new account,login with his password, and do certain game actions such as looting an enemy, finding treasures, buying from stores, selling to stores and viewing his info and inventory.

# Todo list
- Finished Project. No Imminent TODO actions.

# Authors
**Evangelou Sotiris** - *Developer* - [Github](https://github.com/EvangelouSotiris)

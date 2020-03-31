const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');
const Model = Sequelize.Model;
const Clarifai = require('clarifai');

const app = express();

//express middleware-----------------------------------
app.use(cors())
app.use(bodyParser.json());
//------------------------------------------------------

const clarifai = new Clarifai.App({
 apiKey: '5f1e60e5435b41659b9ef2f16c2a802b'
});

// Check and create default DATABASE-------------------------------------------
// Setting up a connection
const sequelize = new Sequelize('postgres://ciarpotxucteoz:c6b91626eef48d0bc5469704f81aae92e39faaa9b77f898417640d5c5adc6fe1@ec2-52-23-14-156.compute-1.amazonaws.com:5432/d1u9mcucm6a5g9')

//Testing the connection
	sequelize
	  .authenticate()
	  .then(() => {
	    console.log('Connection has been established successfully.');
	  })
	  .catch(err => {
	    console.error('Unable to connect to the database:', err);
	  });


//Create default tables with some data
	const User = sequelize.define('user', {
	  name: {
	    type: Sequelize.STRING,
	    allowNull: false,
	  },
	  email: {
	    type: Sequelize.STRING,
	    unique: true
	  },
	  entries: {
	  	type: Sequelize.INTEGER
	  }
	}, {
	  sequelize
	});

	User.sync({ force: true })
	.then(() => {
		return User.create({
    	name: 'John',
    	email: 'John@gmail.com',
    	entries: 0
 		});
	})

	const Login = sequelize.define('login', {
		  email: {
		    type: Sequelize.STRING,
		    allowNull: false,
		    unique: true
		  },
		  hash: {
		    type: Sequelize.STRING
		  }
		}, {
		  sequelize
		});

	Login.sync({ force: true })
//-------------------------------------------------------------------------------------------------------------------------

//Request from FRONT-END----------------------------------------------------------------------------------------------------
//root GET -> return db.users
app.get('/', (req, res) => { User.findAll().then(users => res.json(users)) });

//signin POST -> return success or fail
app.post('/signin', (req, res) => {
	
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json('incorrect form submission');
	}

	Login.findAll({
		where: {
			email: email
		}
	})
	.then(logins => {
		// console.log(data[0]))
			const isValid = bcrypt.compareSync(password, logins[0].hash);
			if (isValid) {
				User.findAll({
					where: {
						email: email
					}
				})
				.then(users => res.json(users[0]))
				.catch(err => res.status(400).json('unable to get user'))
			} else {
				res.json('wrong credentials')
			}
	})
	.catch(err => res.status(400).json('wrong credentials')) 

	
})
//register POST -> return new user
app.post('/register', (req, res) => {
	
	const { name, email, password } = req.body;
	const hash = bcrypt.hashSync(password)

	return sequelize.transaction(t => {
 		return Login.create({
  			email: email,
  			hash: hash
  		}, {transaction: t}).then(user => {
  			return User.create({
  			name: name,
  			email: user.email,
  			entries: 0
  			}, {transaction: t});
  		});
  	})
  	.then(user => {
 		res.status(200).json(user)	
  	})
  	.catch(err => {
  		res.status(400).json('unable to register')
	})

})
	
//profile/:id GET -> return user from db with ID
app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	User.findAll({
		where: {
			id: id
		}
	})
	.then(users => {
		if (users.length) {
			res.json(users[0])
		}
		else {
			res.status(400).json('not found')
		}
	})
	.catch(err => res.status(400).json('error getting user'))
})

//image PUT -> return entries
app.put('/image', (req, res) => {
	const {id} = req.body;
	User.findByPk(id).then(user => {
		return user.increment('entries', {by:1})
	}).then(user => res.json(user))
	.catch(err => res.status(400).json('error getting user entries'))
})

//imageUrl post -> return clarifai_response
app.post('/imageurl', (req, res) => {
	const {input} = req.body;
	clarifai.models.predict("a403429f2ddf4b49b307e318f00e528b", input)
    .then(response => res.json(response))
    .catch(err => res.status(400).json(err))
	
})
//------------------------------------------------------------------------------------------------------------------------

app.listen(5000, () => {
	console.log('server is running on port 5000')
})
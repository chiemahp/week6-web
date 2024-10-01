// server.js
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const { check, validationResult } = require('express-validator');

//initialize
const app = express();

//configure middleware
app.use(express.static(path.join(__dirname, '')));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.urlencoded({extended: true}));

// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'shumwepauly1937#;',
    database: 'db'
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// Set up middleware to parse incoming data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.get('/register', (request, response) => {
    response.sendFile(path.join(__dirname) , '/register.html');
});


// Define a User representation for clarity
const User = {
    tableName: 'users', 
    createUser: function(newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },  
    getUserByEmail: function(email, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function(username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    }

}


// define Registration route and logic
app.post('/register', [
    // Validate email and username fields
    check('email').isEmail().withMessage('provide valid email address'),
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),

    // Custom validation to check if email and username are unique
    check('email').custom(async (value) => {
        const user = await User.getUserByEmail(value);
        if (user) {
            throw new Error('Email already exists');
        }
    }),
    check('username').custom(async (value) => {
        const user = await User.getUserByUsername(value);
        if (user) {
            throw new Error('Username already exists');
        }
    }),
], async (request, response) => {
    // Check for validation errors
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);

    // Create a new user object
    const newUser = {
        email: request.body.email,
        username: request.body.username,
        password: hashedPassword,
        full_name: request.body.full_name
    };

    // Insert or save new user into MySQL
    User.createUser(newUser, (error, results, fields) => {
        if (error) {
          console.error('Error inserting user: ' + error.message);
          return response.status(500).json({ error: error.message });
        }
        console.log('Inserted a new user with id ' + results.insertId);
        response.status(201).send(newUser);
      });

      app.listen(5500, () => {
        console.log('server is running on port 5500');
    });  
});

// Login route
app.post('/login', (request, response) => {
    const { username, password } = request.body;
    // Retrieve user from database
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            response.status(401).send('Invalid username or password');
        } else {
            const user = results[0];
            // Compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    // Store user in session
                    request.session.user = user;
                    response.send('Login successful');
                } else {
                    response.status(401).send('Invalid username or password');
                }
            });
        }
    });
});

//Dashboard route
app.get('/dashboard', (request, response) => {
    // Assuming you have middleware to handle user authentication and store user information in req.user
    const userFullName = request.user.full_name;
    response.render('dashboard', { fullName: userFullName });
});

// Start server
const PORT = process.env.PORT || 5500;
 app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

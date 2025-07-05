// file: server.js

// 1. Imports
const express       = require('express');
const mongoose      = require('mongoose');
const bcrypt        = require('bcrypt');
const session       = require('express-session');
const MongoStore    = require('connect-mongo');
const path          = require('path');

// 2. App setup
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/auth_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// 4. Define User schema & model
const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

app.get('/ping', (req, res) => {
  res.send('pong');
});

// 5. Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
  secret: 'replace_this_with_a_strong_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/auth_app',
    collectionName: 'sessions'
  }),
  cookie: { maxAge: 1000 * 60 * 15 } // 15 minutes
}));

// 6. Serve static files
app.use(express.static(path.join(__dirname, '')));

// 7. Explicit root route (guarantees index.html on GET /)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '', 'index.html'));
});

// 8. Registration route
app.post('/register', async (req, res) => {
    const { email, password } = req.body;                  
    try {
        const existing = await User.findOne({ email });
        if (!email || !password || password.length < 8) {
            return res.redirect('/?error=register');
        }
        //Enforcing password rules
        const usernamePart = email.split('@')[0];
        const nameFrags = usernamePart.match(/[a-zA-Z]+/g) || [];
        const passRules = [
            /[A-Z]/,        //atleast one upperCase
            /[a-z]/,        //atleast one lowerCase
            /[0-9]/,        //atleast one number
            /[^A-Za-z0-9]/  //atleast one special character
        ];

        const isStrong = passRules.every(rule => rule.test(password));
        const containsName = nameFrags.some(name => password.toLowerCase().includes(name.toLowerCase()));
        if(!isStrong || containsName){
            return res.redirect('/?error=weakpass');
        }

        //Checking for existing user
        const passwordHash = await bcrypt.hash(password, 12);
        await User.create({email, passwordHash});

        //Redirecting to login
        res.redirect('/?registered=true');

    } catch (err) {
        console.error(err);
        res.redirect('/?error=register');
    }
});

// 9. Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;                  
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      req.session.user = { email };
      return res.redirect('/welcome.html');
    }
    res.redirect('/?error=login');
  } catch (err) {
    console.error(err);
    res.redirect('/?error=login');
  }
});

// 10. Protect welcome page
app.get('/welcome.html', (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
});

// 11. Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

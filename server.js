// file: server.js
// 1. Imports
const express     = require('express');
const mongoose    = require('mongoose');
const bcrypt      = require('bcrypt');
const session     = require('express-session');
const MongoStore  = require('connect-mongo');
const multer      = require('multer');          // NEW  ← to parse FormData
const path        = require('path');

// 2. App setup
const app  = express();
const PORT = process.env.PORT || 3000;

// 3. Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/auth_app', {
  useNewUrlParser : true,
  useUnifiedTopology : true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

// 4. Define User schema & model
const userSchema = new mongoose.Schema({
  email        : { type: String, required: true, unique: true },
  passwordHash : { type: String, required: true },
  createdAt    : { type: Date,   default : Date.now }
});
const User = mongoose.model('User', userSchema);

// 5. Middleware
app.use(express.urlencoded({ extended: false }));   // for normal POSTs
app.use(express.json());                            // for JSON bodies
const parseForm = multer().none();                  // NEW ← for multipart bodies

app.use(session({
  secret : 'replace_this_with_a_strong_secret',
  resave : false,
  saveUninitialized : false,
  store  : MongoStore.create({
    mongoUrl : 'mongodb://localhost:27017/auth_app',
    collectionName : 'sessions'
  }),
  cookie : { maxAge: 1000 * 60 * 15 }               // 15 min
}));

// 6. Serve static files
app.use(express.static(path.join(__dirname, '')));

// 7. Root -> index.html
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, '', 'index.html'))
);

function jsonOrRedirect(req, res, payload, redirectUrl) {
  if (req.headers['x-requested-with'] === 'fetch') {
    return res.json(payload);
  }
  return res.redirect(redirectUrl);
}

//Register route
app.post('/register', parseForm, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Basic length
    if (!email || !password || password.length < 8) {
      return jsonOrRedirect(req, res,
        { ok:false, err:'weakpass' },
        '/?signup=true&error=weakpass');
    }

    // Character‑class rules
    const strong =
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!strong) {
      return jsonOrRedirect(req, res,
        { ok:false, err:'weakpass' },
        '/?signup=true&error=weakpass');
    }

    // “Contains-name” rule
    const userPart   = email.split('@')[0].replace(/[^a-z]/gi, '').toLowerCase();
    const passLower  = password.toLowerCase();
    let containsName = false;
    for (let i = 0; i <= userPart.length - 3 && !containsName; i++) {
      if (passLower.includes(userPart.slice(i, i + 3))) containsName = true;
    }
    if (containsName) {
      return jsonOrRedirect(req, res,
        { ok:false, err:'weakpass' },
        '/?signup=true&error=weakpass');
    }

    // Unique e‑mail
    if (await User.findOne({ email })) {
      return jsonOrRedirect(req, res,
        { ok:false, err:'register' },
        '/?signup=true&error=register');
    }

    // Save
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ email, passwordHash });

    return jsonOrRedirect(req, res,
      { ok:true, registered:true },
      '/?registered=true');

  } catch (err) {
    console.error(err);
    return jsonOrRedirect(req, res,
      { ok:false, err:'register' },
      '/?signup=true&error=register');
  }
});

//Login route
app.post('/login', parseForm, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      req.session.user = { email };
      return jsonOrRedirect(req, res,
        { ok:true },
        '/welcome.html');
    }
    return jsonOrRedirect(req, res,
      { ok:false, err:'login' },
      '/?error=login');
  } catch (err) {
    console.error(err);
    return jsonOrRedirect(req, res,
      { ok:false, err:'login' },
      '/?error=login');
  }
});

//Reset Password route
app.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword || newPassword.length < 8) {
    return res.json({ ok: false, err: 'weakpass' });
  }

  const strong =
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword);

  const userPart = email.split('@')[0].replace(/[^a-z]/gi, '').toLowerCase();
  const passLower = newPassword.toLowerCase();
  let containsName = false;

  for (let i = 0; i <= userPart.length - 3 && !containsName; i++) {
    const chunk = userPart.slice(i, i + 3);
    if (passLower.includes(chunk)) containsName = true;
  }

  if (!strong || containsName) return res.json({ ok: false, err: 'weakpass' });

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ email }, { $set: { passwordHash } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, err: 'server' });
  }
});


//Protected welcome page
app.get('/welcome.html', (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/');
});


//Start server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const multer     = require('multer');
const path       = require('path');
const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');

// Initialize Express
const app  = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});

// Define User schema & model (with role)
const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['user','admin'], default: 'user' },
  createdAt:    { type: Date,   default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Middleware
app.use(express.urlencoded({ extended: false }));   // parse URL‑encoded bodies
app.use(express.json());                            // parse JSON bodies
const parseForm = multer().none();                  // parse multipart/form-data

app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl:       process.env.MONGODB_URI,
    collectionName: 'sessions'
  }),
  cookie: { maxAge: 15 * 60 * 1000 }  // 15 minutes
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '')));

// Helper to respond JSON for fetch or redirect for form submits
function jsonOrRedirect(req, res, payload, redirectUrl) {
  if (req.headers['x-requested-with'] === 'fetch') {
    return res.json(payload);
  }
  return res.redirect(redirectUrl);
}

// Setup Nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// JWT auth middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    req.user = payload;   // contains email & role
    next();
  });
}

// Routes

// Root → index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Register route (now accepts role)
app.post('/register', parseForm, async (req, res) => {
  const { email, password, role = 'user' } = req.body;
  try {
    // Validate presence & length
    if (!email || !password || password.length < 8) {
      return jsonOrRedirect(req, res,
        { ok: false, err: 'weakpass' },
        '/?signup=true&error=weakpass'
      );
    }
    // Strength checks
    const strong = /[A-Z]/.test(password)
                && /[a-z]/.test(password)
                && /[0-9]/.test(password)
                && /[^A-Za-z0-9]/.test(password);
    if (!strong) {
      return jsonOrRedirect(req, res,
        { ok: false, err: 'weakpass' },
        '/?signup=true&error=weakpass'
      );
    }
    // Prevent part of email in password
    const userPart  = email.split('@')[0].replace(/[^a-z]/gi, '').toLowerCase();
    const passLower = password.toLowerCase();
    for (let i = 0; i <= userPart.length - 3; i++) {
      if (passLower.includes(userPart.slice(i, i + 3))) {
        return jsonOrRedirect(req, res,
          { ok: false, err: 'weakpass' },
          '/?signup=true&error=weakpass'
        );
      }
    }
    // Unique email check
    if (await User.findOne({ email })) {
      return jsonOrRedirect(req, res,
        { ok: false, err: 'register' },
        '/?signup=true&error=register'
      );
    }
    // Hash & save user (with role)
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ email, passwordHash, role });
    return jsonOrRedirect(req, res,
      { ok: true, registered: true },
      '/?registered=true'
    );
  } catch (err) {
    console.error(err);
    return jsonOrRedirect(req, res,
      { ok: false, err: 'register' },
      '/?signup=true&error=register'
    );
  }
});

// Login route (issues JWT)
app.post('/login', parseForm, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      // Issue JWT containing email & role
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return res.json({ ok: true, token });
    }
    return jsonOrRedirect(req, res,
      { ok: false, err: 'login' },
      '/?error=login'
    );
  } catch (err) {
    console.error(err);
    return jsonOrRedirect(req, res,
      { ok: false, err: 'login' },
      '/?error=login'
    );
  }
});

// Send OTP route (unchanged)
app.post('/send-otp', parseForm, async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ ok: false, err: 'no_user' });
  }
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  req.session.otpEmail  = email;
  req.session.otp       = otp;
  req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
  try {
    await transporter.sendMail({
      from:    process.env.GMAIL_USER,
      to:      email,
      subject: 'Your OTP Code',
      text:    `Your verification code is ${otp}. It expires in 5 minutes.`
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    return res.json({ ok: false, err: 'mail_fail' });
  }
});

// Verify OTP route (unchanged)
app.post('/verify-otp', parseForm, (req, res) => {
  const { email, otp: userOtp } = req.body;
  if (email !== req.session.otpEmail) {
    return res.json({ ok: false, err: 'mismatch' });
  }
  if (Date.now() > req.session.otpExpiry) {
    return res.json({ ok: false, err: 'expired' });
  }
  if (userOtp !== req.session.otp) {
    return res.json({ ok: false, err: 'invalid' });
  }
  delete req.session.otp;
  delete req.session.otpExpiry;
  delete req.session.otpEmail;
  return res.json({ ok: true });
});

// Reset Password route (unchanged)
app.post('/reset_password', parseForm, async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 8) {
    return res.json({ ok: false, err: 'weakpass' });
  }
  const strong = /[A-Z]/.test(newPassword)
              && /[a-z]/.test(newPassword)
              && /[0-9]/.test(newPassword)
              && /[^A-Za-z0-9]/.test(newPassword);
  if (!strong) {
    return res.json({ ok: false, err: 'weakpass' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: false, err: 'no_user' });
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.json({ ok: false, err: 'samepass' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ email }, { $set: { passwordHash } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, err: 'server' });
  }
});

// Protected welcome page (JWT)
app.get('/welcome.html', authenticateJWT, (req, res) => {
  res.sendFile(path.join(__dirname, 'welcome.html'));
});

// Start server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const multer     = require('multer');
const path       = require('path');
const nodemailer = require('nodemailer');

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

// Define User schema & model
const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
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

// Routes

// Root -> index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Register route
app.post('/register', parseForm, async (req, res) => {
  const { email, password } = req.body;
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
    // Hash & save user
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ email, passwordHash });
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

// Login route
app.post('/login', parseForm, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      req.session.user = { email };
      return jsonOrRedirect(req, res,
        { ok: true },
        '/welcome.html'
      );
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

// Send OTP route
app.post('/send-otp', parseForm, async (req, res) => {
  const { email } = req.body;
  // Verify user exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ ok: false, err: 'no_user' });
  }
  // Generate & store OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  req.session.otpEmail  = email;
  req.session.otp       = otp;
  req.session.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Send email
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

// Verify OTP route
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
  // Clear OTP data
  delete req.session.otp;
  delete req.session.otpExpiry;
  delete req.session.otpEmail;
  return res.json({ ok: true });
});

// Reset Password route
app.post('/reset-password', parseForm, async (req, res) => {
  const { email, newPassword } = req.body;
  // Validate
  if (!email || !newPassword || newPassword.length < 8) {
    return res.json({ ok: false, err: 'weakpass' });
  }
  // Strength checks
  const strong = /[A-Z]/.test(newPassword)
              && /[a-z]/.test(newPassword)
              && /[0-9]/.test(newPassword)
              && /[^A-Za-z0-9]/.test(newPassword);
  if (!strong) {
    return res.json({ ok: false, err: 'weakpass' });
  }
  // Update password
  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ email }, { $set: { passwordHash } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, err: 'server' });
  }
});

// Protected welcome page
app.get('/welcome.html', (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/');
});

// Start server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

//Connecting to Mongodb
mongoose.connect('mongodb://localhost:27017/auth_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

//User Schema
const userSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    passwordHash: {type: String, required: true},
    createdAt: {type: Date, default: Date.now}
});
const User = mongoose.model('User', userSchema);

//Middleware Setup
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/auth_app',
        collectionName: 'sessions'
    }),
    cookie: {maxAge: 1000 * 60 * 15} // 15 minutes
}));

//Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

//Registration Route
app.post('/register', async (req, res) => {
    try{
        const existing = await User.findOne({email});
        if(existing){
            return res.redirect('/?error=register');
        }
        const passwordHash = await bcrypt.hash(password, 12);
        await User.create({email, passwordHash});
        req.session.user = {email};
        res.redirect('/welcome.html');
    } catch(err){
        console.error(err);
        res.redirect('/?error=register');
    }
});

//Login Route
app.post('/login', async(req, res) => {
    const {email, password} = req.body;
    try{
        const user = await User.findOne({email});
        if(user && await bcrypt.compare(password, passwordHash)){
            req.session.user = {email};
            return res.redirect('/welcome.html');
        }
        res.redirect('/?error=login');
    } catch(err){
        console.error(err);
        res.redirect('/?error=login');
    }
});

//Protect Welcome
app.get('/welcome.html', (req, res, next) => {
    if(req.session.user) return next();
    res.redirect('/');
});

//Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
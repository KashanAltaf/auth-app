const express = require('express');
const router = express.Router();
const jst = require('jsonwebtoken');
const User = require('../models/User');

//Signup
router.post('/signup', async(req, res) => {
    try{
        const user = await User.create(req.body);
        res.status(201).json({message: 'User created' });
    } catch(err){
        res.status(400).json({error: 'User already exists or invalid data'});
    }
});

//Login
router.post('/login', async(req, res) => {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if(!user || !(await user.matchPassword(password))){
        return res.status(401).json({error: 'Invalid credentials'});
    }
    const token = jst.sign({id: user_id}, '9ea29eb46231bfc49714261821cf813043e0b9e71262262a2a954cc2f9ddce77', {expiresIn: '24h'});
    res.json({token});
});

module.exports = router;
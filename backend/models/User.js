const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    email:    {type: String, required: true, unique: true},
    password: {type: String, required: true}
});

//Hashing password before saving
userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();
    this.password = await bycrypt.hash(this.password, 10);
    next();
});

//Comparing password
userSchema.methods.matchPassword = function(password){
    return bycrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
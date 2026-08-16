const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { isValidEmail, isNonEmptyString, isStrongEnoughPassword } = require('../utils/validators');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!isNonEmptyString(name, 100)) {
    return res.status(400).json({ message: 'Please provide a valid name.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email.' });
  }
  if (!isStrongEnoughPassword(password)) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });

  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeObject() });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !isNonEmptyString(password, 200)) {
    return res.status(400).json({ message: 'Please provide a valid email and password.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: user.toSafeObject() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

module.exports = { register, login, me };

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

// User login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password hash with user password
    const passwordMatch = await bcrypt.compare(password, user.password);

    // If password doesn't match, return an error
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token for user
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15d' },
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User signup route
router.post('/signup', async (req, res) => {
  const { name, email, password, role, enrollment_number } = req.body;

  try {
    // Check if user already exists with email
    const existingUser = await User.findOne({ email });

    // If user already exists, return an error
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Hash user password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with hashed password
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      enrollment_number,
    });

    // Save new user to database
    await user.save();

    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
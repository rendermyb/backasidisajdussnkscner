const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// Register new admin
// router.post('/register',
//   [
//     body('email').isEmail().normalizeEmail(),
//     body('password').isLength({ min: 6 }),
//     body('name').notEmpty().trim().escape(),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//       const { name, email, password } = req.body;

//       // Check if user exists
//       const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
//       if (existingUser.length > 0) {
//         return res.status(400).json({ message: 'User already exists' });
//       }

//       // Hash password
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);

//       // Create user
//       const [result] = await db.query(
//         'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
//         [name, email, hashedPassword]
//       );

//       res.status(201).json({
//         message: 'User registered successfully',
//       });
//     } catch (error) {
//       console.log(error.message)
//       res.status(500).json({ message: 'Error registering user', error: error.message });
//     }
//   }
// );

router.use(cookieParser());

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      console.log(email)
      console.log(password)

      // Check if user exists
      const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = users[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );


      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({ message: 'Logged in successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error: error.message });
    }
  }
);

router.get('/check', async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(200).json({ message: "ok" });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });

  res.json({ message: 'Logged out successfully' });
});

// Get current user (protected route)
// router.get('/me', auth, async (req, res) => {
//   try {
//     const [user] = await db.query(
//       'SELECT id, name, email, created_at FROM users WHERE id = ?',
//       [req.user.userId]
//     );

//     if (user.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json(user[0]);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching user', error: error.message });
//   }
// });

module.exports = router;
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;   // ✅ added name

    // 🚫 Force role = CLIENT only
    const role = "CLIENT";

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `,
      [name, email, hashedPassword, role]
    );

    res.status(201).json({
      message: "Client registered successfully",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Registration failed"
    });
  }
});

module.exports = router;


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

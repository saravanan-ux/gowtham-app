const express = require("express");
const pool = require("../db");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// ADMIN creates provider
router.post(
  "/create",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { user_id, specialization } = req.body;

      // Check if user exists and is PROVIDER
      const userCheck = await pool.query(
        "SELECT * FROM users WHERE id = $1 AND role = 'PROVIDER'",
        [user_id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(400).json({
          message: "User not found or not a PROVIDER"
        });
      }

      // Insert into providers table
      const result = await pool.query(
        `INSERT INTO providers (user_id, specialization)
         VALUES ($1, $2)
         RETURNING *`,
        [user_id, specialization]
      );

      res.status(201).json({
        message: "Provider created successfully",
        provider: result.rows[0]
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;

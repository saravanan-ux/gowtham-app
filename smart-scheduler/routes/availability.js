const express = require("express");
const pool = require("../db");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// PROVIDER creates availability slot
router.post(
  "/create",
  verifyToken,
  authorizeRole(["PROVIDER"]),
  async (req, res) => {
    try {
      const { resource_id, start_time, end_time } = req.body;

      // 🔥 Get provider_id securely from logged-in user
      const providerResult = await pool.query(
        "SELECT id FROM providers WHERE user_id = $1 AND deleted_at IS NULL",
        [req.user.id]
      );

      if (providerResult.rows.length === 0) {
        return res.status(400).json({
          message: "Provider not found"
        });
      }

      const provider_id = providerResult.rows[0].id;

      const start = new Date(start_time);
      const end = new Date(end_time);

      // Basic validation
      if (start >= end) {
        return res.status(400).json({
          message: "End time must be after start time"
        });
      }
      const now = new Date();

if (new Date(start_time) < now) {
  return res.status(400).json({
    message: "Cannot create availability in the past"
  });
}


      // 🔥 Check provider overlap
      const providerOverlap = await pool.query(
        `
        SELECT 1 FROM availability_slots
        WHERE provider_id = $1
        AND deleted_at IS NULL
        AND (start_time < $3 AND end_time > $2)
        `,
        [
          provider_id,
          start.toISOString(),
          end.toISOString()
        ]
      );

      if (providerOverlap.rows.length > 0) {
        return res.status(400).json({
          message: "Provider has overlapping availability"
        });
      }

      // 🔥 Check resource overlap
      const resourceOverlap = await pool.query(
        `
        SELECT 1 FROM availability_slots
        WHERE resource_id = $1
        AND deleted_at IS NULL
        AND (start_time < $3 AND end_time > $2)
        `,
        [
          resource_id,
          start.toISOString(),
          end.toISOString()
        ]
      );

      if (resourceOverlap.rows.length > 0) {
        return res.status(400).json({
          message: "Resource already booked in that time"
        });
      }

      // 🔥 SAFE INSERT using ISO format
      const result = await pool.query(
        `
        INSERT INTO availability_slots
        (resource_id, provider_id, start_time, end_time, is_booked)
        VALUES ($1, $2, $3, $4, false)
        RETURNING *
        `,
        [
          resource_id,
          provider_id,
          start.toISOString(),
          end.toISOString()
        ]
      );

      res.status(201).json({
        message: "Availability created successfully",
        slot: result.rows[0]
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;

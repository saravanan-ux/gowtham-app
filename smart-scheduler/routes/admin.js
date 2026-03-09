const express = require("express");
const pool = require("../db");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();
router.get(
  "/resources",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, type, created_at
         FROM resources
         ORDER BY created_at DESC`
      );

      res.json(result.rows);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


/* ===========================
   CREATE RESOURCE
=========================== */
router.post(
  "/resources",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          error: "Name and type are required"
        });
      }

      await pool.query(
        `INSERT INTO resources (name, type)
         VALUES ($1, $2)`,
        [name, type]
      );

      res.json({
        message: "Resource created successfully"
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


/* ===========================
   UPDATE RESOURCE
=========================== */
router.put(
  "/resources/:id",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          error: "Name and type are required"
        });
      }

      const existing = await pool.query(
        "SELECT id FROM resources WHERE id = $1",
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          error: "Resource not found"
        });
      }

      await pool.query(
        `UPDATE resources
         SET name = $1,
             type = $2
         WHERE id = $3`,
        [name, type, id]
      );

      res.json({
        message: "Resource updated successfully"
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);



router.get(
  "/analytics",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    try {
      const totalUsers = await pool.query(
        "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"
      );

      const totalProviders = await pool.query(
        "SELECT COUNT(*) FROM providers WHERE deleted_at IS NULL"
      );

      const totalResources = await pool.query(
        "SELECT COUNT(*) FROM resources WHERE deleted_at IS NULL"
      );

      const totalAppointments = await pool.query(
        "SELECT COUNT(*) FROM appointments WHERE deleted_at IS NULL"
      );

      const totalCancelled = await pool.query(
        "SELECT COUNT(*) FROM appointments WHERE status = 'CANCELLED'"
      );

      const bookingRate =
        (totalAppointments.rows[0].count - totalCancelled.rows[0].count) /
        totalAppointments.rows[0].count || 0;

      res.json({
        total_users: totalUsers.rows[0].count,
        total_providers: totalProviders.rows[0].count,
        total_resources: totalResources.rows[0].count,
        total_appointments: totalAppointments.rows[0].count,
        total_cancelled: totalCancelled.rows[0].count,
        booking_rate: Number(bookingRate)
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


/* ===========================
   GET ALL PROVIDERS
=========================== */
router.get(
  "/providers",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.id,
               u.name,
               u.email,
               p.specialization,
               p.deleted_at
        FROM providers p
        JOIN users u ON p.user_id = u.id
        ORDER BY u.name ASC
      `);

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ===========================
   UPDATE PROVIDER
=========================== */
router.put(
  "/providers/:id",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    const providerId = req.params.id;
    const { name, specialization } = req.body;

    try {
      await pool.query(
        `
        UPDATE users
        SET name = $1
        WHERE id = (
          SELECT user_id FROM providers WHERE id = $2
        )
        `,
        [name, providerId]
      );

      await pool.query(
        `
        UPDATE providers
        SET specialization = $1
        WHERE id = $2
        `,
        [specialization, providerId]
      );

      res.json({ message: "Provider updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ===========================
   DISABLE PROVIDER
=========================== */
router.put(
  "/providers/:id/disable",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    const providerId = req.params.id;

    try {
      await pool.query(
        `UPDATE providers SET deleted_at = NOW() WHERE id = $1`,
        [providerId]
      );

      res.json({ message: "Provider disabled successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ===========================
   ENABLE PROVIDER
=========================== */
router.put(
  "/providers/:id/enable",
  verifyToken,
  authorizeRole(["ADMIN"]),
  async (req, res) => {
    const providerId = req.params.id;

    try {
      await pool.query(
        `UPDATE providers SET deleted_at = NULL WHERE id = $1`,
        [providerId]
      );

      res.json({ message: "Provider enabled successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);





module.exports = router;

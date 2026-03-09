const express = require("express");
const pool = require("../db");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/analytics",
  verifyToken,
  authorizeRole(["PROVIDER"]),
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const user_id = req.user.id;

      // Get provider_id using user_id
      const providerResult = await pool.query(
        `SELECT id FROM providers WHERE user_id = $1 AND deleted_at IS NULL`,
        [user_id]
      );

      if (providerResult.rows.length === 0) {
        return res.status(400).json({ message: "Provider not found" });
      }

      const provider_id = providerResult.rows[0].id;

      // Total slots created
      const totalSlots = await pool.query(
        `SELECT COUNT(*) FROM availability_slots
         WHERE provider_id = $1 AND deleted_at IS NULL`,
        [provider_id]
      );

      // Total booked appointments
      const totalBooked = await pool.query(
        `SELECT COUNT(*) FROM appointments a
         JOIN availability_slots s ON a.slot_id = s.id
         WHERE s.provider_id = $1
         AND a.status = 'BOOKED'
         AND a.deleted_at IS NULL`,
        [provider_id]
      );

      // Total cancelled appointments
      const totalCancelled = await pool.query(
        `SELECT COUNT(*) FROM appointments a
         JOIN availability_slots s ON a.slot_id = s.id
         WHERE s.provider_id = $1
         AND a.status = 'CANCELLED'`,
        [provider_id]
      );

      const slots = parseInt(totalSlots.rows[0].count);
      const booked = parseInt(totalBooked.rows[0].count);

      const utilization = slots > 0 ? (booked / slots) : 0;

      res.render("provider-analytics", {
        totalSlots: slots,
        totalBooked: booked,
        totalCancelled: parseInt(totalCancelled.rows[0].count),
        utilization: utilization,
        appointments: [],   // add real query later
        dates: [],          // add real query later
        selectedDate: null
      });


    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);



router.post(
  "/leave",
  verifyToken,
  authorizeRole(["PROVIDER"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { leave_date, reason } = req.body;

      await client.query("BEGIN");

      // Get provider_id
      const providerResult = await client.query(
        "SELECT id FROM providers WHERE user_id = $1",
        [req.user.id]
      );

      if (providerResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Provider not found" });
      }

      const provider_id = providerResult.rows[0].id;

      // Insert leave
      await client.query(
        `
        INSERT INTO provider_leaves (provider_id, leave_date, reason)
        VALUES ($1, $2, $3)
        `,
        [provider_id, leave_date, reason]
      );

      // 🔥 Cancel all appointments on that date
      const appointments = await client.query(
        `
        SELECT a.id, a.slot_id
        FROM appointments a
        JOIN availability_slots s ON a.slot_id = s.id
        WHERE s.provider_id = $1
        AND DATE(s.start_time) = $2
        AND a.status = 'BOOKED'
        `,
        [provider_id, leave_date]
      );

      for (let appt of appointments.rows) {
        // Mark appointment as CANCELLED
        await client.query(
          `
          UPDATE appointments
          SET status = 'CANCELLED',
              cancelled_at = NOW()
          WHERE id = $1
          `,
          [appt.id]
        );

        // Unlock slot
        await client.query(
          `
          UPDATE availability_slots
          SET is_booked = false
          WHERE id = $1
          `,
          [appt.slot_id]
        );
      }

      await client.query("COMMIT");

      res.json({
        message: "Leave created. Appointments cancelled."
      });

    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

module.exports = router;

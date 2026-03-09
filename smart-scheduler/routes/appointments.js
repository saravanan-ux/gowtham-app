const express = require("express");
const pool = require("../db");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

/* =========================================================
   CLIENT BOOK APPOINTMENT (WITH WAITLIST + OVERLAP CHECK)
========================================================= */
router.post(
  "/book",
  verifyToken,
  authorizeRole(["CLIENT"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { slot_id } = req.body;
      const client_id = req.user.id;

      await client.query("BEGIN");

      const slotResult = await client.query(
        `
        SELECT * FROM availability_slots
        WHERE id = $1
        AND deleted_at IS NULL
        FOR UPDATE
        `,
        [slot_id]
      );

      if (slotResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Slot not found" });
      }

      const slot = slotResult.rows[0];
      if (new Date(slot.start_time) < new Date()) {
  await client.query("ROLLBACK");
  return res.status(400).json({
    message: "Cannot book past time slot"
  });
}


      /* ===== CLIENT OVERLAP CHECK ===== */
      const clientOverlap = await client.query(
        `
        SELECT a.*
        FROM appointments a
        JOIN availability_slots s ON a.slot_id = s.id
        WHERE a.client_id = $1
        AND a.status = 'BOOKED'
        AND a.deleted_at IS NULL
        AND (
          s.start_time < $3
          AND s.end_time > $2
        )
        `,
        [client_id, slot.start_time, slot.end_time]
      );

      if (clientOverlap.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "You already have another appointment during this time"
        });
      }

      /* ===== WAITLIST LOGIC ===== */
      if (slot.is_booked) {

        const alreadyInWaitlist = await client.query(
          `
          SELECT * FROM waitlist
          WHERE slot_id = $1
          AND client_id = $2
          `,
          [slot_id, client_id]
        );

        if (alreadyInWaitlist.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: "You are already in the waitlist for this slot"
          });
        }

        await client.query(
          `
          INSERT INTO waitlist (slot_id, client_id)
          VALUES ($1, $2)
          `,
          [slot_id, client_id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
          message: "You have been added to the waitlist"
        });
      }

      /* ===== NORMAL BOOKING ===== */
      await client.query(
        `
        UPDATE availability_slots
        SET is_booked = true
        WHERE id = $1
        `,
        [slot_id]
      );

      const appointmentResult = await client.query(
        `
        INSERT INTO appointments (slot_id, client_id, status)
        VALUES ($1, $2, 'BOOKED')
        RETURNING *
        `,
        [slot_id, client_id]
      );

      const appointment = appointmentResult.rows[0];

      await client.query(
        `
        INSERT INTO appointment_history
        (appointment_id, action, performed_by)
        VALUES ($1, 'CREATED', $2)
        `,
        [appointment.id, client_id]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Appointment booked successfully",
        appointment
      });

    } catch (err) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

/* =========================================================
   CLIENT CANCEL APPOINTMENT (AUTO WAITLIST ASSIGN)
========================================================= */
router.post(
  "/cancel",
  verifyToken,
  authorizeRole(["CLIENT"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { appointment_id } = req.body;
      const client_id = req.user.id;

      await client.query("BEGIN");

      const appointmentResult = await client.query(
        `
        SELECT a.*, s.start_time
        FROM appointments a
        JOIN availability_slots s ON a.slot_id = s.id
        WHERE a.id = $1
        AND a.deleted_at IS NULL
        FOR UPDATE
        `,
        [appointment_id]
      );

      if (appointmentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Appointment not found" });
      }

      const appointment = appointmentResult.rows[0];

      if (appointment.status !== "BOOKED") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Only booked appointments can be cancelled"
        });
      }

      /* ===== GRACE PERIOD CHECK ===== */
      const now = new Date();
      const slotStart = new Date(appointment.start_time);
      const diffInHours = (slotStart - now) / (1000 * 60 * 60);

      if (diffInHours < 2) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Cancellation not allowed within 2 hours of appointment"
        });
      }

      /* ===== CANCEL ===== */
      await client.query(
        `
        UPDATE appointments
        SET status = 'CANCELLED',
            cancelled_at = NOW()
        WHERE id = $1
        `,
        [appointment_id]
      );

      await client.query(
        `
        UPDATE availability_slots
        SET is_booked = false
        WHERE id = $1
        `,
        [appointment.slot_id]
      );

      await client.query(
        `
        INSERT INTO appointment_history
        (appointment_id, action, performed_by)
        VALUES ($1, 'CANCELLED', $2)
        `,
        [appointment_id, client_id]
      );

      /* ===== AUTO ASSIGN FROM WAITLIST ===== */
      const waitlistResult = await client.query(
        `
        SELECT * FROM waitlist
        WHERE slot_id = $1
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [appointment.slot_id]
      );

      if (waitlistResult.rows.length > 0) {

        const nextClient = waitlistResult.rows[0];

        await client.query(
          `
          UPDATE availability_slots
          SET is_booked = true
          WHERE id = $1
          `,
          [appointment.slot_id]
        );

        const newAppointment = await client.query(
          `
          INSERT INTO appointments (slot_id, client_id, status)
          VALUES ($1, $2, 'BOOKED')
          RETURNING *
          `,
          [appointment.slot_id, nextClient.client_id]
        );

        await client.query(
          `
          INSERT INTO appointment_history
          (appointment_id, action, performed_by)
          VALUES ($1, 'AUTO_ASSIGNED', $2)
          `,
          [newAppointment.rows[0].id, nextClient.client_id]
        );

        await client.query(
          `
          DELETE FROM waitlist
          WHERE id = $1
          `,
          [nextClient.id]
        );
      }

      await client.query("COMMIT");

      return res.json({
        message: "Appointment cancelled successfully"
      });

    } catch (err) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

/* =========================================================
   CLIENT RESCHEDULE APPOINTMENT
========================================================= */
router.post(
  "/reschedule",
  verifyToken,
  authorizeRole(["CLIENT"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { appointment_id, new_slot_id } = req.body;
      const client_id = req.user.id;

      await client.query("BEGIN");

      const appointmentResult = await client.query(
        `
        SELECT * FROM appointments
        WHERE id = $1
        AND deleted_at IS NULL
        FOR UPDATE
        `,
        [appointment_id]
      );

      if (appointmentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Appointment not found" });
      }

      const appointment = appointmentResult.rows[0];

      if (appointment.status !== "BOOKED") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Only booked appointments can be rescheduled"
        });
      }

      const slotResult = await client.query(
        `
        SELECT * FROM availability_slots
        WHERE id = $1
        AND deleted_at IS NULL
        FOR UPDATE
        `,
        [new_slot_id]
      );

      if (slotResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "New slot not found" });
      }

      const newSlot = slotResult.rows[0];

      if (newSlot.is_booked) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "New slot already booked"
        });
      }

      await client.query(
        `UPDATE availability_slots SET is_booked = false WHERE id = $1`,
        [appointment.slot_id]
      );

      await client.query(
        `UPDATE availability_slots SET is_booked = true WHERE id = $1`,
        [new_slot_id]
      );

      await client.query(
        `UPDATE appointments SET slot_id = $1 WHERE id = $2`,
        [new_slot_id, appointment_id]
      );

      await client.query(
        `
        INSERT INTO appointment_history
        (appointment_id, action, performed_by)
        VALUES ($1, 'RESCHEDULED', $2)
        `,
        [appointment_id, client_id]
      );

      await client.query("COMMIT");

      return res.json({
        message: "Appointment rescheduled successfully"
      });

    } catch (err) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

module.exports = router;

// server.js
require("dotenv").config();

const express    = require("express");
const path       = require("path");
const axios      = require("axios");
const session    = require("express-session");
const pool       = require("./db");
const bcrypt     = require("bcrypt");

const verifyToken     = require("./middleware/authMiddleware");
const authorizeRole   = require("./middleware/roleMiddleware");
const flashMiddleware = require("./middleware/flash");

const {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAllRead
} = require("./helpers/notificationHelper");

const app = express();

// ── VIEW ENGINE ──────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── BODY PARSERS ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ── SESSION ──────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || "yourSecretKey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// ── FLASH MIDDLEWARE ─────────────────────────────────────
app.use(flashMiddleware);

// ── NOTIFICATION MIDDLEWARE ──────────────────────────────
app.use(async (req, res, next) => {
  res.locals.unreadCount   = 0;
  res.locals.notifications = [];

  if (req.session && req.session.userId) {
    try {
      res.locals.unreadCount   = await getUnreadCount(req.session.userId);
      res.locals.notifications = await getUserNotifications(req.session.userId);
    } catch (err) {
      console.error("Notification middleware error:", err.message);
    }
  }
  next();
});

// ── SESSION DEBUG ────────────────────────────────────────
app.get("/session-debug", (req, res) => {
  res.json({ sessionID: req.sessionID, sessionData: req.session });
});

// ── API ROUTES ───────────────────────────────────────────
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/providers",    require("./routes/providers"));
app.use("/api/availability", require("./routes/availability"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/admin",        require("./routes/admin"));
app.use("/api/provider",     require("./routes/provider"));

// ════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
  try {
    const response = await axios.post(
      "http://localhost:5000/api/auth/login",
      { email: req.body.email, password: req.body.password }
    );

    const token   = response.data.token;
    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    req.session.token  = token;
    req.session.role   = decoded.role;
    req.session.userId = decoded.id;

    // Notify login
    await createNotification(
      decoded.id,
      "Login Successful",
      `Welcome back! You logged in as ${decoded.role}.`,
      "SUCCESS"
    );

    req.flash("success", "Login successful! Welcome back.");

    if (decoded.role === "ADMIN")    return res.redirect("/admin-dashboard");
    if (decoded.role === "PROVIDER") {
      const result = await pool.query(
        "SELECT deleted_at FROM providers WHERE user_id = $1",
        [decoded.id]
      );

      if (result.rows.length > 0 && result.rows[0].deleted_at) {
        req.session.destroy(() => {});
        req.flash("error", "Account disabled. Contact admin.");
        return res.redirect("/login");
      }

      return res.redirect("/provider-dashboard");
    }
    if (decoded.role === "CLIENT") return res.redirect("/booking");

    return res.redirect("/");

  } catch (err) {
    req.flash("error", "Invalid email or password. Please try again.");
    return res.redirect("/login");
  }
});

app.get("/register", (req, res) => res.render("register"));

app.post("/register", async (req, res) => {
  try {
    await axios.post("http://localhost:5000/api/auth/register", {
      name:           req.body.name,
      email:          req.body.email,
      password:       req.body.password,
      role:           req.body.role,
      specialization: req.body.specialization
    });

    const newUser = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [req.body.email]
    );

    if (newUser.rows.length > 0) {
      await createNotification(
        newUser.rows[0].id,
        "Welcome!",
        `Hi ${req.body.name}, your account was created successfully.`,
        "SUCCESS"
      );
    }

    req.flash("success", "Account created successfully! Please login.");
    return res.redirect("/login");

  } catch (err) {
    req.flash("error", "Registration failed. Email may already exist.");
    return res.redirect("/register");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ════════════════════════════════════════════════════════
//  NOTIFICATION ROUTES
// ════════════════════════════════════════════════════════

app.get("/notifications", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const notifications = await getUserNotifications(req.session.userId);
    await markAllRead(req.session.userId);
    res.render("notifications", { notifications });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading notifications.");
    res.redirect("/");
  }
});

app.post("/notifications/mark-read", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    await markAllRead(req.session.userId);
    const redirectTo = req.headers.referer || "/";
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ════════════════════════════════════════════════════════
//  CLIENT ROUTES
// ════════════════════════════════════════════════════════

// ── BOOKING CALENDAR ─────────────────────────────────────
app.get("/booking", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT TO_CHAR(start_time, 'YYYY-MM-DD') AS available_date
      FROM availability_slots
      WHERE start_time::date >= CURRENT_DATE
      AND deleted_at IS NULL
      ORDER BY available_date ASC
    `);

    res.render("booking-calendar", { dates: result.rows });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading booking page.");
    res.redirect("/");
  }
});

// ── BOOKING SLOTS BY DATE ────────────────────────────────
app.get("/booking/:date", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  try {
    const selectedDate     = req.params.date;
    const selectedProvider = req.query.provider_id || null;

    const doctorsResult = await pool.query(`
      SELECT DISTINCT p.id, u.email, p.specialization
      FROM availability_slots s
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE DATE(s.start_time) = $1
      AND s.deleted_at IS NULL
      ORDER BY u.email
    `, [selectedDate]);

    let slots = [];

    if (selectedProvider) {
      const slotsResult = await pool.query(`
        SELECT s.id AS slot_id,
               s.start_time,
               s.end_time,
               s.is_booked,
               a.client_id AS booked_by
        FROM availability_slots s
        LEFT JOIN appointments a
          ON s.id = a.slot_id AND a.status = 'BOOKED'
        WHERE DATE(s.start_time) = $1
        AND s.provider_id = $2
        AND s.deleted_at IS NULL
        ORDER BY s.start_time
      `, [selectedDate, selectedProvider]);

      slots = slotsResult.rows;
    }

    res.render("booking", {
      doctors:          doctorsResult.rows,
      slots,
      selectedDate,
      selectedProvider,
      userId:           req.session.userId
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading slots.");
    res.redirect("/booking");
  }
});

// ── BOOK SLOT ────────────────────────────────────────────
app.post("/book-slot", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  try {
    const response = await axios.post(
      "http://localhost:5000/api/appointments/book",
      { slot_id: req.body.slot_id },
      { headers: { Authorization: `Bearer ${req.session.token}` } }
    );

    // Get slot + provider info
    const slotInfo = await pool.query(`
      SELECT s.start_time, s.end_time,
             u.name AS provider_name,
             u.id   AS provider_user_id
      FROM availability_slots s
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.id = $1
    `, [req.body.slot_id]);

    if (slotInfo.rows.length > 0) {
      const slot      = slotInfo.rows[0];
      const startTime = new Date(slot.start_time).toLocaleString();
      const endTime   = new Date(slot.end_time).toLocaleString();

      // Notify client
      await createNotification(
        req.session.userId,
        "Appointment Booked!",
        `Your appointment with Dr. ${slot.provider_name} is confirmed from ${startTime} to ${endTime}.`,
        "SUCCESS"
      );

      // Notify provider
      await createNotification(
        slot.provider_user_id,
        "New Appointment Booked",
        `A new appointment has been booked for ${startTime} to ${endTime}.`,
        "INFO"
      );

      // Notify admins
      const admins = await pool.query(
        `SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`
      );
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          "New Appointment",
          `A new appointment was booked with Dr. ${slot.provider_name} at ${startTime}.`,
          "INFO"
        );
      }
    }

    req.flash("success", response.data.message || "Appointment booked successfully!");
    return res.redirect("/booking");

  } catch (err) {
    const errorMessage = err.response?.data?.message || "Booking failed.";

    if (errorMessage.toLowerCase().includes("waitlist")) {
      await createNotification(
        req.session.userId,
        "Added to Waitlist",
        "The slot is fully booked. You have been added to the waitlist.",
        "WARNING"
      );
      req.flash("warning", "Slot is fully booked. You have been added to the waitlist.");
    } else {
      await createNotification(
        req.session.userId,
        "Booking Failed",
        `Your booking attempt failed. Reason: ${errorMessage}`,
        "DANGER"
      );
      req.flash("error", errorMessage);
    }

    return res.redirect("/booking");
  }
});

// ── MY APPOINTMENTS ──────────────────────────────────────
app.get("/my-appointments", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  try {
    const result = await pool.query(`
      SELECT a.id, a.status, s.start_time, s.end_time,
             u.email AS provider_email
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.client_id = $1
      AND a.deleted_at IS NULL
      ORDER BY
        CASE
          WHEN a.status = 'BOOKED' AND s.start_time > NOW() THEN 1
          WHEN a.status = 'BOOKED' AND s.start_time <= NOW() THEN 2
          WHEN a.status = 'CANCELLED' THEN 3
        END,
        s.start_time ASC
    `, [req.session.userId]);

    res.render("my-appointments", { appointments: result.rows });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading appointments.");
    res.redirect("/booking");
  }
});

// ── CANCEL APPOINTMENT ───────────────────────────────────
app.post("/cancel-appointment", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  const client = await pool.connect();

  try {
    const appointmentId = req.body.appointment_id;
    await client.query("BEGIN");

    const apptResult = await client.query(`
      SELECT a.slot_id,
             s.start_time, s.end_time,
             u.name AS provider_name,
             u.id   AS provider_user_id
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.id = $1
    `, [appointmentId]);

    if (apptResult.rows.length === 0) throw new Error("Appointment not found");

    const appt      = apptResult.rows[0];
    const slotId    = appt.slot_id;
    const startTime = new Date(appt.start_time).toLocaleString();
    const endTime   = new Date(appt.end_time).toLocaleString();

    // Cancel appointment
    await client.query(
      `UPDATE appointments SET status = 'CANCELLED' WHERE id = $1`,
      [appointmentId]
    );

    // Notify client
    await createNotification(
      req.session.userId,
      "Appointment Cancelled",
      `Your appointment with Dr. ${appt.provider_name} from ${startTime} to ${endTime} has been cancelled.`,
      "WARNING"
    );

    // Notify provider
    await createNotification(
      appt.provider_user_id,
      "Appointment Cancelled",
      `An appointment from ${startTime} to ${endTime} was cancelled by the client.`,
      "WARNING"
    );

    // Notify admins
    const admins = await client.query(
      `SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`
    );
    for (const admin of admins.rows) {
      await createNotification(
        admin.id,
        "Appointment Cancelled",
        `An appointment with Dr. ${appt.provider_name} at ${startTime} was cancelled.`,
        "WARNING"
      );
    }

    // Check waitlist
    const waitlistResult = await client.query(`
      SELECT w.*, u.id AS waitlist_user_id, u.name AS waitlist_user_name
      FROM waitlist w
      JOIN users u ON w.client_id = u.id
      WHERE w.slot_id = $1
      ORDER BY w.created_at ASC LIMIT 1
    `, [slotId]);

    if (waitlistResult.rows.length > 0) {
      const nextUser = waitlistResult.rows[0];

      await client.query(
        `INSERT INTO appointments (client_id, slot_id, status) VALUES ($1, $2, 'BOOKED')`,
        [nextUser.client_id, slotId]
      );

      await client.query(
        `DELETE FROM waitlist WHERE id = $1`,
        [nextUser.id]
      );

      await client.query(
        `UPDATE availability_slots SET is_booked = true WHERE id = $1`,
        [slotId]
      );

      // Notify promoted waitlist user
      await createNotification(
        nextUser.waitlist_user_id,
        "🎉 Slot Available - You're Booked!",
        `Great news! A slot with Dr. ${appt.provider_name} from ${startTime} to ${endTime} has been automatically booked for you from the waitlist.`,
        "SUCCESS"
      );

      // Notify provider
      await createNotification(
        appt.provider_user_id,
        "Waitlist Booking Confirmed",
        `The cancelled slot from ${startTime} to ${endTime} has been assigned to the next person on the waitlist.`,
        "INFO"
      );

    } else {
      await client.query(
        `UPDATE availability_slots SET is_booked = false WHERE id = $1`,
        [slotId]
      );
    }

    await client.query("COMMIT");

    req.flash("success", "Appointment cancelled successfully.");
    return res.redirect("/my-appointments");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    await createNotification(
      req.session.userId,
      "Cancellation Failed",
      "Your appointment cancellation could not be processed. Please try again.",
      "DANGER"
    );

    req.flash("error", "Cancellation failed. Please try again.");
    return res.redirect("/my-appointments");

  } finally {
    client.release();
  }
});

// ── RESCHEDULE PAGE ──────────────────────────────────────
app.get("/reschedule/:appointmentId", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  try {
    const appointmentId = req.params.appointmentId;

    const slots = await pool.query(`
      SELECT s.id AS slot_id, s.start_time, s.end_time,
             u.email AS provider_email
      FROM availability_slots s
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.is_booked = false
      AND s.deleted_at IS NULL
      AND s.start_time > NOW()
      ORDER BY s.start_time
    `);

    res.render("reschedule", { appointmentId, slots: slots.rows });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading reschedule page.");
    res.redirect("/my-appointments");
  }
});

// ── SUBMIT RESCHEDULE ────────────────────────────────────
app.post("/submit-reschedule", async (req, res) => {
  if (!req.session.role || req.session.role !== "CLIENT") {
    return res.redirect("/");
  }

  try {
    // Get old appointment info
    const oldAppt = await pool.query(`
      SELECT a.slot_id,
             s.start_time AS old_start,
             u.name AS provider_name,
             u.id AS provider_user_id
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.id = $1
    `, [req.body.appointment_id]);

    // Get new slot info
    const newSlot = await pool.query(`
      SELECT s.start_time AS new_start,
             s.end_time AS new_end,
             u.name AS provider_name,
             u.id AS provider_user_id
      FROM availability_slots s
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.id = $1
    `, [req.body.new_slot_id]);

    await axios.post(
      "http://localhost:5000/api/appointments/reschedule",
      {
        appointment_id: req.body.appointment_id,
        new_slot_id:    req.body.new_slot_id
      },
      { headers: { Authorization: `Bearer ${req.session.token}` } }
    );

    if (oldAppt.rows.length > 0 && newSlot.rows.length > 0) {
      const old  = oldAppt.rows[0];
      const newS = newSlot.rows[0];

      const oldStart = new Date(old.old_start).toLocaleString();
      const newStart = new Date(newS.new_start).toLocaleString();
      const newEnd   = new Date(newS.new_end).toLocaleString();

      // Notify client
      await createNotification(
        req.session.userId,
        "Appointment Rescheduled",
        `Your appointment with Dr. ${old.provider_name} has been rescheduled from ${oldStart} to ${newStart} - ${newEnd}.`,
        "SUCCESS"
      );

      // Notify old provider
      await createNotification(
        old.provider_user_id,
        "Appointment Rescheduled",
        `An appointment previously at ${oldStart} has been rescheduled to ${newStart} - ${newEnd}.`,
        "INFO"
      );

      // Notify new provider if different
      if (newS.provider_user_id !== old.provider_user_id) {
        await createNotification(
          newS.provider_user_id,
          "New Rescheduled Appointment",
          `An appointment has been rescheduled to your slot at ${newStart} - ${newEnd}.`,
          "INFO"
        );
      }

      // Notify admins
      const admins = await pool.query(
        `SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`
      );
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          "Appointment Rescheduled",
          `An appointment with Dr. ${old.provider_name} was rescheduled from ${oldStart} to ${newStart}.`,
          "INFO"
        );
      }
    }

    req.flash("success", "Appointment rescheduled successfully!");
    return res.redirect("/my-appointments");

  } catch (err) {
    console.error(err);

    await createNotification(
      req.session.userId,
      "Reschedule Failed",
      "Your reschedule request could not be completed. Please try again.",
      "DANGER"
    );

    req.flash("error", "Reschedule failed. Please try again.");
    return res.redirect("/my-appointments");
  }
});

// ════════════════════════════════════════════════════════
//  PROVIDER ROUTES
// ════════════════════════════════════════════════════════

app.get("/provider-dashboard", (req, res) => {
  if (!req.session.role || req.session.role !== "PROVIDER") {
    return res.redirect("/");
  }
  res.render("provider-dashboard");
});

app.get("/provider-availability", async (req, res) => {
  if (!req.session.role || req.session.role !== "PROVIDER") {
    return res.redirect("/");
  }

  try {
    const resources = await pool.query(`
      SELECT r.*,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM availability_slots s
          WHERE s.resource_id = r.id
          AND s.is_booked = true
          AND s.start_time <= NOW()
          AND s.end_time >= NOW()
          AND s.deleted_at IS NULL
        ) THEN false
        ELSE true
      END AS available_now
      FROM resources r
      WHERE r.deleted_at IS NULL
    `);

    res.render("provider-availability", { resources: resources.rows });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading availability page.");
    res.redirect("/provider-dashboard");
  }
});

app.get("/provider-working-hours", async (req, res) => {
  if (!req.session.role || req.session.role !== "PROVIDER") {
    return res.redirect("/");
  }

  try {
    const providerResult = await pool.query(
      "SELECT id FROM providers WHERE user_id = $1",
      [req.session.userId]
    );

    if (providerResult.rows.length === 0) {
      req.flash("error", "Provider not found.");
      return res.redirect("/provider-dashboard");
    }

    const provider_id = providerResult.rows[0].id;

    const resources = await pool.query(
      "SELECT * FROM resources WHERE deleted_at IS NULL"
    );

    const workingHours = await pool.query(`
      SELECT w.*, r.name AS resource_name
      FROM provider_working_hours w
      JOIN resources r ON w.resource_id = r.id
      WHERE w.provider_id = $1
      ORDER BY w.created_at DESC
    `, [provider_id]);

    res.render("provider-working-hours", {
      resources:    resources.rows,
      workingHours: workingHours.rows
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading working hours page.");
    res.redirect("/provider-dashboard");
  }
});

app.post("/create-working-hours", async (req, res) => {
  if (!req.session.role || req.session.role !== "PROVIDER") {
    return res.redirect("/");
  }

  const client = await pool.connect();

  try {
    const {
      start_date,
      end_date,
      daily_start,
      daily_end,
      slot_duration,
      resource_id
    } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(start_date) < today) {
      req.flash("error", "Cannot generate working hours for past dates.");

      await createNotification(
        req.session.userId,
        "Availability Creation Failed",
        "You attempted to create availability for past dates. Only future dates are allowed.",
        "DANGER"
      );

      return res.redirect("/provider-working-hours");
    }

    const providerResult = await client.query(
      "SELECT id FROM providers WHERE user_id = $1",
      [req.session.userId]
    );

    if (providerResult.rows.length === 0) {
      req.flash("error", "Provider not found.");
      return res.redirect("/provider-dashboard");
    }

    const provider_id = providerResult.rows[0].id;

    const resourceInfo = await client.query(
      `SELECT name FROM resources WHERE id = $1`,
      [resource_id]
    );
    const resourceName = resourceInfo.rows.length > 0
      ? resourceInfo.rows[0].name
      : "Unknown Resource";

    // Check resource conflict
    const resourceConflict = await client.query(`
      SELECT id FROM availability_slots
      WHERE resource_id = $1
      AND deleted_at IS NULL
      AND (start_time::date BETWEEN $2 AND $3)
    `, [resource_id, start_date, end_date]);

    if (resourceConflict.rows.length > 0) {
      await client.query(`
        INSERT INTO resource_waitlist
        (provider_id, resource_id, requested_start_time, requested_end_time, status)
        VALUES ($1, $2, $3, $4, 'WAITING')
      `, [
        provider_id,
        resource_id,
        `${start_date} ${daily_start}`,
        `${end_date} ${daily_end}`
      ]);

      req.flash("warning", `Resource "${resourceName}" is not available. You have been added to the waitlist.`);

      await createNotification(
        req.session.userId,
        "Added to Resource Waitlist",
        `The resource "${resourceName}" is not available from ${start_date} to ${end_date}. Added to waitlist.`,
        "WARNING"
      );

      const admins = await pool.query(
        `SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`
      );
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          "Resource Waitlist Request",
          `A provider has been added to the waitlist for resource "${resourceName}" from ${start_date} to ${end_date}.`,
          "INFO"
        );
      }

      return res.redirect("/provider-working-hours");
    }

    // No conflict → create slots
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO provider_working_hours
      (provider_id, resource_id, start_date, end_date, daily_start, daily_end, slot_duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [provider_id, resource_id, start_date, end_date, daily_start, daily_end, slot_duration]);

    let currentDate       = new Date(start_date);
    const finalDate       = new Date(end_date);
    let totalSlotsCreated = 0;

    while (currentDate <= finalDate) {
      const year       = currentDate.getFullYear();
      const month      = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day        = String(currentDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      let slotStart          = new Date(`${dateString}T${daily_start}`);
      const slotEndBoundary  = new Date(`${dateString}T${daily_end}`);

      while (slotStart < slotEndBoundary) {
        const slotEnd = new Date(slotStart.getTime() + slot_duration * 60000);

        if (slotEnd > slotEndBoundary) break;

        const providerOverlap = await client.query(`
          SELECT id FROM availability_slots
          WHERE provider_id = $1
          AND deleted_at IS NULL
          AND ($2 < end_time AND $3 > start_time)
        `, [provider_id, slotStart, slotEnd]);

        if (providerOverlap.rows.length > 0) {
          await client.query("ROLLBACK");

          req.flash("error", "You already have availability during this time period.");

          await createNotification(
            req.session.userId,
            "Availability Overlap Detected",
            `Could not create working hours from ${start_date} to ${end_date} because of overlapping slots.`,
            "DANGER"
          );

          return res.redirect("/provider-working-hours");
        }

        await client.query(`
          INSERT INTO availability_slots
          (provider_id, resource_id, start_time, end_time, is_booked)
          VALUES ($1, $2, $3, $4, false)
        `, [provider_id, resource_id, slotStart, slotEnd]);

        totalSlotsCreated++;
        slotStart = slotEnd;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await client.query("COMMIT");

    req.flash("success", `Working hours generated successfully! ${totalSlotsCreated} slots created.`);

    await createNotification(
      req.session.userId,
      "Availability Created",
      `Your working hours from ${start_date} to ${end_date} with resource "${resourceName}" have been set. ${totalSlotsCreated} slots created.`,
      "SUCCESS"
    );

    const admins = await pool.query(
      `SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`
    );
    for (const admin of admins.rows) {
      await createNotification(
        admin.id,
        "Provider Set Availability",
        `A provider set availability from ${start_date} to ${end_date} with resource "${resourceName}". ${totalSlotsCreated} slots created.`,
        "INFO"
      );
    }

    return res.redirect("/provider-working-hours");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    await createNotification(
      req.session.userId,
      "Working Hours Creation Failed",
      "An error occurred while creating your working hours. Please try again.",
      "DANGER"
    );

    req.flash("error", "Error generating slots. Please try again.");
    return res.redirect("/provider-working-hours");

  } finally {
    client.release();
  }
});

app.get("/provider-analytics", async (req, res) => {
  if (!req.session.role || req.session.role !== "PROVIDER") {
    return res.redirect("/");
  }

  try {
    const user_id      = req.session.userId;
    const selectedDate = req.query.date || null;

    const providerResult = await pool.query(
      `SELECT id FROM providers WHERE user_id = $1 AND deleted_at IS NULL`,
      [user_id]
    );

    if (providerResult.rows.length === 0) {
      req.flash("error", "Provider not found.");
      return res.redirect("/provider-dashboard");
    }

    const provider_id = providerResult.rows[0].id;

    const totalSlots = await pool.query(
      `SELECT COUNT(*) FROM availability_slots
       WHERE provider_id = $1 AND deleted_at IS NULL`,
      [provider_id]
    );

    const totalBooked = await pool.query(
      `SELECT COUNT(*) FROM appointments a
       JOIN availability_slots s ON a.slot_id = s.id
       WHERE s.provider_id = $1 AND a.status = 'BOOKED' AND a.deleted_at IS NULL`,
      [provider_id]
    );

    const totalCancelled = await pool.query(
      `SELECT COUNT(*) FROM appointments a
       JOIN availability_slots s ON a.slot_id = s.id
       WHERE s.provider_id = $1 AND a.status = 'CANCELLED'`,
      [provider_id]
    );

    const slots     = parseInt(totalSlots.rows[0].count);
    const booked    = parseInt(totalBooked.rows[0].count);
    const cancelled = parseInt(totalCancelled.rows[0].count);
    const utilization = slots > 0 ? (booked / slots).toFixed(2) : 0;

    const dateResult = await pool.query(`
      SELECT DISTINCT DATE(s.start_time) AS appointment_date
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      WHERE s.provider_id = $1
      ORDER BY appointment_date DESC
    `, [provider_id]);

    let appointments = [];

    if (selectedDate) {
      const appointmentResult = await pool.query(`
        SELECT u.email AS client_email,
               s.start_time, s.end_time,
               a.status, a.created_at
        FROM appointments a
        JOIN availability_slots s ON a.slot_id = s.id
        JOIN users u ON a.client_id = u.id
        WHERE s.provider_id = $1
        AND a.status = 'BOOKED'
        AND DATE(s.start_time) = $2
        ORDER BY s.start_time ASC
      `, [provider_id, selectedDate]);

      appointments = appointmentResult.rows;
    }

    res.render("provider-analytics", {
      totalSlots:    slots,
      totalBooked:   booked,
      totalCancelled: cancelled,
      utilization,
      dates:         dateResult.rows,
      appointments,
      selectedDate
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading provider analytics.");
    res.redirect("/provider-dashboard");
  }
});

// ════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════════════════════

app.get("/admin-dashboard", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    const waitlistResult = await pool.query(`
      SELECT w.id,
             u.name AS provider_name,
             r.name AS resource_name,
             w.requested_start_time,
             w.requested_end_time,
             w.status
      FROM resource_waitlist w
      JOIN providers p ON w.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN resources r ON w.resource_id = r.id
      WHERE w.status = 'WAITING'
      AND w.requested_start_time >= NOW()
      ORDER BY w.requested_start_time ASC
    `);

    res.render("admin-dashboard", { waitlist: waitlistResult.rows });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading admin dashboard.");
    res.redirect("/");
  }
});

app.get("/admin-analytics", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    const totalUsers        = await pool.query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`);
    const totalProviders    = await pool.query(`SELECT COUNT(*) FROM providers WHERE deleted_at IS NULL`);
    const totalResources    = await pool.query(`SELECT COUNT(*) FROM resources WHERE deleted_at IS NULL`);
    const totalAppointments = await pool.query(`SELECT COUNT(*) FROM appointments WHERE deleted_at IS NULL`);
    const totalCancelled    = await pool.query(`SELECT COUNT(*) FROM appointments WHERE status = 'CANCELLED'`);

    const total       = parseInt(totalAppointments.rows[0].count);
    const cancelled   = parseInt(totalCancelled.rows[0].count);
    const bookingRate = total > 0 ? (total - cancelled) / total : 0;

    const users = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    const providers = await pool.query(`
      SELECT p.id, u.name, u.email, p.specialization
      FROM providers p
      JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL
    `);

    const resources = await pool.query(
      `SELECT id, name FROM resources WHERE deleted_at IS NULL`
    );

    const appointments = await pool.query(`
      SELECT a.id, u.email AS client_email,
             s.start_time, s.end_time, a.status
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      JOIN users u ON a.client_id = u.id
      ORDER BY s.start_time DESC
    `);

    res.render("admin-analytics", {
      totalUsers:        totalUsers.rows[0].count,
      totalProviders:    totalProviders.rows[0].count,
      totalResources:    totalResources.rows[0].count,
      totalAppointments: total,
      totalCancelled:    cancelled,
      bookingRate,
      users:             users.rows,
      providers:         providers.rows,
      resources:         resources.rows,
      appointments:      appointments.rows
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading analytics.");
    res.redirect("/admin-dashboard");
  }
});

// ── ADMIN PROVIDERS ──────────────────────────────────────

app.get("/admin/providers", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    const result = await pool.query(`
      SELECT p.id, u.name, u.email, p.specialization, p.deleted_at
      FROM providers p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.name ASC
    `);

    res.render("admin-providers", { providers: result.rows });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading providers.");
    res.redirect("/admin-dashboard");
  }
});

app.post("/admin/providers", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  const { name, email, password, specialization } = req.body;

  try {
    if (!name || !email || !password || !specialization) {
      req.flash("error", "All fields are required.");
      return res.redirect("/admin/providers");
    }

    const existingUser = await pool.query(
      `SELECT id FROM users WHERE email = $1`, [email]
    );

    if (existingUser.rows.length > 0) {
      req.flash("error", "Email already exists. Please use a different email.");
      return res.redirect("/admin/providers");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'PROVIDER') RETURNING id`,
      [name, email, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    await pool.query(
      `INSERT INTO providers (user_id, specialization) VALUES ($1, $2)`,
      [userId, specialization]
    );

    await createNotification(
      userId,
      "Account Created",
      `Welcome Dr. ${name}! Your provider account has been created by the admin. Specialization: ${specialization}.`,
      "SUCCESS"
    );

    await createNotification(
      req.session.userId,
      "Provider Created",
      `New provider Dr. ${name} (${email}) with specialization "${specialization}" has been added.`,
      "SUCCESS"
    );

    req.flash("success", `Dr. ${name} created successfully!`);
    return res.redirect("/admin/providers");

  } catch (err) {
    console.error("Create Provider Error:", err);

    await createNotification(
      req.session.userId,
      "Provider Creation Failed",
      `Failed to create provider account for ${email}. Please try again.`,
      "DANGER"
    );

    req.flash("error", "Failed to create doctor. Please try again.");
    return res.redirect("/admin/providers");
  }
});

app.post("/admin/update-provider/:id", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  const providerId = req.params.id;
  const { name, email, password, specialization } = req.body;

  try {
    const providerResult = await pool.query(
      `SELECT user_id FROM providers WHERE id = $1`, [providerId]
    );

    if (providerResult.rows.length === 0) {
      req.flash("error", "Provider not found.");
      return res.redirect("/admin/providers");
    }

    const userId = providerResult.rows[0].user_id;

    const emailCheck = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email, userId]
    );

    if (emailCheck.rows.length > 0) {
      req.flash("error", "Email already used by another user.");
      return res.redirect("/admin/providers");
    }

    await pool.query(
      `UPDATE users SET name = $1, email = $2 WHERE id = $3`,
      [name, email, userId]
    );

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET password_hash = $1 WHERE id = $2`,
        [hashedPassword, userId]
      );
    }

    await pool.query(
      `UPDATE providers SET specialization = $1 WHERE id = $2`,
      [specialization, providerId]
    );

    await createNotification(
      userId,
      "Account Updated",
      `Your provider account has been updated by the admin. Name: ${name}, Specialization: ${specialization}.`,
      "INFO"
    );

    await createNotification(
      req.session.userId,
      "Provider Updated",
      `Provider Dr. ${name} (${email}) has been updated successfully.`,
      "SUCCESS"
    );

    req.flash("success", `Dr. ${name} updated successfully!`);
    return res.redirect("/admin/providers");

  } catch (err) {
    console.error("Update Provider Error:", err);

    await createNotification(
      req.session.userId,
      "Provider Update Failed",
      `Failed to update provider ID ${providerId}. Please try again.`,
      "DANGER"
    );

    req.flash("error", "Update failed. Please try again.");
    return res.redirect("/admin/providers");
  }
});

app.post("/admin/disable-provider/:id", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    const providerInfo = await pool.query(`
      SELECT p.user_id, u.name, u.email
      FROM providers p JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    await pool.query(
      `UPDATE providers SET deleted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    if (providerInfo.rows.length > 0) {
      const { user_id, name, email } = providerInfo.rows[0];

      await createNotification(
        user_id,
        "Account Disabled",
        "Your account has been disabled by the admin. Please contact support.",
        "DANGER"
      );

      await createNotification(
        req.session.userId,
        "Provider Disabled",
        `Dr. ${name} (${email}) has been disabled.`,
        "WARNING"
      );

      req.flash("warning", `Dr. ${name} has been disabled.`);
    }

    return res.redirect("/admin/providers");

  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to disable provider.");
    return res.redirect("/admin/providers");
  }
});

app.post("/admin/enable-provider/:id", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    const providerInfo = await pool.query(`
      SELECT p.user_id, u.name, u.email
      FROM providers p JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    await pool.query(
      `UPDATE providers SET deleted_at = NULL WHERE id = $1`,
      [req.params.id]
    );

    if (providerInfo.rows.length > 0) {
      const { user_id, name, email } = providerInfo.rows[0];

      await createNotification(
        user_id,
        "Account Re-enabled",
        "Your account has been re-enabled by the admin. You can now log in.",
        "SUCCESS"
      );

      await createNotification(
        req.session.userId,
        "Provider Enabled",
        `Dr. ${name} (${email}) has been re-enabled successfully.`,
        "SUCCESS"
      );

      req.flash("success", `Dr. ${name} has been enabled successfully.`);
    }

    return res.redirect("/admin/providers");

  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to enable provider.");
    return res.redirect("/admin/providers");
  }
});

// ── ADMIN RESOURCES ──────────────────────────────────────

app.get("/admin/resources", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    const response = await axios.get(
      "http://localhost:5000/api/admin/resources",
      { headers: { Authorization: `Bearer ${req.session.token}` } }
    );

    res.render("admin-resources", { resources: response.data });

  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading resources.");
    res.redirect("/admin-dashboard");
  }
});

app.post("/admin/resources", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    await axios.post(
      "http://localhost:5000/api/admin/resources",
      { name: req.body.name, type: req.body.type },
      { headers: { Authorization: `Bearer ${req.session.token}` } }
    );

    await createNotification(
      req.session.userId,
      "Resource Created",
      `New resource "${req.body.name}" of type "${req.body.type}" has been added.`,
      "SUCCESS"
    );

    req.flash("success", `Resource "${req.body.name}" created successfully!`);
    return res.redirect("/admin/resources");

  } catch (err) {
    console.error(err);

    await createNotification(
      req.session.userId,
      "Resource Creation Failed",
      `Failed to create resource "${req.body.name}". Please try again.`,
      "DANGER"
    );

    req.flash("error", "Failed to create resource. Please try again.");
    return res.redirect("/admin/resources");
  }
});

app.post("/admin/update-resource/:id", async (req, res) => {
  if (!req.session.role || req.session.role !== "ADMIN") {
    return res.redirect("/");
  }

  try {
    await axios.put(
      `http://localhost:5000/api/admin/resources/${req.params.id}`,
      { name: req.body.name, type: req.body.type },
      { headers: { Authorization: `Bearer ${req.session.token}` } }
    );

    await createNotification(
      req.session.userId,
      "Resource Updated",
      `Resource "${req.body.name}" has been updated successfully.`,
      "SUCCESS"
    );

    req.flash("success", `Resource "${req.body.name}" updated successfully!`);
    return res.redirect("/admin/resources");

  } catch (err) {
    console.error(err);

    await createNotification(
      req.session.userId,
      "Resource Update Failed",
      `Failed to update resource ID ${req.params.id}. Please try again.`,
      "DANGER"
    );

    req.flash("error", "Failed to update resource. Please try again.");
    return res.redirect("/admin/resources");
  }
});

// ════════════════════════════════════════════════════════
//  SERVER START
// ════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
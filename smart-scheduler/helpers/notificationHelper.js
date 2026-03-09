// helpers/notificationHelper.js

const pool = require("../db");

async function createNotification(userId, title, message, type = "INFO") {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, message, type]
    );
  } catch (err) {
    console.error("❌ Notification creation failed:", err.message);
  }
}

async function getUserNotifications(userId) {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    console.error("❌ Get notifications failed:", err.message);
    return [];
  }
}

async function getUnreadCount(userId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (err) {
    console.error("❌ Get unread count failed:", err.message);
    return 0;
  }
}

async function markAllRead(userId) {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
  } catch (err) {
    console.error("❌ Mark all read failed:", err.message);
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAllRead
};
// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    pgm.sql(`
      INSERT INTO users (username, password, role)
      VALUES ('admin', '$2b$10$VDh34f1hIYDyHT8AX7uEGeAqLQskjSdZSXRGmCpAaVZFFVpNVAs3W', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `);
  },
  down: async (pgm) => {
    pgm.sql(`DELETE FROM users WHERE username = 'admin';`);
  }
};

// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    const bcrypt = require('bcryptjs');
    // Preferir hash pre-calculado si se proporciona
    const hashFromEnv = process.env.ADMIN_PASSWORD_HASH;
    let hashed = hashFromEnv;
    if (!hashed) {
      const plain = process.env.ADMIN_PASSWORD || 'admin';
      hashed = await bcrypt.hash(plain, 10);
    }
    await pgm.sql(`
      INSERT INTO users (username, password, role)
      VALUES ('admin', '${hashed}', 'admin')
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, updated_at = NOW();
    `);
  },
  down: async (pgm) => {
    // Revertir a contraseña 'admin' (hash predefinido del valor 'admin')
    await pgm.sql(`
      UPDATE users SET password = '$2b$10$VDh34f1hIYDyHT8AX7uEGeAqLQskjSdZSXRGmCpAaVZFFVpNVAs3W', updated_at = NOW()
      WHERE username = 'admin';
    `);
  }
};

// @ts-nocheck
// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    pgm.createTable('houses', {
      id: {
        type: 'varchar(10)', // Permite números y letras
        primaryKey: true,
      },
      owner: {
        type: 'varchar(100)',
        notNull: false,
      },
      created_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('now()'),
      },
      updated_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('now()'),
      },
    });
  },
  down: async (pgm) => {
    pgm.dropTable('houses');
  }
};

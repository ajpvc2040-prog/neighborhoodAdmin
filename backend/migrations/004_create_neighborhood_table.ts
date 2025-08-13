// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    pgm.createTable('neighborhood', {
      id: {
        type: 'serial',
        primaryKey: true,
      },
      name: {
        type: 'varchar(100)',
        notNull: true,
      },
      periodicity: {
        type: 'varchar(20)',
        notNull: true,
      },
      amount: {
        type: 'numeric(12,2)',
        notNull: true,
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
    pgm.dropTable('neighborhood');
  }
};

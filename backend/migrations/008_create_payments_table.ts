// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    pgm.createTable('payments', {
      id: 'id',
      user_id: {
        type: 'varchar(5)',
        notNull: true,
        references: 'neighbors',
        referencesConstraintName: 'payments_neighbor_fk',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: 'numeric(12,2)',
        notNull: true,
      },
      method: {
        type: 'varchar(30)',
        notNull: false,
      },
      reference: {
        type: 'varchar(120)',
        notNull: false,
      },
      paid_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('now()'),
      },
      note: {
        type: 'text',
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

    // amount > 0
    pgm.addConstraint('payments', 'payments_amount_positive_ck', {
      check: 'amount > 0',
    });

    // Índices
    pgm.createIndex('payments', ['user_id']);
    pgm.createIndex('payments', ['paid_at']);
  },
  down: async (pgm) => {
    pgm.dropTable('payments');
  }
};

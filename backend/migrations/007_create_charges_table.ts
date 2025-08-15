// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    pgm.createTable('charges', {
      id: 'id',
      user_id: {
        type: 'varchar(5)',
        notNull: true,
        references: 'neighbors',
        referencesConstraintName: 'charges_neighbor_fk',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      period: {
        type: 'date',
        notNull: true,
        // Periodo representa el primer día del mes cobrado
      },
      amount: {
        type: 'numeric(12,2)',
        notNull: true,
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
    pgm.addConstraint('charges', 'charges_amount_positive_ck', {
      check: 'amount > 0',
    });

    // period debe ser primer día del mes
    pgm.addConstraint('charges', 'charges_period_month_start_ck', {
      check: "date_trunc('month', period) = period",
    });

    // Un cobro por usuario por periodo
    pgm.addConstraint('charges', 'charges_user_period_uniq', {
      unique: ['user_id', 'period'],
    });

    // Índices útiles
    pgm.createIndex('charges', ['user_id']);
    pgm.createIndex('charges', ['period']);
  },
  down: async (pgm) => {
    pgm.dropTable('charges');
  }
};

// @ts-nocheck
module.exports = {
  up: async (pgm) => {
    pgm.createTable('neighbors', {
      user_id: {
        type: 'varchar(5)',
        primaryKey: true,
      },
      password: {
        type: 'varchar(100)',
        notNull: true,
      },
      name: {
        type: 'varchar(100)',
        notNull: true,
      },
      house_id: {
        type: 'varchar(10)',
        notNull: true,
        references: 'houses',
        referencesConstraintName: 'neighbors_house_fk',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      email: {
        type: 'varchar(120)',
        notNull: false,
        unique: true,
      },
      phone: {
        type: 'varchar(20)',
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

    // Restricción de formato del ID: 3 letras + 2 números (mayúsculas)
    pgm.addConstraint('neighbors', 'neighbors_user_id_format_ck', {
      check: "user_id ~ '^[A-Z]{3}[0-9]{2}$'",
    });

    // Índice por casa para consultas rápidas
    pgm.createIndex('neighbors', 'house_id');
  },
  down: async (pgm) => {
    pgm.dropTable('neighbors');
  }
};

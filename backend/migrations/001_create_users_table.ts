// @ts-nocheck
module.exports = {
	up: async (pgm) => {
		pgm.createTable('users', {
			id: {
				type: 'serial',
				primaryKey: true,
			},
			username: {
				type: 'varchar(50)',
				notNull: true,
				unique: true,
			},
			password: {
				type: 'varchar(100)',
				notNull: true,
			},
			role: {
				type: 'varchar(20)',
				notNull: true,
				default: 'user',
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
		pgm.dropTable('users');
	}
};

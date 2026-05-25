import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || process.env.POSTGRES_DB || 'Nutricoach',
  process.env.DB_USER || process.env.POSTGRES_USER || 'nutri_admin',
  process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'SuperSecurePassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    logging: false,
    define: {
      timestamps: false,
      freezeTableName: true
    }
  }
);

export default sequelize;
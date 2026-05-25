import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'diet_planner',
  process.env.DB_USER || 'diet_user',
  process.env.DB_PASSWORD || 'diet_password',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: false,
      freezeTableName: true
    }
  }
);

export default sequelize;
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  user_id: { 
    type: DataTypes.NUMERIC, 
    primaryKey: true 
  },
  name: { type: DataTypes.STRING(50), allowNull: false },
  password: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(50), allowNull: false }
}, {
  tableName: 'User'
});

export default User;
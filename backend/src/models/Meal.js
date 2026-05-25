import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Meal = sequelize.define('Meal', {
  meal_id: { 
    type: DataTypes.NUMERIC, 
    primaryKey: true 
  },
  name: { type: DataTypes.STRING(100), allowNull: false },
  calories: { type: DataTypes.NUMERIC, allowNull: false },
  protein: { type: DataTypes.NUMERIC, allowNull: false },
  fat: { type: DataTypes.NUMERIC, allowNull: false },
  carbs: { type: DataTypes.NUMERIC, allowNull: false },
  img: { type: DataTypes.STRING(100), allowNull: true },
  source: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'Meal'
});

export default Meal;
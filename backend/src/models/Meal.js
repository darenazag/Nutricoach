import { DataTypes } from 'sequelize'
import sequelize from '../database/config.js'

const Meal = sequelize.define('Meal', {
  meal_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  calories: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  protein: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  fat: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  carbs: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  img: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'Meal',
  timestamps: false,
})

export default Meal

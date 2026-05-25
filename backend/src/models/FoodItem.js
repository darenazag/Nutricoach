import { DataTypes } from 'sequelize'
import sequelize from '../database/config.js'

const FoodItem = sequelize.define('FoodItem', {
  food_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  protein: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  calories: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  carbs: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  fat: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'Food_item',
  timestamps: false,
})

export default FoodItem

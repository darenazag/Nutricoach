import { DataTypes } from 'sequelize'
import sequelize from '../database/config.js'

const MealFoodItem = sequelize.define('MealFoodItem', {
  Meal_meal_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'Meal', key: 'meal_id' },
  },
  Food_item_food_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'Food_item', key: 'food_id' },
  },
}, {
  tableName: 'Meal_Food_item',
  timestamps: false,
})

export default MealFoodItem

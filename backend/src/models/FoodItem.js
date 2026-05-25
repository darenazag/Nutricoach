import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FoodItem = sequelize.define('FoodItem', {
  food_id: { 
    type: DataTypes.NUMERIC, 
    primaryKey: true 
  },
  protein: { type: DataTypes.NUMERIC, allowNull: false },
  calories: { type: DataTypes.NUMERIC, allowNull: false },
  carbs: { type: DataTypes.NUMERIC, allowNull: false },
  fat: { type: DataTypes.NUMERIC, allowNull: false },
  source: { type: DataTypes.STRING, allowNull: false } // El nombre del alimento en tu SQL (ej: 'Pechuga de Pollo')
}, {
  tableName: 'Food_item'
});

export default FoodItem;
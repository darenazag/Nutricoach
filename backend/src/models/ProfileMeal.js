import { DataTypes } from 'sequelize'
import sequelize from '../database/config.js'

const ProfileMeal = sequelize.define('ProfileMeal', {
  Profile_user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'Profile', key: 'user_id' },
  },
  Meal_meal_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'Meal', key: 'meal_id' },
  },
}, {
  tableName: 'Profile_Meal',
  timestamps: false,
})

export default ProfileMeal

import User from './User.js'
import Profile from './Profile.js'
import Meal from './Meal.js'
import FoodItem from './FoodItem.js'
import MealFoodItem from './MealFoodItem.js'
import ProfileMeal from './ProfileMeal.js'

User.hasOne(Profile, { foreignKey: 'user_id' })
Profile.belongsTo(User, { foreignKey: 'user_id' })

Meal.belongsToMany(FoodItem, {
  through: MealFoodItem,
  foreignKey: 'Meal_meal_id',
  otherKey: 'Food_item_food_id',
})
FoodItem.belongsToMany(Meal, {
  through: MealFoodItem,
  foreignKey: 'Food_item_food_id',
  otherKey: 'Meal_meal_id',
})

Profile.belongsToMany(Meal, {
  through: ProfileMeal,
  foreignKey: 'Profile_user_id',
  otherKey: 'Meal_meal_id',
})
Meal.belongsToMany(Profile, {
  through: ProfileMeal,
  foreignKey: 'Meal_meal_id',
  otherKey: 'Profile_user_id',
})

export { User, Profile, Meal, FoodItem, MealFoodItem, ProfileMeal }

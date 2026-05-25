import sequelize from '../config/database.js';
import Profile from './Profile.js';
import User from './Users.js';
import Meal from './Meal.js';
import FoodItem from './FoodItem.js';

// Relación 1:1 estricta (Profile - User)
Profile.hasOne(User, { foreignKey: 'user_id' });
User.belongsTo(Profile, { foreignKey: 'user_id' });

// Relación Muchos a Muchos: Profile - Meal usando la tabla intermedia "Profile_Meal"
Profile.belongsToMany(Meal, { 
  through: 'Profile_Meal', 
  foreignKey: 'Profile_user_id', 
  otherKey: 'Meal_meal_id' 
});
Meal.belongsToMany(Profile, { 
  through: 'Profile_Meal', 
  foreignKey: 'Meal_meal_id', 
  otherKey: 'Profile_user_id' 
});

// Relación Muchos a Muchos: Meal - FoodItem usando la tabla intermedia "Meal_Food_item"
Meal.belongsToMany(FoodItem, { 
  through: 'Meal_Food_item', 
  foreignKey: 'Meal_meal_id', 
  otherKey: 'Food_item_food_id' 
});
FoodItem.belongsToMany(Meal, { 
  through: 'Meal_Food_item', 
  foreignKey: 'Food_item_food_id', 
  otherKey: 'Meal_meal_id' 
});

export {
  sequelize,
  Profile,
  User,
  Meal,
  FoodItem
};
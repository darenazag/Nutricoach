import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Profile = sequelize.define('Profile', {
  user_id: { 
    type: DataTypes.NUMERIC, 
    primaryKey: true 
  },
  weight: { type: DataTypes.NUMERIC, allowNull: false },
  age: { type: DataTypes.NUMERIC, allowNull: false },
  height: { type: DataTypes.NUMERIC, allowNull: false },
  gender: { type: DataTypes.CHAR(1), allowNull: false },
  activityFactor: { 
    type: DataTypes.CHAR(1), 
    allowNull: false,
    field: 'activityFactor'
  },
  objective: { 
    type: DataTypes.CHAR(1), 
    allowNull: false,
    field: 'objective'
  },
  basalMetabolicRate: { 
    type: DataTypes.NUMERIC, 
    allowNull: false,
    field: 'basalMetabolicRate'
  },
  totalDailyEnergyExpenditure: { 
    type: DataTypes.NUMERIC, 
    allowNull: false,
    field: 'totalDailyEnergyExpenditure'
  }
}, {
  tableName: 'Profile'
});

export default Profile;
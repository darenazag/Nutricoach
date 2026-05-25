import { DataTypes } from 'sequelize'
import sequelize from '../database/config.js'

const Profile = sequelize.define('Profile', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  weight: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  age: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  height: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  gender: {
    type: DataTypes.CHAR(1),
    allowNull: false,
  },
  activityFactor: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    field: 'activityFactor',
  },
  objective: {
    type: DataTypes.CHAR(1),
    allowNull: false,
  },
  basalMetabolicRate: {
    type: DataTypes.NUMERIC,
    allowNull: false,
    field: 'basalMetabolicRate',
  },
  totalDailyEnergyExpenditure: {
    type: DataTypes.NUMERIC,
    allowNull: false,
    field: 'totalDailyEnergyExpenditure',
  },
}, {
  tableName: 'Profile',
  timestamps: false,
})

export default Profile

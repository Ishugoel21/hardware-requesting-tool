import { DataTypes } from 'sequelize';

const StockAssigned = (sequelize) => {
  const StockAssigned = sequelize.define('stockAssigned', {
    accessory_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    emp_deptId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'departments',  // Refers to the Department model
        key: 'department_id',
      },
    },
    product_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'stocks',  // Refers to the Stock model
        key: 'product_id',
      },
    },
    emp_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'employees',  // Refers to the Employee model
        key: 'emp_id',
      },
    },
    DOA: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'working',
    },
  });

  return StockAssigned;
};

export default StockAssigned;

import { DataTypes } from 'sequelize';

const Stock = (sequelize) => {
  const Stock = sequelize.define(
    'Stock',
    {
      product_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Product name cannot be empty',
          },
        },
      },
      product_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        defaultValue: () => `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      },
      product_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: {
            msg: 'Product quantity must be an integer',
          },
          min: {
            args: [0],
            msg: 'Product quantity cannot be negative',
          },
        },
      },
      product_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Product type cannot be empty',
          },
        },
      },
      product_company: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: {
            args: /^[a-zA-Z0-9\s]+$/,
            msg: 'Product company must only contain alphanumeric characters and spaces',
          },
        },
      },
    },
    {
      timestamps: true, // Enables createdAt and updatedAt fields
      hooks: {
        beforeCreate: async (stock) => {
          // Additional business logic before creating a stock record, if needed
          console.log(`Creating stock record for product: ${stock.product_name}`);
        },
        beforeUpdate: async (stock) => {
          // Additional business logic before updating a stock record, if needed
          console.log(`Updating stock record for product: ${stock.product_name}`);
        },
      },
    }
  );

  return Stock;
};

export default Stock;

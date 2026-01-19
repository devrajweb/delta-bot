const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Question = sequelize.define(
  "Question",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Example: "Read Aloud", "Repeat Sentence"
    task_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Actual question text
    question_name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // Short explanation about question
    about_question: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Full description / instructions
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "question",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Question;

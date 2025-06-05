const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  body: { type: String, required: true },
  review: { type: String },
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');
const methodOverride = require('method-override');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// Create a new recipe
app.post('/recipes', async (req, res) => {
  try {
    const recipe = new Recipe(req.body);
    const saved = await recipe.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all recipes
app.get('/recipes', async (req, res) => {
  const recipes = await Recipe.find();
  res.json(recipes);
});

// Get a specific recipe
app.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a recipe
app.put('/recipes/:id', async (req, res) => {
  try {
    const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a recipe
app.delete('/recipes/:id', async (req, res) => {
  try {
    await Recipe.findByIdAndDelete(req.params.id);
    res.redirect('/');
    
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// View all recipes in a page
app.get('/', async (req, res) => {
  const recipes = await Recipe.find().sort({ createdAt: -1 });
  res.render('index', { recipes });
});

// Render a form to add a new recipe
app.get('/new', (req, res) => {
  res.render('form');
});

app.post('/recipes-form', async (req, res) => {
  try {
    const recipe = new Recipe({
      name: req.body.name,
      url: req.body.url,
      body: req.body.body,
      review: req.body.review,
      tags: req.body.tags.split(',').map(t => t.trim())
    });
    await recipe.save();
    res.redirect('/');
  } catch (err) {
    res.send('Error saving recipe: ' + err.message);
  }
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
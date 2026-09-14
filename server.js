const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');
const methodOverride = require('method-override');
require('dotenv').config();

// Escape regex metacharacters so user input is treated as literal text
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a Mongo filter for searching by name, tag, or keyword.
// Matches case-insensitively across name, body, review, and tags.
// Returns {} (match everything) when there is no query.
function buildSearchFilter(rawQuery) {
  const query = (rawQuery || '').trim();
  if (!query) return {};
  const regex = new RegExp(escapeRegex(query), 'i');
  return {
    $or: [
      { name: regex },
      { body: regex },
      { review: regex },
      { tags: regex }
    ]
  };
}

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB error:", err);
    process.exit(1);
  });

// Create a new recipe (API)
app.post('/recipes', async (req, res, next) => {
  try {
    const recipe = new Recipe(req.body);
    const saved = await recipe.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// Get all recipes (API) — supports ?q= to search by name, tag, or keyword
app.get('/recipes', async (req, res, next) => {
  try {
    const recipes = await Recipe.find(buildSearchFilter(req.query.q));
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

// Get a specific recipe — renders the detail page for browsers,
// returns JSON when the client explicitly requests it
app.get('/recipes/:id', async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      if (req.accepts('html')) {
        return res.status(404).render('error', {
          message: 'Recipe not found',
          status: 404
        });
      }
      return res.status(404).json({ error: 'Recipe not found' });
    }
    if (req.accepts('html')) {
      return res.render('recipe', { recipe });
    }
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

// Update a recipe (API)
app.put('/recipes/:id', async (req, res, next) => {
  try {
    const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Recipe not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Update a recipe from the form
app.put('/recipes-form/:id', async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).render('error', {
      message: 'Recipe not found',
      status: 404
    });

    recipe.name = req.body.name;
    recipe.url = req.body.url;
    recipe.body = req.body.body;
    recipe.review = req.body.review;
    recipe.tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [];

    await recipe.save();
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// Delete a recipe
app.delete('/recipes/:id', async (req, res, next) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send('Recipe not found');
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// View all recipes in a page — supports ?q= to search by name, tag, or keyword
app.get('/', async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    const recipes = await Recipe.find(buildSearchFilter(query)).sort({ createdAt: -1 });
    res.render('index', { recipes, error: null, query });
  } catch (err) {
    next(err);
  }
});

// Render a form to add a new recipe
app.get('/new', (req, res) => {
  res.render('form', { recipe: null, error: null });
});

// Render a form to edit an existing recipe
app.get('/recipes/:id/edit', async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).render('error', {
      message: 'Recipe not found',
      status: 404
    });
    res.render('form', { recipe, error: null });
  } catch (err) {
    next(err);
  }
});

// Create a recipe from the form
app.post('/recipes-form', async (req, res, next) => {
  try {
    const recipe = new Recipe({
      name: req.body.name,
      url: req.body.url,
      body: req.body.body,
      review: req.body.review,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : []
    });
    await recipe.save();
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).render('error', {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    status: 404
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).render('error', {
      message: `Validation failed: ${messages.join(', ')}`,
      status: 400
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).render('error', {
      message: `Invalid ID format: ${err.value}`,
      status: 400
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    return res.status(409).render('error', {
      message: 'Duplicate value: this recipe already exists',
      status: 409
    });
  }

  // Default 500 error
  res.status(500).render('error', {
    message: 'Something went wrong on the server',
    status: 500
  });
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
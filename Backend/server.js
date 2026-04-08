
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/approvalDB');

const InstitutionSchema = new mongoose.Schema({
  name: String,
  approvalType: String,
  faculty: Number,
  infrastructure: Number,
  naac: String,
  previousApproval: String,
  file: String,
  result: String,
  score: Number
});

const Institution = mongoose.model('Institution', InstitutionSchema);

// File Upload Setup
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

function predictApproval(data) {
  let score = 0;

  const faculty = parseInt(data.faculty);
  const infrastructure = parseInt(data.infrastructure);

  if (faculty > 50) score += 2;
  if (infrastructure >= 7) score += 2;
  if (data.naac === "A" || data.naac === "A+") score += 2;
  if (data.previousApproval === "yes") score += 1;

  if (score >= 5) return { result: "High Chance", score };
  else if (score >= 3) return { result: "Medium Chance", score };
  else return { result: "Low Chance", score };
}

function generateSuggestions(data) {
  let suggestions = [];

  if (parseInt(data.faculty) < 50) suggestions.push("Increase faculty count");
  if (parseInt(data.infrastructure) < 7) suggestions.push("Improve infrastructure");
  if (data.naac !== "A" && data.naac !== "A+") suggestions.push("Improve NAAC grade");
  if (data.previousApproval === "no") suggestions.push("Apply for initial approval first");

  return suggestions;
}

function hello(){
  console.log("Hello");
}
// Predict + Save
app.post('/predict', upload.single('file'), async (req, res) => {
  const data = req.body;
  const prediction = predictApproval(data);
  const suggestions = generateSuggestions(data);

  const newInst = new Institution({
    ...data,
    faculty: parseInt(data.faculty),
    infrastructure: parseInt(data.infrastructure),
    file: req.file ? req.file.filename : null,
    ...prediction
  });

  await newInst.save();

  res.json({ ...data, ...prediction, suggestions });
});

// Get History
app.get('/history', async (req, res) => {
  const data = await Institution.find().sort({ _id: -1 });
  res.json(data);
});

app.listen(5000, () => console.log('Server running on port 5000'));

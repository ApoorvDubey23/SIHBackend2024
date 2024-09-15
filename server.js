import express from 'express';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import User from './models/UserModel.js'; // Adjust path as necessary
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadOnCloudinary } from './cloudinaryConfig.js'; // Adjust path as necessary
import connectit from './db.js';
import dotenv from 'dotenv';

dotenv.config();
connectit();

const app = express();
app.use(cors());
app.use(express.json()); // To parse JSON request bodies
app.use(cookieParser()); // To handle cookies

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Temporary directory for storing files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // File name format
  }
});

const upload = multer({ storage });

// Upload file route
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log('File saved to:', req.file.path); // Debugging statement

  const localFilePath = req.file.path;
  
  try {
    const result = await uploadOnCloudinary(localFilePath);

    if (result && result.secure_url) {
      console.log(result.secure_url);
      
      return res.json({ fileUrl: result.secure_url });
    } else {
      return res.status(500).json({ error: 'Error uploading file to Cloudinary' });
    }
  } catch (error) {
    console.error('Error in upload:', error);
    return res.status(500).json({ error: 'Error uploading file' });
  } finally {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Clean up file after processing
    }
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(400).json({ error: 'User does NOT exist' });
    }

    // Compare passwords
    const checkPassword = await bcrypt.compare(password, foundUser.password);
    if (!checkPassword) {
      return res.status(400).json({ message: 'Invalid password', success: false });
    }

    // Generate JWT token
    const tokenData = {
      id: foundUser._id,
      username: foundUser.username,
    };
    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, { expiresIn: '2h' });

    // Send the response with token in an httpOnly cookie
    res.cookie('token', token, { httpOnly: true });
    return res.json({
      message: 'Login Successful',
      success: true,
      username:foundUser.username,
      email:foundUser.email,
      // pic:foundUser.pic
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
});

// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (username && email && password) {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new User({
        username,
        email,
        password: hashedPassword
      });

      try {
        const creationResponse = await newUser.save();
        console.log('User created:', creationResponse);

        return res.json({
          message: 'User created successfully',
          success: true,
          creationResponse
        });
      } catch (error) {
        console.log('Error while creating user:', error);
        return res.status(500).json({
          message: 'Error creating user, please retry',
          success: false
        });
      }
    } else {
      return res.status(400).json({ message: 'All fields are required' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Server setup
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

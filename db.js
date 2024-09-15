import mongoose from "mongoose";


export default async function connectit(){
    
// Connection URI
const mongoURI = process.env.MONGODB_URI; // Replace with your MongoDB URI

// Options (optional, but recommended for compatibility)
const options = {
   
    
   
};

// Connecting to MongoDB
await mongoose.connect(mongoURI, options)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to ' + mongoURI);
});

mongoose.connection.on('error', (err) => {
    console.log('Mongoose connection error: ' + err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// Graceful shutdown for Mongoose on app termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose connection closed on app termination');
    process.exit(0);
});
}
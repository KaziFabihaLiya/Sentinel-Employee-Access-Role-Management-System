const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { MongoClient, ServerApiVersion } = require('mongodb');
// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite dev server URL
  credentials: true,
}));
app.use(express.json()); // Parse incoming JSON requests

const uri = "mongodb+srv://EARMSAdmin:Xd2AGE6mPov9haCD@cluster0.8ev9gxa.mongodb.net/?appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
 serverApi: {
  version: ServerApiVersion.v1,
  strict: true,
  deprecationErrors: true,
 }
});
async function run() {
 try {
  // Connect the client to the server (optional starting in v4.7)
  await client.connect();
  // Send a ping to confirm a successful connection
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
 } finally {
  // Ensures that the client will close when you finish/error
  await client.close();
 }
}
run().catch(console.dir);


// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Access Management API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
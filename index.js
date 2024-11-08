const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI and client setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.onhj8vc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Function to connect to MongoDB and define the route
async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const roomCollection = client.db('StayScape').collection('rooms');

    // GET endpoint to fetch rooms with optional price filtering
    app.get('/rooms', async (req, res) => {
      try {
        const { minPrice, maxPrice, sortOrder } = req.query;
    
        // Build the filter object based on query parameters
        const filter = {};
        if (minPrice) filter.pricePerNight = { $gte: parseFloat(minPrice) };
        if (maxPrice) {
          filter.pricePerNight = filter.pricePerNight || {};
          filter.pricePerNight.$lte = parseFloat(maxPrice);
        }
    
        // Determine sort order based on sortOrder query parameter
        let sortOption = {};
        if (sortOrder === 'asc') {
          sortOption.pricePerNight = 1; // Ascending order
        } else if (sortOrder === 'desc') {
          sortOption.pricePerNight = -1; // Descending order
        }
    
        // Use the filter and sortOption in the find() method
        const rooms = await roomCollection.find(filter).sort(sortOption).toArray();
        res.send(rooms); // Send sorted and filtered rooms data as JSON
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Do not close the client to keep the connection open for further requests
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

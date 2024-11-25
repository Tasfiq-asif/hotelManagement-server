const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const roomData = require('./roomData');
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
    // await client.connect();

    const roomCollection = client.db('StayScape').collection('rooms');
      const bookingCollection = client.db('StayScape').collection('bookings');

    // await roomCollection.insertMany(roomData);
    // console.log("Room data inserted successfully");

    // endpoint to fetch rooms with  price filtering
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

    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      

      const result = await roomCollection.findOne(query);
      res.send(result);
  })

  // Endpoint to get reviews for a specific room
app.get('/rooms/:id/reviews', async (req, res) => {
  const { id } = req.params;

  try {
    const room = await roomCollection.findOne({ _id: new ObjectId(id) });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(room.reviews || []); // Return reviews or an empty array if no reviews
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to add a review to a specific room
app.post('/rooms/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const newReview = req.body; // Assuming the review has `name`, `rating`, and `comment` fields

  try {
    const result = await roomCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { reviews: newReview } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.status(201).json({ message: "Review added successfully", review: newReview });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to handle room bookings
app.post('/rooms/:id/book', async (req, res) => {
  const { id } = req.params;
  const { checkInDate, checkOutDate, name, email } = req.body;

  try {
    // Calculate total nights and cost
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

    // Fetch room details
    const room = await roomCollection.findOne({ _id: new ObjectId(id) });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const totalCost = totalNights * room.pricePerNight;

    // Booking object
    const newBooking = {
      roomId: id,
      roomName: room.roomDescription,
      checkInDate,
      checkOutDate,
      totalNights,
      totalCost,
      name,
      email,
      createdAt: new Date(),
    };

    // Insert booking into a separate 'bookings' collection or update the 'rooms' collection
  
    const result = await bookingCollection.insertOne(newBooking);

    // Respond with booking details
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Error handling booking:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//My Bookings


app.get('/my-bookings', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const bookings = await bookingCollection.find({ email }).toArray();

    if (bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found" });
    }

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Server error" });
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

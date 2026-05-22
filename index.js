require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

async function run() {
  try {
    await client.connect();
    const db = client.db("study-nook");
    const roomsCollection = db.collection("roomsCollection");
    const bookingsCollection = db.collection("bookingsCollection");

    app.post("/rooms", async (req, res) => {
      const newData = req.body;
      const result = await roomsCollection.insertOne(newData);
      res.send(result);
    });

    app.get("/rooms", async (req, res) => {
      try {
        const { search, amenities, minPrice, maxPrice } = req.query;
        let query = {};
        if (search) {
          query.name = {
            $regex: search,
            $options: "i",
          };
        }
        if (amenities) {
          const amenitiesArray = amenities.split(",");

          query.amenities = {
            $all: amenitiesArray,
          };
        }

        if (minPrice || maxPrice) {
          query.pricePerHour = {};

          if (minPrice) {
            query.pricePerHour.$gte = Number(minPrice);
          }

          if (maxPrice) {
            query.pricePerHour.$lte = Number(maxPrice);
          }
        }

        const result = await roomsCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.log("Search API Error =>", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    app.get("/available-study-rooms", async (req, res) => {
      const cursor = roomsCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      const result = await cursor;
      res.send(result);
    });

    app.get("/rooms/owner/:ownerId", async (req, res) => {
      const { ownerId } = req.params;
      const result = await roomsCollection.find({ ownerId: ownerId }).toArray();
      res.send(result);
    });

    app.patch("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await roomsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );
      res.send(result);
    });

    app.delete("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const { roomId, date, startTime, endTime } = newBooking;

      const query = {
        roomId: roomId,
        date: date,
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
        ],
      };

      const existingBooking = await bookingsCollection.findOne(query);

      if (existingBooking) {
        return res.status(400).send({
          message: "Sorry, This room already booked!",
        });
      }
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      const result = await bookingsCollection
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const { id } = req.params;
      const updateStatus = req.body;
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateStatus },
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

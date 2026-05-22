require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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
async function run() {
  try {
    await client.connect();
    const db = client.db("study-nook");
    const roomsCollection = db.collection("roomsCollection");

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
          }
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

        console.log("User searched for =>", search);
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

    app.get("/available-study-rooms", async (req, res) => {
      const cursor = roomsCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      const result = await cursor;
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

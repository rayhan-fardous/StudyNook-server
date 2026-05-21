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

    app.get("/available-study-rooms", async (req, res) => {
      const cursor = roomsCollection.find().sort({ _id: -1 }).limit(6).toArray();
      const result = await cursor;
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "You successfully connected to MongoDB!",
    );
  } finally {
    
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
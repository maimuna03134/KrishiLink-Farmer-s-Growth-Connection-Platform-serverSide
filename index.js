const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// mongodb
const uri =
  "mongodb+srv://crops-db:zu5mEPXxBTYpD8tZ@cluster0.imnpg23.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    const db = client.db("crops-db");
    const cropsCollection = db.collection("crops");

    app.get("/crops", async (req, res) => {
      const result = await cropsCollection.find().toArray();
      res.send(result);
    });

    // for single data
    app.get("/crops/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const query = { _id: id };
      const result = await cropsCollection.findOne(query);
      res.send({
        success: true,
        result,
      });
    });

    // post - new interest
    app.post("/crops", async (req, res) => {
      const newInterest = req.body;
      // console.log(newInterest);
      const { cropId, userEmail, userName, quantity, message, status } =
        newInterest;

      try {
        const result = await cropsCollection.updateOne(
          { _id: cropId },
          {
            $push: {
              interests: {
                _id: new ObjectId(),
                cropId,
                userEmail,
                userName,
                quantity,
                message,
                status: status || "pending",
              },
            },
          }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Crop not Found",
          });
        }
        res.send({
          success: true,
          message: "Interest added successfully",
          result,
        });
      } catch (err) {
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });
    // put - interest status
    app.put("/crops/:id", async (req, res) => {
      const { cropId, interestId } = req.params;
      const { status } = res.body;

      try {
        const result = await cropsCollection.updateOne(
          { _id: cropId, "interests._id": new ObjectId(interestId) },
          {
            $set: { "interests.$status": status },
          }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Interest not Found",
          });
        }
        res.send({
          success: true,
          message: "Interest updated successfully",
          result,
        });
      } catch (err) {
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

    app.delete("/crops/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await cropsCollection.deleteOne(query);
      res.send({
        success: true,
        result,
      });
    });

    // latest data
    app.get("/latest-crops", async (req, res) => {
      const cursor = cropsCollection.find().sort({ pricePerUnit: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

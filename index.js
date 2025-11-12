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
      try {
        const result = await cropsCollection.find().toArray();
      res.send(result);
      } catch (err){
        res.status(500).send({ success: false, message: err.message });
      }
    });

    // for single data
    app.get("/crops/:id", async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id);
        const query = { _id: id };
        const result = await cropsCollection.findOne(query);

        if (!result) {
          return res.status(404).send({
            success: false,
            message: "Crop not found",
          });
        }

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
      
    });

    // add crops
    app.post("/add-crop", async (req, res) => {
      try {
        console.log("Adding crop:", req.body);

        const newCrop = req.body;


        const result = await cropsCollection.insertOne(newCrop);

        console.log("Crop added successfully:", result);

        res.send({
          success: true,
          message: "Crop added successfully",
          result,
        });
      } catch (error) {
        console.error("Error adding crop:", error);
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // post - new interest
    app.post("/crops/:cropId/interests", async (req, res) => {
      const { cropId } = req.params;
      const { userEmail, userName, quantity, message } = req.body;

      try {
        const interestObj = {
          _id: new ObjectId().toString(),
          cropId,
          userEmail,
          userName,
          quantity: parseInt(quantity),
          message,
          status: "pending",
        };

        console.log("Adding interest:", interestObj);


        const result = await cropsCollection.updateOne(
          { _id: cropId },
          {
            $push: {
              interests: interestObj,
            },
          }
        );

        console.log("Update result:", result);


        if (result.matchedCount === 0) {
         return res.status(404).send({
           success: false,
           message: "Crop not found",
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


    // put - update interest status
    app.put("/crops/:cropId/interests/:interestId", async (req, res) => {
      const { cropId, interestId } = req.params;
      const { status } = res.body;

      try {
        console.log("Updating interest:", { cropId, interestId, status });

        const result = await cropsCollection.updateOne(
          { _id: cropId, "interests._id": interestId },
          {
            $set: { "interests.$status": status },
          }
        );

        console.log("Update result:", result);


        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Interest not found",
          });
        }

        if (result.modifiedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "No changes made",
          });
        }

        res.send({
          success: true,
          message: "Interest updated successfully!",
          result,
        });
      } catch (err) {
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

    // put - update entire crop
    app.put("/crops/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedCrops = req.body;
        const query = { _id: id };

        const update = {
          $set: updatedCrops,
        };
        const result = await cropsCollection.updateOne(query, update);

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
       
     });

    app.delete("/crops/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: id };
        const result = await cropsCollection.deleteOne(query);
        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
      
    });

    // latest data
    app.get("/latest-crops", async (req, res) => {
      try {
        const cursor = cropsCollection
          .find()
          .sort({ pricePerUnit: -1 })
          .limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
      
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

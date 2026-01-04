const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// mongodb
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.imnpg23.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const db = client.db("crops-db");
    const cropsCollection = db.collection("crops");
    const interestsCollection = db.collection("interests");

    app.post("/crops", async (req, res) => {
      try {
        const {
          name,
          pricePerUnit,
          quantity,
          unit,
          type,
          location,
          image,
          description,
          owner
        } = req.body;

        const crop = {
          name,
          pricePerUnit,
          quantity,
          unit,
          type,
          location,
          image,
          description,
          owner, 
          createdAt: new Date(),
          status: "available"
        };

        const result = await cropsCollection.insertOne(crop);

        res.send({
          success: true,
          message: "Crop added successfully",
          data: result,
        });
      } catch (err) {
        console.error("Error adding crop:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });


    app.get("/crops", async (req, res) => {
      try {
        const {
          search = "",
          category = "",
          location = "",
          page = 1,
          limit = 10
        } = req.query;

        const filter = {};

        // Search filter
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { type: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } }
          ];
        }

        // Category filter
        if (category) {
          filter.type = category;
        }

        // Location filter
        if (location) {
          filter.location = location;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const totalCrops = await cropsCollection.countDocuments(filter);

        const crops = await cropsCollection
          .find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const totalPages = Math.ceil(totalCrops / parseInt(limit));

        res.send({
          success: true,
          data: crops,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCrops,
            limit: parseInt(limit),
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        });


      } catch (err) {
        res.status(500).send({ success: false, message: err.message });
      }
    });

    // latest data
    app.get("/latest-crops", async (req, res) => {
      try {
        const cursor = cropsCollection.find().sort({ _id: -1 }).limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });


    app.get("/crops/categories", async (req, res) => {
      try {
        const categories = await cropsCollection.distinct("type");
        res.send({
          success: true,
          categories: categories.sort()
        });
      } catch (err) {
        res.status(500).send({ success: false, message: err.message });
      }
    });

    app.get("/crops/locations", async (req, res) => {
      try {
        const locations = await cropsCollection.distinct("location");
        res.send({
          success: true,
          locations: locations.sort()
        });
      } catch (err) {
        res.status(500).send({ success: false, message: err.message });
      }
    });
    
    app.get("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid crop ID"
          });
        }

        const query = { _id: new ObjectId(id) };
        const crop = await cropsCollection.findOne(query);

        if (!crop) {
          return res.status(404).send({
            success: false,
            message: "Crop not found",
          });
        }

        const interests = await interestsCollection
          .find({ cropId: id })
          .sort({ _id: -1 })
          .toArray();

        crop.interests = interests;


        const relatedProducts = await cropsCollection
          .find({
            type: crop.type,
            _id: { $ne: new ObjectId(id) }
          })
          .limit(3)
          .sort({ _id: -1 })
          .toArray();

        res.send({
          success: true,
          result: crop,
          relatedProducts
        });
        
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.patch("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const editingCrop = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid crop ID"
          });
        }

        delete editingCrop._id;

        const result = await cropsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: editingCrop }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Crop not found"
          });
        }

        res.send({
          success: true,
          message: "Crop updated successfully",
          result
        });
      } catch (err) {
        console.error('Error in PUT /crops/:id:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });

    app.delete("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid crop ID"
          });
        }

        const result = await cropsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Crop not found"
          });
        }

        // Also delete all interests for this crop
        await interestsCollection.deleteMany({ cropId: id });

        res.send({
          success: true,
          message: "Crop deleted successfully",
          result
        });
      } catch (err) {
        console.error('Error in DELETE /crops/:id:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });

    app.get("/crops/category/:type", async (req, res) => {
      try {
        const { type } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const filter = { type };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const totalCrops = await cropsCollection.countDocuments(filter);

        const crops = await cropsCollection
          .find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const totalPages = Math.ceil(totalCrops / parseInt(limit));

        res.send({
          success: true,
          data: crops,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCrops,
            category: type
          }
        });
      } catch (err) {
        res.status(500).send({ success: false, message: err.message });
      }
    });

    app.get("/my-crops/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const crops = await cropsCollection
          .find({ "owner.ownerEmail": email })
          .sort({ _id: -1 })
          .toArray();

        res.send({
          success: true,
          data: crops
        });
      } catch (err) {
        console.error("Error fetching my crops:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });


    app.post("/interests", async (req, res) => {
      try {
        const interestData = req.body;

        const existingInterest = await interestsCollection.findOne({
          cropId: interestData.cropId,
          userEmail: interestData.userEmail
        });

        if (existingInterest) {
          return res.status(400).send({
            success: false,
            message: "You have already expressed interest in this crop",
            alreadyExists: true
          });
        }

        interestData.createdAt = new Date();
        interestData.status = interestData.status || "pending";

        const result = await interestsCollection.insertOne(interestData);

        res.send({
          success: true,
          message: "Interest submitted successfully",
          result
        });
      } catch (err) {
        console.error('Error in POST /interests:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });


    app.get("/interests/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const interests = await interestsCollection
          .find({ userEmail: email })
          .sort({ _id: -1 })
          .toArray();

        const interestsWithCrops = await Promise.all(
          interests.map(async (interest) => {
            const crop = await cropsCollection.findOne({
              _id: new ObjectId(interest.cropId)
            });
            return {
              ...interest,
              cropDetails: crop
            };
          })
        );

        res.send({
          success: true,
          data: interestsWithCrops
        });
      } catch (err) {
        console.error('Error in /my-interests/:email:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });

    
    app.get("/interests/crop/:cropId", async (req, res) => {
      try {
        const { cropId } = req.params;

        const interests = await interestsCollection
          .find({ cropId })
          .sort({ _id: -1 })
          .toArray();

        res.send({
          success: true,
          data: interests
        });
      } catch (err) {
        console.error('Error in /interests/crop/:cropId:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });

    app.put("/crops/:cropId/interests/:interestId", async (req, res) => {
      try {
        const { cropId, interestId } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(interestId)) {
          return res.status(400).send({
            success: false,
            message: "Invalid interest ID"
          });
        }

        // Update interest status
        const interestResult = await interestsCollection.updateOne(
          { _id: new ObjectId(interestId) },
          { $set: { status, updatedAt: new Date() } }
        );

        if (interestResult.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Interest not found"
          });
        }

    
        if (status === "accepted") {
          const interest = await interestsCollection.findOne({
            _id: new ObjectId(interestId)
          });

          if (interest && interest.quantity) {
            
            const crop = await cropsCollection.findOne({
              _id: new ObjectId(cropId)
            });

            if (crop) {
              // Calculate new quantity
              const newQuantity = crop.quantity - interest.quantity;

              // Update crop quantity
              await cropsCollection.updateOne(
                { _id: new ObjectId(cropId) },
                {
                  $set: {
                    quantity: newQuantity >= 0 ? newQuantity : 0,
                    updatedAt: new Date()
                  }
                }
              );
            }
          }
        }

        res.send({
          success: true,
          message: `Interest ${status} successfully`
        });
      } catch (err) {
        console.error('Error in PUT /crops/:cropId/interests/:interestId:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });

    app.delete("/interests/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid interest ID"
          });
        }

        const result = await interestsCollection.deleteOne({
          _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Interest not found"
          });
        }

        res.send({
          success: true,
          message: "Interest deleted successfully",
          result
        });
      } catch (err) {
        console.error('Error in DELETE /interests/:id:', err);
        res.status(500).send({ success: false, message: err.message });
      }
    });

    

    // await client.db("admin").command({ ping: 1 });
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
  res.send("API is running...");
});


// module.exports = app;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

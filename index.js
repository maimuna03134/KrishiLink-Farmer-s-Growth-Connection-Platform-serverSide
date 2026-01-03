const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// mongodb
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.imnpg23.mongodb.net/?appName=Cluster0`;

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
    // await client.connect();

    const db = client.db("crops-db");
    const cropsCollection = db.collection("crops");
    const interestsCollection = db.collection("interests");

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
    

    // for single data
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

        let relatedProducts = [];
        

       if (crop.type) {
      relatedProducts = await cropsCollection
        .find({
          type: crop.type,
          _id: { $ne: new ObjectId(id) }
        })
        .limit(3)
        .sort({ _id: -1 })
        .toArray();
    }
    
    res.send({ 
      success: true, 
      result: crop,
      relatedProducts 
    });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
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

    // get- for my post- crops by owner email
    app.get("/my-crops/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const result = await cropsCollection
          .find({ "owner.ownerEmail": email })
          .toArray();

        res.send({
          success: true,
          result,
        });
      } catch (err) {
        console.error("Error fetching my crops:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

    app.post('/interests', async (req, res) => {
      try {
        const interestData = req.body;
        const result = await interestsCollection.insertOne(interestData);
        res.send({
          success: true,
          message: "Interest added successfully",
          result,
        });
      } catch (err) {
        console.error("Error adding interest:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

     // post - new interest
    // app.post("/crops/:cropId/interests", async (req, res) => {
    //   const { cropId } = req.params;
    //   const { userEmail, userName, quantity, message } = req.body;

    //   try {
    //     const interestObj = {
    //       _id: new ObjectId().toString(),
    //       cropId,
    //       userEmail,
    //       userName,
    //       quantity: parseInt(quantity),
    //       message,
    //       status: "pending",
    //     };

    //     const result = await cropsCollection.updateOne(
    //       { _id: cropId },
    //       {
    //         $push: {
    //           interests: interestObj,
    //         },
    //       }
    //     );

    //     if (result.matchedCount === 0) {
    //       return res.status(404).send({
    //         success: false,
    //         message: "Crop not found",
    //       });
    //     }
    //     res.send({
    //       success: true,
    //       message: "Interest added successfully",
    //       result,
    //     });
    //   } catch (err) {
    //     res.status(500).send({
    //       success: false,
    //       message: err.message,
    //     });
    //   }
    // });

    app.get("/interests/:cropId", async (req, res) => {
    

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
        console.error("Error fetching interests:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

    // app.get("/my-interests/:email", async (req, res) => {
    //   try {
    //     const { email } = req.params;

    //     const allCrops = await cropsCollection.find().toArray();

    //     const myInterests = [];

    //     allCrops.forEach((crop) => {
    //       if (crop.interests && crop.interests.length > 0) {
    //         crop.interests.forEach((interest) => {
    //           if (interest.userEmail === email) {
    //             myInterests.push({
    //               ...interest,
    //               cropId: crop._id,
    //               cropName: crop.name,
    //               cropImage: crop.image,
    //               ownerName: crop.owner.ownerName,
    //               ownerEmail: crop.owner.ownerEmail,
    //               ownerEmail: crop.owner.ownerEmail,
    //               unit: crop.unit,
    //             });
    //           }
    //         });
    //       }
    //     });

    //     res.send({
    //       success: true,
    //       result: myInterests,
    //     });
    //   } catch (err) {
    //     console.error("Error fetching my interests:", err);
    //     res.status(500).send({
    //       success: false,
    //       message: err.message,
    //     });
    //   }
    // });

    // add crops
    
    app.post("/add-crop", async (req, res) => {
      try {
        console.log("Adding crop:", req.body);

        const newCrop = req.body;

        const result = await cropsCollection.insertOne(newCrop);

        res.send({
          success: true,
          message: "Crop added successfully",
          result,
        });
      } catch (err) {
        console.error("Error adding crop:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

   

    // put - update interest status
    app.put("/crops/:cropId/interests/:interestId", async (req, res) => {
      const { cropId, interestId } = req.params;
      const { status } = req.body;

      try {
        console.log("Updating interest:", { cropId, interestId, status });

        const result = await cropsCollection.updateOne(
          {
            _id: cropId, // ✅ string id
            "interests._id": interestId, // ✅ string id
          },
          {
            $set: { "interests.$.status": status },
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
        console.error("Error while updating interest:", err);
        res.status(500).send({
          success: false,
          message: err.message,
        });
      }
    });

    // update only quantity
    app.put("/crops/:id/quantity", async (req, res) => {
      try {
        const { id } = req.params;
        const { quantity } = req.body;

        console.log("Updating quantity:", { id, quantity });

        const result = await cropsCollection.updateOne(
          { _id: id },
          {
            $set: { quantity: quantity },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Crop not found",
          });
        }

        res.send({
          success: true,
          message: "Quantity updated successfully",
          result,
        });
      } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).send({
          success: false,
          message: error.message,
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
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

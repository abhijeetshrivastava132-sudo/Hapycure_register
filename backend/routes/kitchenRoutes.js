const express = require("express");
const { upload } = require("../config/upload");
const { readDB, writeDB } = require("../utils/db");
const { createId, fileUrl, isTenDigitPhone } = require("../utils/helpers");

const router = express.Router();

router.post(
  "/register",
  upload.fields([
    { name: "documents", maxCount: 5 },
    { name: "foodPhotos", maxCount: 20 }
  ]),
  function (req, res) {
    const data = req.body;
    let foodItems = [];

    try {
      foodItems = JSON.parse(data.foodItems || "[]");
    } catch (error) {
      foodItems = [];
    }

    if (!data.kitchenName || !data.owner || !data.phone || !data.city || !data.address || !data.foodType) {
      return res.status(400).json({
        success: false,
        message: "Kitchen details incomplete hai"
      });
    }

    if (!isTenDigitPhone(data.phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number exactly 10 digit ka hona chahiye"
      });
    }

    if (!Array.isArray(foodItems) || foodItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kam se kam 1 food item add karo"
      });
    }

    const db = readDB();
    const documentFiles = req.files && req.files.documents ? req.files.documents : [];
    const foodPhotoFiles = req.files && req.files.foodPhotos ? req.files.foodPhotos : [];

    const documents = documentFiles.map(function (file) {
      return {
        name: file.originalname,
        url: fileUrl(req, file)
      };
    });

    const finalFoodItems = foodItems.map(function (item) {
      const photoIndex = Number.isInteger(item.photoUploadIndex) ? item.photoUploadIndex : -1;
      const photoFile = photoIndex >= 0 ? foodPhotoFiles[photoIndex] : null;

      return {
        name: item.name,
        price: item.price,
        mealType: item.mealType,
        category: item.category,
        description: item.description || "",
        photo: photoFile
          ? {
              name: photoFile.originalname,
              url: fileUrl(req, photoFile)
            }
          : null
      };
    });

    const kitchen = {
      id: createId(),
      kitchenName: data.kitchenName,
      owner: data.owner,
      phone: data.phone,
      email: data.email || "",
      city: data.city,
      address: data.address,
      foodType: data.foodType,
      openingTime: data.openingTime || "",
      closingTime: data.closingTime || "",
      documents,
      foodItems: finalFoodItems,
      status: "Pending",
      createdAt: new Date().toISOString(),
      approvedAt: null,
      rejectedAt: null
    };

    db.kitchens.push(kitchen);
    writeDB(db);

    res.status(201).json({
      success: true,
      message: "Kitchen request submitted successfully",
      trackingId: kitchen.id,
      kitchen
    });
  }
);

router.get("/status/:id", function (req, res) {
  const db = readDB();

  const kitchen = db.kitchens.find(function (item) {
    return item.id === req.params.id;
  });

  if (!kitchen) {
    return res.status(404).json({
      success: false,
      message: "Request not found"
    });
  }

  res.json({
    success: true,
    trackingId: kitchen.id,
    kitchenName: kitchen.kitchenName,
    status: kitchen.status
  });
});

router.get("/", function (req, res) {
  const db = readDB();

  const kitchens = db.kitchens.filter(function (kitchen) {
    return kitchen.status === "Approved";
  });

  res.json({
    success: true,
    kitchens
  });
});

router.get("/:id", function (req, res) {
  const db = readDB();

  const kitchen = db.kitchens.find(function (item) {
    return item.id === req.params.id && item.status === "Approved";
  });

  if (!kitchen) {
    return res.status(404).json({
      success: false,
      message: "Approved kitchen not found"
    });
  }

  res.json({
    success: true,
    kitchen
  });
});

module.exports = router;

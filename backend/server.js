const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, "data", "db.json");
const UPLOAD_PATH = path.join(__dirname, "uploads");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_PATH));

if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_PATH);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    cb(null, Date.now() + "-" + safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

function ensureDB() {
  const folder = path.dirname(DB_PATH);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ kitchens: [] }, null, 2));
  }
}

function readDB() {
  ensureDB();
  const data = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data);
}

function writeDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function createId() {
  return "HC-" + Date.now().toString(36).toUpperCase();
}

function fileUrl(req, file) {
  return req.protocol + "://" + req.get("host") + "/uploads/" + file.filename;
}

app.get("/", function (req, res) {
  res.json({
    success: true,
    message: "HapyCure backend is running"
  });
});

app.get("/api/health", function (req, res) {
  res.json({
    success: true,
    status: "OK"
  });
});

app.post(
  "/api/kitchens/register",
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

    if (!/^[0-9]{10}$/.test(data.phone)) {
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

app.get("/api/kitchens/status/:id", function (req, res) {
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

app.get("/api/admin/kitchen-requests", function (req, res) {
  const db = readDB();

  res.json({
    success: true,
    kitchens: db.kitchens
  });
});

app.get("/api/admin/kitchen-requests/pending", function (req, res) {
  const db = readDB();
  const kitchens = db.kitchens.filter(function (kitchen) {
    return kitchen.status === "Pending";
  });

  res.json({
    success: true,
    kitchens
  });
});

app.patch("/api/admin/kitchen-requests/:id/approve", function (req, res) {
  const db = readDB();
  const kitchen = db.kitchens.find(function (item) {
    return item.id === req.params.id;
  });

  if (!kitchen) {
    return res.status(404).json({
      success: false,
      message: "Kitchen request not found"
    });
  }

  kitchen.status = "Approved";
  kitchen.approvedAt = new Date().toISOString();
  kitchen.rejectedAt = null;

  writeDB(db);

  res.json({
    success: true,
    message: "Kitchen approved successfully",
    kitchen
  });
});

app.patch("/api/admin/kitchen-requests/:id/reject", function (req, res) {
  const db = readDB();
  const kitchen = db.kitchens.find(function (item) {
    return item.id === req.params.id;
  });

  if (!kitchen) {
    return res.status(404).json({
      success: false,
      message: "Kitchen request not found"
    });
  }

  kitchen.status = "Rejected";
  kitchen.rejectedAt = new Date().toISOString();
  kitchen.approvedAt = null;

  writeDB(db);

  res.json({
    success: true,
    message: "Kitchen rejected successfully",
    kitchen
  });
});

app.get("/api/kitchens", function (req, res) {
  const db = readDB();
  const kitchens = db.kitchens.filter(function (kitchen) {
    return kitchen.status === "Approved";
  });

  res.json({
    success: true,
    kitchens
  });
});

app.get("/api/kitchens/:id", function (req, res) {
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

app.get("/api/admin/stats", function (req, res) {
  const db = readDB();

  const stats = {
    total: db.kitchens.length,
    pending: db.kitchens.filter(item => item.status === "Pending").length,
    approved: db.kitchens.filter(item => item.status === "Approved").length,
    rejected: db.kitchens.filter(item => item.status === "Rejected").length
  };

  res.json({
    success: true,
    stats
  });
});

app.listen(PORT, function () {
  console.log("HapyCure backend running on port " + PORT);
});

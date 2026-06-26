const express = require("express");
const { readDB, writeDB } = require("../utils/db");

const router = express.Router();

router.get("/kitchen-requests", function (req, res) {
  const db = readDB();

  res.json({
    success: true,
    kitchens: db.kitchens
  });
});

router.get("/kitchen-requests/pending", function (req, res) {
  const db = readDB();

  const kitchens = db.kitchens.filter(function (kitchen) {
    return kitchen.status === "Pending";
  });

  res.json({
    success: true,
    kitchens
  });
});

router.patch("/kitchen-requests/:id/approve", function (req, res) {
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

router.patch("/kitchen-requests/:id/reject", function (req, res) {
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

router.get("/stats", function (req, res) {
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

module.exports = router;

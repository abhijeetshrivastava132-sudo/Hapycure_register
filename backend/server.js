const express = require("express");
const cors = require("cors");

const { UPLOAD_PATH } = require("./config/upload");
const kitchenRoutes = require("./routes/kitchenRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_PATH));

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

app.use("/api/kitchens", kitchenRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, function () {
  console.log("HapyCure backend running on port " + PORT);
});

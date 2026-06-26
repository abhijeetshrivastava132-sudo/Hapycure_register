function createId() {
  return "HC-" + Date.now().toString(36).toUpperCase();
}

function fileUrl(req, file) {
  return req.protocol + "://" + req.get("host") + "/uploads/" + file.filename;
}

function isTenDigitPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

module.exports = {
  createId,
  fileUrl,
  isTenDigitPhone
};

const API_URL = "https://hapycure-register.onrender.com";

const foodItems = [];
let lastRequestId = localStorage.getItem("lastKitchenRequestId") || "";

const formLayout = document.getElementById("formLayout");
const statusPage = document.getElementById("statusPage");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");
const pendingStep = document.getElementById("pendingStep");
const acceptedStep = document.getElementById("acceptedStep");
const rejectedStep = document.getElementById("rejectedStep");
const trackingIdText = document.getElementById("trackingIdText");
const trackingInput = document.getElementById("trackingInput");
const foodList = document.getElementById("foodList");
const foodCount = document.getElementById("foodCount");
const errorBox = document.getElementById("errorBox");
const phoneInput = document.getElementById("phone");

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

function hideMessages() {
  errorBox.style.display = "none";
}

function clearFoodForm() {
  document.getElementById("foodName").value = "";
  document.getElementById("foodPrice").value = "";
  document.getElementById("mealType").value = "";
  document.getElementById("foodCategory").value = "";
  document.getElementById("foodDescription").value = "";
  document.getElementById("foodPhoto").value = "";
}

function renderFoodItems() {
  foodCount.textContent = foodItems.length;

  if (foodItems.length === 0) {
    foodList.innerHTML = '<div class="empty-state">No food items added yet.</div>';
    return;
  }

  foodList.innerHTML = foodItems.map(function (item, index) {
    return `
      <div class="food-card">
        <div class="food-top">
          <div class="food-name">${item.name}</div>
          <div class="food-price">₹${item.price}</div>
        </div>
        <div class="food-meta">
          <span class="tag">${item.mealType}</span>
          <span class="tag">${item.category}</span>
          ${item.photoName ? `<span class="tag">${item.photoName}</span>` : ""}
        </div>
        <div class="food-desc">${item.description || "No description added."}</div>
        <button class="btn btn-danger" type="button" onclick="removeFoodItem(${index})">Remove</button>
      </div>
    `;
  }).join("");
}

function removeFoodItem(index) {
  foodItems.splice(index, 1);
  renderFoodItems();
  hideMessages();
}

function addFoodItem() {
  hideMessages();

  const photoInput = document.getElementById("foodPhoto");
  const photoFile = photoInput.files[0] || null;

  const item = {
    name: getValue("foodName"),
    price: getValue("foodPrice"),
    mealType: getValue("mealType"),
    category: getValue("foodCategory"),
    description: getValue("foodDescription"),
    photoName: photoFile ? photoFile.name : "",
    photoFile
  };

  if (!item.name || !item.price || !item.mealType || !item.category) {
    showError("Food name, price, meal type and category required hai.");
    return;
  }

  foodItems.push(item);
  clearFoodForm();
  renderFoodItems();
}

function showStatusPage(status) {
  formLayout.style.display = "none";
  statusPage.style.display = "block";

  trackingIdText.textContent = lastRequestId || "-";
  trackingInput.value = lastRequestId || "";

  pendingStep.className = "step";
  acceptedStep.className = "step";
  rejectedStep.className = "step";

  if (status === "Approved") {
    statusTitle.textContent = "Accepted";
    statusText.textContent = "Your kitchen request has been accepted by admin.";
    acceptedStep.className = "step accepted";
  } else if (status === "Rejected") {
    statusTitle.textContent = "Rejected";
    statusText.textContent = "Your kitchen request has been rejected by admin.";
    rejectedStep.className = "step rejected";
  } else {
    statusTitle.textContent = "Pending";
    statusText.textContent = "Your kitchen request is under review.";
    pendingStep.className = "step pending";
  }
}

async function submitKitchen() {
  hideMessages();

  const phoneNumber = getValue("phone");

  if (!/^[0-9]{10}$/.test(phoneNumber)) {
    showError("Phone number exactly 10 digit ka hona chahiye.");
    return;
  }

  if (
    !getValue("kitchenName") ||
    !getValue("ownerName") ||
    !getValue("city") ||
    !getValue("address") ||
    !getValue("foodType") ||
    foodItems.length === 0
  ) {
    showError("Kitchen details complete karo aur kam se kam 1 food item add karo.");
    return;
  }

  const formData = new FormData();

  formData.append("kitchenName", getValue("kitchenName"));
  formData.append("owner", getValue("ownerName"));
  formData.append("phone", phoneNumber);
  formData.append("email", getValue("email"));
  formData.append("city", getValue("city"));
  formData.append("address", getValue("address"));
  formData.append("foodType", getValue("foodType"));
  formData.append("openingTime", getValue("openingTime"));
  formData.append("closingTime", getValue("closingTime"));

  Array.from(document.getElementById("documents").files).forEach(function (file) {
    formData.append("documents", file);
  });

  const foodPhotos = [];

  const backendFoods = foodItems.map(function (item) {
    const foodForBackend = {
      name: item.name,
      price: item.price,
      mealType: item.mealType,
      category: item.category,
      description: item.description,
      photoUploadIndex: -1
    };

    if (item.photoFile) {
      foodForBackend.photoUploadIndex = foodPhotos.length;
      foodPhotos.push(item.photoFile);
    }

    return foodForBackend;
  });

  formData.append("foodItems", JSON.stringify(backendFoods));

  foodPhotos.forEach(function (file) {
    formData.append("foodPhotos", file);
  });

  try {
    const response = await fetch(`${API_URL}/api/kitchens/register`, {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      showError(result.message || "Request submit nahi hua.");
      return;
    }

    lastRequestId = result.trackingId;
    localStorage.setItem("lastKitchenRequestId", lastRequestId);

    resetFormOnly();
    hideMessages();
    showStatusPage("Pending");
  } catch (error) {
    showError("Backend connect nahi ho raha. Check karo backend live hai ya nahi.");
  }
}

async function checkStatus() {
  const id = (trackingInput.value.trim() || lastRequestId).trim();

  if (!id) {
    showStatusPage("Pending");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/kitchens/status/${id}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      showStatusPage("Pending");
      return;
    }

    lastRequestId = result.trackingId;
    localStorage.setItem("lastKitchenRequestId", lastRequestId);

    showStatusPage(result.status);
  } catch (error) {
    showStatusPage("Pending");
  }
}

function resetFormOnly() {
  document.getElementById("kitchenName").value = "";
  document.getElementById("ownerName").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("email").value = "";
  document.getElementById("city").value = "";
  document.getElementById("foodType").value = "";
  document.getElementById("openingTime").value = "";
  document.getElementById("closingTime").value = "";
  document.getElementById("address").value = "";
  document.getElementById("documents").value = "";

  clearFoodForm();
  foodItems.length = 0;
  renderFoodItems();
}

function resetAll() {
  resetFormOnly();
  hideMessages();
}

function newRequest() {
  localStorage.removeItem("lastKitchenRequestId");
  lastRequestId = "";
  statusPage.style.display = "none";
  formLayout.style.display = "grid";
  resetAll();
}

phoneInput.addEventListener("input", function () {
  phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "").slice(0, 10);
});

document.getElementById("addFoodBtn").addEventListener("click", addFoodItem);
document.getElementById("clearFoodBtn").addEventListener("click", clearFoodForm);
document.getElementById("submitKitchenBtn").addEventListener("click", submitKitchen);
document.getElementById("resetAllBtn").addEventListener("click", resetAll);
document.getElementById("checkStatusBtn").addEventListener("click", checkStatus);
document.getElementById("newRequestBtn").addEventListener("click", newRequest);

renderFoodItems();

if (lastRequestId) {
  showStatusPage("Pending");
  checkStatus();
}

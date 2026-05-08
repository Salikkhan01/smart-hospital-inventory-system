import React, { useEffect, useState } from "react";
import axios from "axios";
import "./InventoryList.css"; // Import the CSS file

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [orderSuggestions, setOrderSuggestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get("http://127.0.0.1:5001/inventory")
      .then((response) => {
        console.log("✅ Inventory Data:", response.data);
        setInventory(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("❌ Error fetching inventory:", error.response ? error.response.data : error.message);
        setError("Failed to fetch inventory data.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    axios.get("http://127.0.0.1:5001/order-suggestions")
      .then((response) => {
        console.log("✅ Order Suggestions:", response.data);
        setOrderSuggestions(response.data);
      })
      .catch((error) => {
        console.error("❌ Error fetching order suggestions:", error.response ? error.response.data : error.message);
      });
  }, []);

  return (
    <div className="inventory-container">
      <h2>Hospital Inventory</h2>

      {loading && <p className="loading">Loading inventory...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && inventory.length > 0 ? (
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Type</th>
              <th>Item Name</th>
              <th>Current Stock</th>
              <th>Threshold (Min Required)</th>
              <th>Max Capacity</th>
              <th>Unit Cost (₹)</th>
              <th>Avg Usage/Day</th>
              <th>Stock to Order</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.item_id} className={item.below_threshold ? "low-stock" : ""}>
                <td>{item.item_id}</td>
                <td>{item.item_type}</td>
                <td>{item.item_name}</td>
                <td>
                  <span className={item.below_threshold ? "red-text" : ""}>
                    {item.current_stock} {item.below_threshold && <span className="alert-icon">⚠️</span>}
                  </span>
                </td>
                <td className="threshold-cell">
                  {item.threshold_value} {/* Displaying threshold value */}
                </td>
                <td>{item.max_capacity}</td>
                <td>₹{item.unit_cost.toFixed(2)}</td>
                <td>{item.avg_usage_per_day}</td>
                <td className="order-suggestion">
                  {orderSuggestions[item.item_name] !== undefined ? orderSuggestions[item.item_name] : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        !loading && !error && <p>No inventory data available.</p>
      )}
    </div>
  );
};

export default InventoryList;

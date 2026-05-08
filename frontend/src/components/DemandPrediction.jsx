import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import "./DemandPrediction.css";

const DemandPrediction = () => {
  const [medicines, setMedicines] = useState([]);
  const [medicine, setMedicine] = useState("");
  const [prediction, setPrediction] = useState([]);
  const [error, setError] = useState("");
  const [graphImage, setGraphImage] = useState("");
  const [stockToOrder, setStockToOrder] = useState(null);

  useEffect(() => {
    axios.get("http://127.0.0.1:5001/medicines")
      .then(res => setMedicines(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPrediction([]);
    setGraphImage("");
    setStockToOrder(null);

    if (!medicine) {
      setError("Please select a medicine.");
      return;
    }

    try {
      const res = await axios.post(
        "http://127.0.0.1:5001/predict",
        { item_name: medicine }
      );

      if (res.data.error) {
        setError(res.data.error);
        return;
      }

      const data = res.data.predicted_demand.map((val, i) => ({
        day: `Day ${i+1}`,
        demand: val
      }));

      setPrediction(data);
      setGraphImage(`data:image/png;base64,${res.data.graph}`);
      setStockToOrder(res.data.stock_to_order);

    } catch (err) {
      setError("Prediction failed.");
    }
  };

  return (
    <div className="demand-container">
      <h2>Predict Medicine Demand</h2>

      <form onSubmit={handleSubmit} className="demand-form">
        <select value={medicine} onChange={(e) => setMedicine(e.target.value)}>
          <option value="">-- Select Medicine --</option>
          {medicines.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <button type="submit">Predict</button>
      </form>

      {error && <p className="error-message">{error}</p>}

      {prediction.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={prediction}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="demand" stroke="#28a745" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {graphImage && (
        <img src={graphImage} alt="Prediction Graph" width="100%" />
      )}

      {stockToOrder !== null && (
        <p>
          {stockToOrder > 0
            ? `Order ${stockToOrder} units`
            : "No additional stock required"}
        </p>
      )}
    </div>
  );
};

export default DemandPrediction;
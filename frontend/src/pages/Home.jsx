import React from "react";
import InventoryList from "../components/InventoryList.jsx";
import DemandPrediction from "../components/DemandPrediction.jsx";
import "./Home.css"; // Ensure you create this CSS file

const Home = () => {
  return (
    <div className="home-container">
      <h1 className="home-title">🏥 Hospital Inventory Management</h1>
      <div className="content-wrapper">
        <InventoryList />
        <DemandPrediction />
      </div>
    </div>
  );
};

export default Home;

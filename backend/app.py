import asyncio
import asyncpg
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
import statsmodels.api as sm
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ================= DATABASE CONFIG =================

DB_CONFIG = {
    "host": "localhost",
    "database": "hospital_inventory",
    "user": "postgres",
    "password": "Salik2004",
    "port": 5432
}

async def get_connection():
    return await asyncpg.connect(**DB_CONFIG)

# ================= ROOT ROUTE =================

@app.route('/')
def home():
    return jsonify({"message": "Hospital Inventory API Running 🚀"})

# ================= MEDICINES DROPDOWN =================

@app.route('/medicines', methods=['GET'])
def get_medicines():
    async def fetch():
        conn = await get_connection()
        rows = await conn.fetch("""
            SELECT DISTINCT medicine_name
            FROM medicine_usage
            ORDER BY medicine_name
        """)
        await conn.close()
        return rows

    rows = asyncio.run(fetch())
    return jsonify([r["medicine_name"] for r in rows])

# ================= INVENTORY TABLE =================

@app.route('/inventory', methods=['GET'])
def get_inventory():
    async def fetch():
        conn = await get_connection()
        rows = await conn.fetch("""
            SELECT item_id, item_type, item_name,
                   current_stock, min_required,
                   max_capacity, unit_cost, avg_usage_per_day
            FROM hospital_inventory
        """)
        await conn.close()
        return rows

    rows = asyncio.run(fetch())

    inventory = []
    for r in rows:
        inventory.append({
            "item_id": r["item_id"],
            "item_type": r["item_type"],
            "item_name": r["item_name"],
            "current_stock": r["current_stock"],
            "threshold_value": r["min_required"],
            "below_threshold": r["current_stock"] < r["min_required"],
            "max_capacity": r["max_capacity"],
            "unit_cost": float(r["unit_cost"]),
            "avg_usage_per_day": r["avg_usage_per_day"]
        })

    return jsonify(inventory)

# ================= ORDER SUGGESTIONS =================

@app.route('/order-suggestions', methods=['GET'])
def order_suggestions():
    async def fetch():
        conn = await get_connection()
        rows = await conn.fetch("""
            SELECT item_name, current_stock, min_required
            FROM hospital_inventory
        """)
        await conn.close()
        return rows

    rows = asyncio.run(fetch())

    suggestions = {}
    for r in rows:
        if r["current_stock"] < r["min_required"]:
            suggestions[r["item_name"]] = r["min_required"] - r["current_stock"]
        else:
            suggestions[r["item_name"]] = 0

    return jsonify(suggestions)

# ================= PREDICTION (ARIMA + FALLBACK) =================

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        if not data or "item_name" not in data:
            return jsonify({"error": "Provide item_name"}), 400

        item_name = data["item_name"]

        async def fetch():
            conn = await get_connection()

            usage_rows = await conn.fetch("""
                SELECT usage_date, quantity_used
                FROM medicine_usage
                WHERE LOWER(medicine_name) = LOWER($1)
                ORDER BY usage_date
            """, item_name)

            inventory_row = await conn.fetchrow("""
                SELECT min_required, current_stock, max_capacity
                FROM hospital_inventory
                WHERE LOWER(item_name) = LOWER($1)
            """, item_name)

            await conn.close()
            return usage_rows, inventory_row

        usage_rows, inventory_row = asyncio.run(fetch())

        if not usage_rows:
            return jsonify({"error": "No usage data found"}), 400

        df = pd.DataFrame(
            [(r["usage_date"], r["quantity_used"]) for r in usage_rows],
            columns=["date", "quantity"]
        )

        df["date"] = pd.to_datetime(df["date"])
        df = df.groupby("date").sum()
        df.sort_index(inplace=True)

        if len(df) < 5:
            return jsonify({"error": "Not enough historical data"}), 400

        # ================= MODEL =================

        model_used = "ARIMA"

        try:
            model = sm.tsa.ARIMA(df["quantity"], order=(3, 1, 2))
            model_fit = model.fit()
            prediction = model_fit.forecast(steps=7)
            prediction = prediction.tolist()

        except Exception:
            model_used = "Linear Regression"

            y = df["quantity"].tail(7).values
            x = np.arange(len(y))

            coeffs = np.polyfit(x, y, 1)
            slope = coeffs[0]
            intercept = coeffs[1]

            prediction = []
            for i in range(7):
                next_x = len(y) + i
                next_value = slope * next_x + intercept
                prediction.append(float(max(0, next_value)))

        # ================= INVENTORY LOGIC =================

        if inventory_row:
            min_required = inventory_row["min_required"]
            current_stock = inventory_row["current_stock"]
            max_capacity = inventory_row["max_capacity"]
        else:
            min_required = 0
            current_stock = 0
            max_capacity = 0

        predicted_total = sum(prediction)

        required_stock = predicted_total + min_required
        stock_to_order = max(0, required_stock - current_stock)

        # ================= GRAPH =================

        plt.figure(figsize=(8, 4))
        plt.plot(df.index, df["quantity"], marker='o', label="Historical")

        future_dates = pd.date_range(
            df.index[-1] + pd.Timedelta(days=1),
            periods=7
        )

        plt.plot(future_dates, prediction, linestyle='dashed', label="Predicted")
        plt.legend()
        plt.title(f"Demand Prediction for {item_name} ({model_used})")

        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)
        graph = base64.b64encode(img.getvalue()).decode()

        return jsonify({
            "item_name": item_name,
            "predicted_demand": prediction,
            "model_used": model_used,
            "stock_to_order": int(stock_to_order),
            "current_stock": current_stock,
            "threshold": min_required,
            "graph": graph
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ================= RUN =================

if __name__ == '__main__':
    app.run(debug=True, port=5001)
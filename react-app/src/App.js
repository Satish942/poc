import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('all');
  const [searchValue, setSearchValue] = useState('');

  // Use the backend API port 8081 directly.
  const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8081').replace(/\/$/, '');

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const fetchAllOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      setOrders(response.data);
    } catch (err) {
      setError('Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchOrders = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      fetchAllOrders();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let response;
      if (searchType === 'customer') {
        response = await axios.get(
          `${API_URL}/api/orders/customer/${encodeURIComponent(searchValue)}`
        );
      } else if (searchType === 'status') {
        response = await axios.get(
          `${API_URL}/api/orders/status/${encodeURIComponent(searchValue)}`
        );
      } else if (searchType === 'id') {
        response = await axios.get(
          `${API_URL}/api/orders/${encodeURIComponent(searchValue)}`
        );
      }
      setOrders(Array.isArray(response.data) ? response.data : [response.data]);
    } catch (err) {
      setError('No orders found. Please try another search.');
      console.error('Error searching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchValue('');
    setSearchType('all');
    fetchAllOrders();
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>📦 Order Retrieval System</h1>
        <p>Search and manage your orders</p>
      </header>

      <main className="main-content">
        <div className="search-section">
          <form onSubmit={searchOrders} className="search-form">
            <div className="form-group">
              <label htmlFor="searchType">Search Type:</label>
              <select
                id="searchType"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="select-input"
              >
                <option value="all">All Orders</option>
                <option value="id">Order ID</option>
                <option value="customer">Customer Name</option>
                <option value="status">Status</option>
              </select>
            </div>

            {searchType !== 'all' && (
              <div className="form-group">
                <label htmlFor="searchValue">Search Value:</label>
                <input
                  id="searchValue"
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={`Enter ${searchType}...`}
                  className="text-input"
                />
              </div>
            )}

            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                🔍 Search
              </button>
              <button type="button" onClick={handleReset} className="btn btn-secondary">
                ↻ Reset
              </button>
            </div>
          </form>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="results-section">
          {loading && <div className="loading">Loading orders...</div>}

          {!loading && orders.length === 0 && !error && (
            <div className="no-results">No orders found</div>
          )}

          {!loading && orders.length > 0 && (
            <div className="orders-grid">
              <h2>Orders ({orders.length})</h2>
              <div className="table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Order Date</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className={`status-${order.status.toLowerCase()}`}>
                        <td>{order.id}</td>
                        <td>{order.customerName}</td>
                        <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td>${order.totalAmount.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge status-${order.status.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>API Gateway: Kong | Backend: Spring Boot | Database: H2 In-Memory</p>
      </footer>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [contractInfo, setContractInfo] = useState(null);

  // Check server status on component mount
  useEffect(() => {
    checkServerStatus();
    getContractInfo();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await axios.get('http://localhost:4000/health');
      setServerStatus('connected');
    } catch (err) {
      setServerStatus('disconnected');
    }
  };

  const getContractInfo = async () => {
    try {
      const response = await axios.get('http://localhost:4000/contract-info');
      setContractInfo(response.data);
    } catch (err) {
      console.error('Failed to get contract info:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null); 
    setError(false);
  };

  const handleApiCall = async (endpoint) => {
    if (!file) {
      setResult("Please select a file first.");
      setError(true);
      return;
    }

    if (serverStatus !== 'connected') {
      setResult("Server is not connected. Please ensure the backend server is running.");
      setError(true);
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError(false);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post(`http://localhost:4000/${endpoint}`, formData);
      
      if (endpoint === 'upload') {
        setResult({
          message: "🎉 File uploaded successfully to blockchain!",
          hash: res.data.hash,
          transactionHash: res.data.transactionHash,
          blockNumber: res.data.blockNumber,
          gasUsed: res.data.gasUsed,
          details: res.data
        });
      } else {
        setResult({
          message: res.data.valid ? 
            "✅ File is Verified! This file exists on the blockchain and is authentic." : 
            "❌ File verification failed! This file was not found on the blockchain or has been tampered with.",
          hash: res.data.hash,
          valid: res.data.valid,
          details: res.data
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setResult(errorMessage);
      setError(true);
      
      // Refresh server status on error
      checkServerStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🔐 Blockchain File Verification</h1>
        <p className="subtitle">Secure, decentralized file integrity verification using Ethereum blockchain</p>
        
        <div className="status-indicators">
          <div className={`status-indicator ${serverStatus}`}>
            <span className="status-dot"></span>
            Backend: {serverStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          
          {contractInfo && (
            <div className="contract-info">
              📜 Contract: {contractInfo.contractAddress?.substring(0, 8)}...
            </div>
          )}
        </div>
      </header>
      
      <div className="upload-section">
        <label className="file-input-wrapper" htmlFor="file-upload">
          <div className="file-input-content">
            {file ? (
              <>
                <span className="file-icon">📄</span>
                <div className="file-details">
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024).toFixed(2)} KB</small>
                </div>
              </>
            ) : (
              <>
                <span className="upload-icon">⬆️</span>
                <span>Click to choose a file</span>
                <small>Any file type supported</small>
              </>
            )}
          </div>
          <input id="file-upload" type="file" onChange={handleFileChange} />
        </label>

        <div className="action-buttons">
          <button 
            className="upload-btn"
            onClick={() => handleApiCall('upload')} 
            disabled={!file || loading || serverStatus !== 'connected'}
          >
            {loading ? '⏳' : '📤'} Upload to Blockchain
          </button>
          
          <button 
            className="verify-btn"
            onClick={() => handleApiCall('verify')} 
            disabled={!file || loading || serverStatus !== 'connected'}
          >
            {loading ? '⏳' : '🔍'} Verify File
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-section">
          <div className="loader"></div>
          <p>Processing on blockchain...</p>
        </div>
      )}

      {result && (
        <div className={`result-section ${error ? 'error' : 'success'}`}>
          <div className="result-header">
            <h3>{error ? '❌ Error' : '✅ Success'}</h3>
          </div>
          
          <div className="result-content">
            <p className="result-message">{result.message || result}</p>
            
            {result.hash && (
              <div className="result-details">
                <div className="detail-item">
                  <strong>File Hash:</strong>
                  <code className="hash">{result.hash}</code>
                </div>
                
                {result.transactionHash && (
                  <div className="detail-item">
                    <strong>Transaction:</strong>
                    <code>{result.transactionHash}</code>
                  </div>
                )}
                
                {result.blockNumber && (
                  <div className="detail-item">
                    <strong>Block Number:</strong>
                    <code>{result.blockNumber}</code>
                  </div>
                )}
                
                {result.gasUsed && (
                  <div className="detail-item">
                    <strong>Gas Used:</strong>
                    <code>{result.gasUsed}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="info-cards">
          <div className="info-card">
            <h4>🔒 How it works</h4>
            <p>Files are hashed using SHA-256, and hashes are stored immutably on the Ethereum blockchain for verification.</p>
          </div>
          
          <div className="info-card">
            <h4>🌐 Decentralized</h4>
            <p>No central authority can tamper with your file records. The blockchain ensures permanent integrity.</p>
          </div>
          
          <div className="info-card">
            <h4>🔐 Privacy</h4>
            <p>Only file hashes are stored, not the actual files. Your data remains private and secure.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
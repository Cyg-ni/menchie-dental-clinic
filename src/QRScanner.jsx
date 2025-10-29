import React, { useState } from 'react';
import './QRScanner.css';

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showVisualization, setShowVisualization] = useState(false);

  const handleStartScan = () => {
    setIsScanning(true);
    // Simulate QR code scanning
    setTimeout(() => {
      const mockData = {
        serviceType: 'X-Ray Examination',
        procedure: 'Chest X-Ray',
        duration: '15 minutes',
        preparation: 'Remove metal objects',
        description: 'A chest X-ray is a painless imaging test that uses small amounts of radiation to create pictures of your chest.'
      };
      setScannedData(mockData);
      setIsScanning(false);
    }, 3000);
  };

  const handleViewVisualization = () => {
    setShowVisualization(true);
  };

  const resetScanner = () => {
    setScannedData(null);
    setShowVisualization(false);
    setIsScanning(false);
  };

  if (showVisualization) {
    return (
      <div className="qr-scanner">
        <div className="visualization-container">
          <h2>AR Visualization - {scannedData.procedure}</h2>
          <div className="ar-viewer">
            <div className="ar-placeholder">
              <div className="ar-icon">🫁</div>
              <p>AR Visualization Active</p>
              <div className="ar-controls">
                <button className="ar-btn">Rotate</button>
                <button className="ar-btn">Zoom</button>
                <button className="ar-btn">Info</button>
              </div>
            </div>
          </div>
          <div className="procedure-details">
            <h3>Procedure Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Type:</strong> {scannedData.serviceType}
              </div>
              <div className="detail-item">
                <strong>Duration:</strong> {scannedData.duration}
              </div>
              <div className="detail-item">
                <strong>Preparation:</strong> {scannedData.preparation}
              </div>
            </div>
            <p className="procedure-description">{scannedData.description}</p>
          </div>
          <button className="btn btn-secondary" onClick={resetScanner}>
            Scan Another QR Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-scanner">
      <div className="scanner-container">
        <h2>QR Code Scanner</h2>
        <p>Scan QR codes to view AR visualizations of medical procedures and services</p>

        {!scannedData && !isScanning && (
          <div className="scanner-idle">
            <div className="qr-placeholder">
              <div className="qr-icon">📱</div>
              <p>Ready to scan</p>
            </div>
            <button className="btn btn-primary" onClick={handleStartScan}>
              Start Scanning
            </button>
          </div>
        )}

        {isScanning && (
          <div className="scanner-active">
            <div className="scanning-animation">
              <div className="scan-line"></div>
              <div className="scan-corners">
                <div className="corner top-left"></div>
                <div className="corner top-right"></div>
                <div className="corner bottom-left"></div>
                <div className="corner bottom-right"></div>
              </div>
            </div>
            <p>Scanning for QR code...</p>
            <div className="loading-spinner"></div>
          </div>
        )}

        {scannedData && (
          <div className="scan-result">
            <div className="result-card">
              <h3>✅ QR Code Detected!</h3>
              <div className="service-info">
                <h4>{scannedData.serviceType}</h4>
                <p><strong>Procedure:</strong> {scannedData.procedure}</p>
                <p><strong>Duration:</strong> {scannedData.duration}</p>
                <p><strong>Preparation:</strong> {scannedData.preparation}</p>
              </div>
              <div className="result-actions">
                <button className="btn btn-primary" onClick={handleViewVisualization}>
                  View AR Visualization
                </button>
                <button className="btn btn-secondary" onClick={resetScanner}>
                  Scan Again
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="scanner-info">
          <h3>How it works</h3>
          <div className="info-steps">
            <div className="step">
              <span className="step-number">1</span>
              <p>Scan the QR code provided by your healthcare provider</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <p>View detailed information about your procedure</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <p>Experience AR visualization to better understand the process</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

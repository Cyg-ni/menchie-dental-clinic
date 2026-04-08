/**
 * Polynomial Linear Regression Model
 * Fits a polynomial curve to data and generates predictions
 */

/**
 * Matrix multiplication helper
 */
const matrixMultiply = (a, b) => {
  const result = Array(a.length).fill(0).map(() => Array(b[0].length).fill(0));
  
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      for (let k = 0; k < b.length; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
};

/**
 * Matrix transpose
 */
const matrixTranspose = (matrix) => {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
};

/**
 * Matrix inverse (using Gaussian elimination for small matrices)
 */
const matrixInverse = (matrix) => {
  const n = matrix.length;
  const m = matrix.map(row => [...row]);
  const identity = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    const pivot = m[i][i];
    if (Math.abs(pivot) < 1e-10) {
      throw new Error('Matrix is singular');
    }
    
    for (let j = i; j < n; j++) {
      m[i][j] /= pivot;
      identity[i][j] /= pivot;
    }
    
    for (let j = i + 1; j < n; j++) {
      const factor = m[j][i];
      for (let k = i; k < n; k++) {
        m[j][k] -= factor * m[i][k];
        identity[j][k] -= factor * identity[i][k];
      }
    }
  }
  
  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i - 1; j >= 0; j--) {
      const factor = m[j][i];
      for (let k = 0; k < n; k++) {
        m[j][k] -= factor * m[i][k];
        identity[j][k] -= factor * identity[i][k];
      }
    }
  }
  
  return identity;
};

/**
 * Fit polynomial regression model
 * @param {Array} xValues - x coordinates (numeric)
 * @param {Array} yValues - y coordinates (actual values)
 * @param {number} degree - polynomial degree (default: 2)
 * @returns {Array} coefficients of the polynomial
 */
export const fitPolynomialRegression = (xValues, yValues, degree = 2) => {
  const n = xValues.length;
  
  if (n < degree + 1) {
    console.warn('Not enough data points for polynomial degree. Using degree 1 instead.');
    degree = 1;
  }
  
  // Build Vandermonde matrix (X matrix) with polynomial features
  const X = xValues.map(x => {
    const row = [];
    for (let d = 0; d <= degree; d++) {
      row.push(Math.pow(x, d));
    }
    return row;
  });
  
  // Convert y values to column matrix
  const Y = yValues.map(y => [y]);
  
  // Calculate coefficients: β = (X^T * X)^-1 * X^T * Y
  const XT = matrixTranspose(X);
  const XTX = matrixMultiply(XT, X);
  const XTY = matrixMultiply(XT, Y);
  
  try {
    const XTX_inv = matrixInverse(XTX);
    const coefficients = matrixMultiply(XTX_inv, XTY);
    return coefficients.map(row => row[0]);
  } catch (error) {
    console.error('Error calculating polynomial regression:', error);
    return null;
  }
};

/**
 * Make prediction using fitted coefficients
 * @param {number} x - input value
 * @param {Array} coefficients - polynomial coefficients
 * @returns {number} predicted value
 */
export const predictValue = (x, coefficients) => {
  if (!coefficients) return null;
  
  let result = 0;
  for (let d = 0; d < coefficients.length; d++) {
    result += coefficients[d] * Math.pow(x, d);
  }
  return result;
};

/**
 * Calculate R-squared (coefficient of determination)
 * @param {Array} actualValues - actual y values
 * @param {Array} predictedValues - predicted y values
 * @returns {number} R-squared value (0-1)
 */
export const calculateRSquared = (actualValues, predictedValues) => {
  const mean = actualValues.reduce((sum, val) => sum + val, 0) / actualValues.length;
  
  const ssRes = actualValues.reduce((sum, actual, i) => {
    return sum + Math.pow(actual - predictedValues[i], 2);
  }, 0);
  
  const ssTot = actualValues.reduce((sum, actual) => {
    return sum + Math.pow(actual - mean, 2);
  }, 0);
  
  return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
};

/**
 * Generate predictions for a range of x values
 * @param {Array} historicalData - array of {x, y} objects with actual data
 * @param {number} futurePeriods - number of periods to predict into the future
 * @param {number} degree - polynomial degree (default: 2)
 * @returns {Object} with coefficients, r2, and predictions
 */
export const generatePolynomialPredictions = (historicalData, futurePeriods = 7, degree = 2) => {
  if (!historicalData || historicalData.length < 2) {
    return null;
  }
  
  // Extract x and y values
  const xValues = historicalData.map((_, i) => i);
  const yValues = historicalData.map(d => d.y);
  
  // Fit model
  const coefficients = fitPolynomialRegression(xValues, yValues, degree);
  
  if (!coefficients) {
    return null;
  }
  
  // Calculate R-squared
  const predictedHistorical = xValues.map(x => predictValue(x, coefficients));
  const r2 = calculateRSquared(yValues, predictedHistorical);
  
  // Generate future predictions
  const maxX = xValues[xValues.length - 1];
  const predictions = [];
  
  for (let i = 1; i <= futurePeriods; i++) {
    const x = maxX + i;
    const predicted = predictValue(x, coefficients);
    predictions.push({
      x,
      predicted: Math.max(0, Math.round(predicted)) // Round to integer
    });
  }
  
  return {
    coefficients,
    r2,
    predictions,
    degree
  };
};

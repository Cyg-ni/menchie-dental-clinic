import { generatePolynomialPredictions } from './polynomialRegression';

export const getMonthDummyData = () => {
  const daysInMonth = 28; // February 2026
  const todayDay = 16;
  const data = [];
  
  // Generate historical data with some realistic trend
  const historicalData = [];
  for (let i = 1; i < todayDay; i++) {
    // Create a slight upward trend with some noise
    const trend = (i / todayDay) * 3; // slight upward trend over month
    const baseValue = 10 + Math.floor(Math.random() * 6) + trend;
    historicalData.push({
      x: i - 1,
      y: baseValue
    });
    
    data.push({
      label: i.toString(),
      actual: baseValue,
      predicted: null,
      isCurrent: false
    });
  }
  
  // Add today's value
  const todayBase = 10 + Math.floor(Math.random() * 6) + (todayDay / daysInMonth) * 3;
  data.push({
    label: todayDay.toString(),
    actual: todayBase,
    predicted: todayBase,
    isCurrent: true
  });
  historicalData.push({
    x: todayDay - 1,
    y: todayBase
  });
  
  // Generate predictions using polynomial regression (degree 2 for quadratic trend)
  const regressionResult = generatePolynomialPredictions(historicalData, daysInMonth - todayDay, 2);
  
  if (regressionResult) {
    console.log(`📊 Polynomial Regression Model (R² = ${regressionResult.r2.toFixed(4)})`);
    
    // Fill in future predictions
    regressionResult.predictions.forEach((pred) => {
      const dayNum = pred.x + 1;
      if (dayNum <= daysInMonth) {
        data.push({
          label: dayNum.toString(),
          actual: null,
          predicted: Math.max(5, Math.round(pred.predicted)), // Round to integer
          isCurrent: false
        });
      }
    });
  } else {
    // Fallback to simple prediction if regression fails
    console.warn('⚠️ Polynomial regression failed, using simple prediction');
    for (let i = todayDay + 1; i <= daysInMonth; i++) {
      data.push({
        label: i.toString(),
        actual: null,
        predicted: Math.round(todayBase + (Math.random() > 0.7 ? 2 : 0)),
        isCurrent: false
      });
    }
  }

  return data;
};

export const getWeekDummyData = () => {
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = 3; // Thursday
  const data = [];
  
  // Generate historical data
  const historicalData = [];
  for (let i = 0; i < todayIndex; i++) {
    const baseValue = 25 + Math.floor(Math.random() * 15);
    historicalData.push({
      x: i,
      y: baseValue
    });
    
    data.push({
      label: daysOfWeek[i],
      actual: baseValue,
      predicted: null,
      isCurrent: false
    });
  }
  
  // Add today
  const todayBase = 25 + Math.floor(Math.random() * 15);
  data.push({
    label: daysOfWeek[todayIndex],
    actual: todayBase,
    predicted: todayBase,
    isCurrent: true
  });
  historicalData.push({
    x: todayIndex,
    y: todayBase
  });
  
  // Generate predictions
  const regressionResult = generatePolynomialPredictions(historicalData, 7 - todayIndex - 1, 1);
  
  if (regressionResult) {
    console.log(`📊 Weekly Polynomial Model (R² = ${regressionResult.r2.toFixed(4)})`);
    
    regressionResult.predictions.forEach((pred) => {
      const dayIndex = Math.round(pred.x);
      if (dayIndex < daysOfWeek.length) {
        data.push({
          label: daysOfWeek[dayIndex],
          actual: null,
          predicted: Math.max(10, Math.round(pred.predicted)), // Round to integer
          isCurrent: false
        });
      }
    });
  } else {
    for (let i = todayIndex + 1; i < daysOfWeek.length; i++) {
      data.push({
        label: daysOfWeek[i],
        actual: null,
        predicted: Math.round(todayBase + (Math.random() > 0.5 ? 3 : 0)),
        isCurrent: false
      });
    }
  }
  
  return data;
};

export const getYearDummyData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = 1; // February (0-indexed)
  const data = [];
  
  // Generate historical data with seasonal trend
  const historicalData = [];
  for (let i = 0; i <= currentMonth; i++) {
    // Winter/early spring typically has higher dental visits
    const seasonalFactor = Math.sin((i / 12) * Math.PI) * 10;
    const baseValue = 300 + seasonalFactor + Math.floor(Math.random() * 30);
    historicalData.push({
      x: i,
      y: baseValue
    });
    
    data.push({
      label: months[i],
      actual: baseValue,
      predicted: null,
      isCurrent: i === currentMonth
    });
  }
  
  // Generate predictions for rest of year
  const regressionResult = generatePolynomialPredictions(historicalData, 12 - currentMonth - 1, 2);
  
  if (regressionResult) {
    console.log(`📊 Yearly Polynomial Model (R² = ${regressionResult.r2.toFixed(4)})`);
    
    regressionResult.predictions.forEach((pred) => {
      const monthIndex = Math.round(pred.x);
      if (monthIndex < months.length) {
        data.push({
          label: months[monthIndex],
          actual: null,
          predicted: Math.max(250, Math.round(pred.predicted)), // Round to integer
          isCurrent: false
        });
      }
    });
  } else {
    for (let i = currentMonth + 1; i < months.length; i++) {
      data.push({
        label: months[i],
        actual: null,
        predicted: Math.round(300 + (Math.random() * 50)),
        isCurrent: false
      });
    }
  }
  
  return data;
};

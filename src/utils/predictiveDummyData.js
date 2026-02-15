export const getMonthDummyData = () => {
  const daysInMonth = 28; // February 2026
  const todayDay = 16;
  const data = [];
  
  // To reach ~350 total:
  // Average per day = 350 / 28 = 12.5
  
  for (let i = 1; i <= daysInMonth; i++) {
    // Generate some random-ish but realistic numbers around 12-13
    const baseValue = 10 + Math.floor(Math.random() * 6); // 10 to 15
    
    if (i < todayDay) {
      data.push({
        label: i.toString(),
        actual: baseValue,
        predicted: null,
        isCurrent: false
      });
    } else if (i === todayDay) {
      data.push({
        label: i.toString(),
        actual: baseValue,
        predicted: baseValue,
        isCurrent: true
      });
    } else {
      data.push({
        label: i.toString(),
        actual: null,
        predicted: baseValue + (Math.random() > 0.7 ? 2 : 0), // slight increase for prediction
        isCurrent: false
      });
    }
  }

  // Adjust last few to ensure sum is exactly 350 if needed, 
  // but usually "around 350" is what's asked.
  // Let's force it to be close.
  const currentSum = data.reduce((acc, curr) => acc + (curr.actual || curr.predicted || 0), 0);
  const diff = 350 - currentSum;
  
  // Add diff to the last item's prediction
  if (data[daysInMonth - 1].predicted !== null) {
    data[daysInMonth - 1].predicted += diff;
  }

  return data;
};

export const getWeekDummyData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = 0; // Assuming Mon for Feb 16, 2026 (it is a Monday)
  
  return days.map((day, i) => ({
    label: day,
    actual: i <= todayIdx ? 12 : null,
    predicted: i >= todayIdx ? 12 + (i > todayIdx ? 2 : 0) : null,
    isCurrent: i === todayIdx
  }));
};

export const getYearDummyData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = 1; // Feb
  
  return months.map((month, i) => ({
    label: month,
    actual: i <= currentMonth ? (i === 1 ? 350 : 320) : null,
    predicted: i >= currentMonth ? (i === 1 ? 350 : 340) : null,
    isCurrent: i === currentMonth
  }));
};

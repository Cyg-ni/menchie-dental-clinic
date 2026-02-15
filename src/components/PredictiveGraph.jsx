import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';

const PredictiveGraph = ({ data, loading, timeframe }) => {
  // data should be an array of { label: string, actual: number, predicted?: number, isCurrent?: boolean }
  
  if (loading) {
    return <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Calculating projections...</div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No data available for prediction.</div>;
  }

  const currentIdx = data.findIndex(d => d.isCurrent);

  return (
    <div style={{ width: '100%', height: '220px', fontSize: '12px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="label" 
            tick={{ fill: '#999', fontSize: 10 }} 
            axisLine={{ stroke: '#e1e1e1' }}
            tickLine={false}
            interval={timeframe === 'month' ? 4 : 0}
          />
          <YAxis 
            tick={{ fill: '#999', fontSize: 10 }} 
            axisLine={{ stroke: '#e1e1e1' }}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          {currentIdx !== -1 && (
            <ReferenceLine x={data[currentIdx].label} stroke="#A78BFA" strokeDasharray="3 3" label={{ value: timeframe === 'year' ? 'This Mo' : 'Today', position: 'top', fill: '#A78BFA', fontSize: 10 }} />
          )}
          
          <Area 
            type="monotone" 
            dataKey="actual" 
            stroke="#A78BFA" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorActual)" 
            name="Actual"
            connectNulls
          />
          <Area 
            type="monotone" 
            dataKey="predicted" 
            stroke="#CBD5E1" 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorPredicted)" 
            name="Predicted"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PredictiveGraph;

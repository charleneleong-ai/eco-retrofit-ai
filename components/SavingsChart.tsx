import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SavingsChartProps {
  current: number;
  projected: number;
  currency: string;
}

const SavingsChart: React.FC<SavingsChartProps> = ({ current, projected, currency }) => {
  const data = [
    {
      name: 'Monthly Cost',
      Current: current,
      Projected: projected,
    },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide width={10} />
          <Tooltip 
            cursor={{fill: 'transparent'}}
            formatter={(value: number) => [`${currency}${value}`, '']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Bar dataKey="Current" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={40} />
          <Bar dataKey="Projected" fill="#10b981" radius={[0, 4, 4, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SavingsChart;
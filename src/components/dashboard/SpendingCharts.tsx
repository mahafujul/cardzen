'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface SpendingChartsProps {
  monthlyData: { label: string; amount: number }[]
  categoryData: { name: string; value: number; color: string }[]
  cardData: { name: string; amount: number }[]
  totalThisMonth: number
}

function INRTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-xl p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

function PieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-xl p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function SpendingCharts({ monthlyData, categoryData, cardData, totalThisMonth }: SpendingChartsProps) {
  return (
    <div className="space-y-6">
      {/* Monthly trend */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h2 className="font-bold text-foreground mb-5">Monthly Spending Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<INRTooltip />} />
            <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        {categoryData.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground mb-5">Category Breakdown (This Month)</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 6).map((cat) => {
                  const pct = totalThisMonth > 0 ? Math.round((cat.value / totalThisMonth) * 100) : 0
                  return (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span className="text-xs text-muted-foreground">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-foreground">{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Card-wise */}
        {cardData.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground mb-5">Spend by Card (This Month)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cardData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<INRTooltip />} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

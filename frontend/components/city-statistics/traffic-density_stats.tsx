import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InforPanel from "./infor-panel";

type PanelFilterProps = {
    filterOptions: string[]
    filterValue?: string
    onFilterChange?: (value: string) => void
}

const data = [
    { time: '0:00', traffic: 30 },
    { time: '1:00', traffic: 15 },
    { time: '2:00', traffic: 20 },
    { time: '3:00', traffic: 20 },
    { time: '4:00', traffic: 30 },
    { time: '5:00', traffic: 35 },
    { time: '6:00', traffic: 25 },
    { time: '7:00', traffic: 30 },
    { time: '8:00', traffic: 45 },
    { time: '9:00', traffic: 40 },
    { time: '10:00', traffic: 35 },
    { time: '11:00', traffic: 50 },
    { time: '12:00', traffic: 55 },
    { time: '13:00', traffic: 60 },
    { time: '14:00', traffic: 48 },
    { time: '15:00', traffic: 70 },
    { time: '16:00', traffic: 95 },
    { time: '17:00', traffic: 99 },
    { time: '18:00', traffic: 110 },
    { time: '19:00', traffic: 85 },
    { time: '20:00', traffic: 75 },
    { time: '21:00', traffic: 65 },
    { time: '22:00', traffic: 60 },
    { time: '23:00', traffic: 55 },
];

export default function TrafficDensityStatisticsAreaChart({ filterOptions, filterValue, onFilterChange }: PanelFilterProps) {
    return (
        <InforPanel
            title="Thống kê lưu lượng xe theo giờ"
            filterOptions={filterOptions}
            filterValue={filterValue}
            onFilterChange={onFilterChange}
            children={<ResponsiveContainer width="100%" height={300}><AreaChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 30 }}>
                <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                        <stop offset="65%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="85%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>

                <CartesianGrid
                    strokeDasharray="0"
                    stroke="#f3f4f6" />
                <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tickMargin={8}
                    label={{ value: 'Giờ', position: 'bottom', offset: 10 }}
                />
                <YAxis
                    label={{ value: 'Lưu lượng (xe/giờ)', angle: -90, position: 'insideLeft' }}
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }} />
                <Tooltip />
                <Area
                    type="linear"
                    dataKey="traffic"
                    stroke="#3b82f6"
                    fill="url(#colorTraffic)"
                    dot={{ fill: '#3b82f6', r: 2 }}
                />
            </AreaChart></ResponsiveContainer>
            } />
    )
}
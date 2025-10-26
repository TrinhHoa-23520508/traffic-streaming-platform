import InforPanel from "./infor-panel";
import { BarChart, Bar, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";

const vehicleData = [
    { district: 'Bình Chánh (huyện)', xeMay: 85, xeOTo: 40, xeDap: 18, xeKhac: 24 },
    { district: 'Bình Tân (quận)', xeMay: 88, xeOTo: 42, xeDap: 18, xeKhac: 24 },
    { district: 'Bình Thạnh (quận)', xeMay: 82, xeOTo: 38, xeDap: 16, xeKhac: 22 },
    { district: 'Cần Giờ (huyện)', xeMay: 38, xeOTo: 12, xeDap: 8, xeKhac: 10 },
    { district: 'Củ Chi (huyện)', xeMay: 50, xeOTo: 22, xeDap: 10, xeKhac: 14 },
    { district: 'Gò Vấp (quận)', xeMay: 95, xeOTo: 40, xeDap: 18, xeKhac: 24 },
    { district: 'Hóc Môn (huyện)', xeMay: 58, xeOTo: 25, xeDap: 12, xeKhac: 15 },
    { district: 'Nhà Bè (huyện)', xeMay: 52, xeOTo: 20, xeDap: 12, xeKhac: 15 },
    { district: 'Phú Nhuận (quận)', xeMay: 70, xeOTo: 28, xeDap: 12, xeKhac: 16 },
    { district: 'Quận 1', xeMay: 65, xeOTo: 28, xeDap: 12, xeKhac: 18 },
    { district: 'Quận 10', xeMay: 75, xeOTo: 32, xeDap: 14, xeKhac: 20 },
    { district: 'Quận 11', xeMay: 76, xeOTo: 30, xeDap: 14, xeKhac: 18 },
    { district: 'Quận 12', xeMay: 90, xeOTo: 35, xeDap: 18, xeKhac: 22 },
    { district: 'Quận 3', xeMay: 70, xeOTo: 30, xeDap: 14, xeKhac: 20 },
    { district: 'Quận 4', xeMay: 60, xeOTo: 24, xeDap: 12, xeKhac: 14 },
    { district: 'Quận 5', xeMay: 68, xeOTo: 30, xeDap: 14, xeKhac: 18 },
    { district: 'Quận 6', xeMay: 72, xeOTo: 32, xeDap: 14, xeKhac: 19 },
    { district: 'Quận 7', xeMay: 78, xeOTo: 36, xeDap: 16, xeKhac: 22 },
    { district: 'Quận 8', xeMay: 62, xeOTo: 26, xeDap: 12, xeKhac: 16 },
    { district: 'Tân Bình (quận)', xeMay: 86, xeOTo: 36, xeDap: 16, xeKhac: 22 },
    { district: 'Tân Phú (quận)', xeMay: 82, xeOTo: 34, xeDap: 16, xeKhac: 20 },
    { district: 'Thành phố Thủ Đức', xeMay: 105, xeOTo: 45, xeDap: 22, xeKhac: 28 },
]

export default function VehicleStatisticsStackChart() {
    return (
        <InforPanel
            title="Thống kê phương tiện theo quận"
            showFilter={false}
            children={
                <div className="w-full overflow-x-auto">
                    <BarChart
                        width={Math.max(1100, vehicleData.length * 40)}
                        height={320}
                        data={vehicleData}
                        barSize={26}
                        barCategoryGap="5%"
                        margin={{ right: 10, left: 10, bottom: 30 }}
                    >
                        <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" />
                        <XAxis
                            dataKey="district"
                            stroke="#9ca3af"
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={96}
                            tickMargin={8}
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Quận/Huyện', position: 'bottom', offset: 10 }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Số xe', angle: -90, position: 'left', offset: 0 }}
                        />
                        <Tooltip labelFormatter={(label) => label} />
                        <Legend verticalAlign="top" height={24} wrapperStyle={{ paddingBottom: 8 }} />
                        <Bar dataKey="xeMay" name="Xe máy" stackId="a" fill="#1d4ed8" />
                        <Bar dataKey="xeOTo" name="Xe ô tô" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="xeDap" name="Xe đạp" stackId="a" fill="#60a5fa" />
                        <Bar dataKey="xeKhac" name="Xe khác" stackId="a" fill="#93c5fd" />
                    </BarChart>
                </div>
            }
        />
    )
}
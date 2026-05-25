import { useState } from "react";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("Tháng này");

  return (
    <div className="px-[16px] space-y-[24px] pt-[16px]">
      
      {/* Tab Navigation */}
      <div className="flex p-1 bg-surface-container-high rounded-xl gap-1">
        {["Tháng này", "Tháng trước"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-[14px] font-medium rounded-lg transition-all ${
              activeTab === tab 
                ? 'bg-surface-container-lowest text-primary shadow-sm' 
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Smart Insight Card */}
      <section className="bg-surface-container-lowest p-[16px] rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] flex gap-[16px] items-start border-l-4 border-error">
        <div className="bg-error-container text-on-error-container p-2 rounded-lg">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
        </div>
        <div className="space-y-[4px]">
          <h3 className="text-[14px] text-on-surface font-bold">Insight thông minh</h3>
          <p className="text-on-surface-variant text-[16px]">
            Chi tiêu cho <span className="font-bold text-error">Mua sắm</span> của bạn tháng này cao hơn <span className="font-bold text-error">24%</span> so với mức trung bình hàng tháng.
          </p>
        </div>
      </section>

      {/* Donut Chart: Category Allocation */}
      <section className="bg-surface-container-lowest p-[16px] rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] space-y-[16px]">
        <div className="flex justify-between items-center">
          <h2 className="text-[24px] font-semibold text-on-surface">Phân bổ danh mục</h2>
          <button className="material-symbols-outlined text-outline">info</button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-[24px] relative">
          {/* SVG Donut Chart */}
          <svg className="w-48 h-48 donut-chart" viewBox="0 0 42 42">
            <circle className="stroke-primary" cx="21" cy="21" fill="transparent" r="15.915" strokeDasharray="40 60" strokeDashoffset="0" strokeWidth="5"></circle>
            <circle className="stroke-secondary-container" cx="21" cy="21" fill="transparent" r="15.915" strokeDasharray="30 70" strokeDashoffset="-40" strokeWidth="5"></circle>
            <circle className="stroke-tertiary-fixed-dim" cx="21" cy="21" fill="transparent" r="15.915" strokeDasharray="15 85" strokeDashoffset="-70" strokeWidth="5"></circle>
            <circle className="stroke-surface-variant" cx="21" cy="21" fill="transparent" r="15.915" strokeDasharray="15 85" strokeDashoffset="-85" strokeWidth="5"></circle>
          </svg>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[12px] font-semibold text-on-surface-variant">Tổng chi</span>
            <span className="text-[24px] font-semibold text-on-surface">15,4Mđ</span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-[16px]">
          <div className="flex items-center gap-[8px]">
            <span className="w-3 h-3 rounded-full bg-primary"></span>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-on-surface-variant">Ăn uống</span>
              <span className="text-[14px] text-on-surface font-bold">40%</span>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-on-surface-variant">Mua sắm</span>
              <span className="text-[14px] text-on-surface font-bold">30%</span>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-on-surface-variant">Di chuyển</span>
              <span className="text-[14px] text-on-surface font-bold">15%</span>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <span className="w-3 h-3 rounded-full bg-surface-variant"></span>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-on-surface-variant">Hóa đơn</span>
              <span className="text-[14px] text-on-surface font-bold">15%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Bar Chart */}
      <section className="bg-surface-container-lowest p-[16px] rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] space-y-[16px]">
        <div className="flex justify-between items-start">
          <div className="space-y-[4px]">
            <h2 className="text-[24px] font-semibold text-on-surface">Tuần này</h2>
            <div className="flex items-center gap-[8px]">
              <span className="text-[28px] font-semibold text-on-surface">5.840.000đ</span>
              <span className="flex items-center text-error text-[12px] font-semibold bg-error-container px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px] leading-none">trending_up</span>
                +15%
              </span>
            </div>
          </div>
          <span className="text-[12px] font-semibold text-outline px-2 py-1 bg-surface-container-high rounded-md">So với tuần trước</span>
        </div>

        <div className="flex items-end justify-between h-48 pt-[24px] relative">
          {/* Bar 1 */}
          <div className="flex flex-col items-center gap-[8px] w-12 z-10">
            <div className="w-full bg-surface-container-high rounded-t-lg h-32 relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-outline-variant h-full animate-grow-y"></div>
            </div>
            <span className="text-[12px] font-semibold text-on-surface-variant">Tuần trước</span>
          </div>
          
          {/* Bar 2 (Active) */}
          <div className="flex flex-col items-center gap-[8px] w-12 z-10">
            <div className="w-full bg-surface-container-high rounded-t-lg h-40 relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-primary h-full animate-grow-y"></div>
            </div>
            <span className="text-[12px] font-bold text-primary">Tuần này</span>
          </div>

          {/* Grid Lines background */}
          <div className="absolute inset-x-[16px] h-40 flex flex-col justify-between pointer-events-none opacity-20 border-b border-outline-variant">
            <div className="border-t border-outline"></div>
            <div className="border-t border-outline"></div>
            <div className="border-t border-outline"></div>
            <div className="border-t border-outline"></div>
          </div>
        </div>
      </section>

      {/* Detailed List Action */}
      <button className="w-full bg-primary py-[24px] rounded-xl text-on-primary text-[24px] font-semibold shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-[8px]">
        Xem báo cáo chi tiết
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>
  );
}

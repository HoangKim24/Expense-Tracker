import { useOutletContext } from "react-router-dom";

export default function Dashboard() {
  const { setIsQuickAddOpen } = useOutletContext<{ setIsQuickAddOpen: (v: boolean) => void }>();

  return (
    <div className="px-[16px] mt-[16px] space-y-[24px]">
      {/* Action Buttons Cluster */}
      <div className="flex gap-[16px]">
        <button 
          onClick={() => setIsQuickAddOpen(true)}
          className="flex-1 bg-primary text-on-primary py-[16px] px-[24px] rounded-xl flex items-center justify-center gap-2 text-[14px] font-medium active:scale-95 duration-200 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Thêm thủ công
        </button>
        <button className="flex-1 bg-surface-container-high text-primary py-[16px] px-[24px] rounded-xl flex items-center justify-center gap-2 text-[14px] font-medium active:scale-95 duration-200">
          <span className="material-symbols-outlined">analytics</span>
          Phân tích
        </button>
      </div>

      {/* Weekly Spending Chart Section */}
      <section className="bg-surface-container-lowest rounded-xl p-[16px] shadow-[0px_2px_8px_rgba(0,82,204,0.05)]">
        <div className="flex justify-between items-start mb-[16px]">
          <div>
            <h2 className="text-[12px] font-semibold text-outline uppercase tracking-wider">Tổng chi tiêu tuần này</h2>
            <p className="text-[28px] font-bold text-primary mt-1">14.580.000đ</p>
          </div>
          <div className="bg-tertiary-container/10 text-tertiary px-2 py-1 rounded-lg text-xs font-bold">
            -12% vs tuần trước
          </div>
        </div>

        {/* Custom Column Chart */}
        <div className="flex items-end justify-between h-48 px-[4px] gap-[8px]">
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-secondary-container/20 rounded-t-lg h-[40%] transition-all duration-500 group-hover:bg-secondary-container"></div>
            <span className="text-[10px] font-semibold text-outline mt-1">T2</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-secondary-container/20 rounded-t-lg h-[65%] transition-all duration-500 group-hover:bg-secondary-container"></div>
            <span className="text-[10px] font-semibold text-outline mt-1">T3</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-secondary-container/20 rounded-t-lg h-[90%] transition-all duration-500 group-hover:bg-secondary-container"></div>
            <span className="text-[10px] font-semibold text-outline mt-1">T4</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-primary-container rounded-t-lg h-[55%] animate-pulse"></div>
            <span className="text-[10px] font-bold text-primary mt-1">H.Nay</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-secondary-container/10 rounded-t-lg h-[30%] border-t border-dashed border-outline-variant"></div>
            <span className="text-[10px] font-semibold text-outline mt-1">T6</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-secondary-container/10 rounded-t-lg h-[20%] border-t border-dashed border-outline-variant"></div>
            <span className="text-[10px] font-semibold text-outline mt-1">T7</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-[4px] group">
            <div className="w-full bg-secondary-container/10 rounded-t-lg h-[15%] border-t border-dashed border-outline-variant"></div>
            <span className="text-[10px] font-semibold text-outline mt-1">CN</span>
          </div>
        </div>
      </section>

      {/* Savings Goals Section */}
      <section className="space-y-[16px]">
        <div className="flex justify-between items-center">
          <h3 className="text-[24px] font-semibold text-on-background">Mục tiêu tiết kiệm</h3>
          <button className="text-primary text-[14px] font-medium">Xem tất cả</button>
        </div>
        <div className="flex gap-[16px] overflow-x-auto no-scrollbar pb-[4px]">
          {/* Goal 1 */}
          <div className="min-w-[280px] bg-primary text-on-primary rounded-xl p-[16px] shadow-lg">
            <div className="flex justify-between items-start mb-[24px]">
              <div className="bg-on-primary/20 p-2 rounded-lg">
                <span className="material-symbols-outlined text-on-primary">flight</span>
              </div>
              <span className="text-[12px] font-semibold bg-on-primary/10 px-2 py-1 rounded">65%</span>
            </div>
            <h4 className="text-[14px] font-bold mb-1">Du lịch Nhật Bản</h4>
            <p className="text-xs text-on-primary-container mb-[16px]">32.500.000đ / 50.000.000đ</p>
            <div className="w-full bg-on-primary/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-on-primary h-full rounded-full" style={{ width: "65%" }}></div>
            </div>
          </div>
          
          {/* Goal 2 */}
          <div className="min-w-[280px] bg-surface-container-high rounded-xl p-[16px] border border-outline-variant/30 shadow-sm">
            <div className="flex justify-between items-start mb-[24px]">
              <div className="bg-secondary/10 p-2 rounded-lg text-secondary">
                <span className="material-symbols-outlined">laptop_mac</span>
              </div>
              <span className="text-[12px] font-semibold text-secondary px-2 py-1 rounded">30%</span>
            </div>
            <h4 className="text-[14px] font-bold text-on-background mb-1">MacBook Pro M3</h4>
            <p className="text-xs text-on-surface-variant mb-[16px]">15.000.000đ / 50.000.000đ</p>
            <div className="w-full bg-outline-variant h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: "30%" }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Transactions Section */}
      <section className="space-y-[16px]">
        <div className="flex justify-between items-center">
          <h3 className="text-[24px] font-semibold text-on-background">Giao dịch gần đây</h3>
          <button className="text-primary text-[14px] font-medium">Xem tất cả</button>
        </div>
        <div className="space-y-[8px]">
          {/* Transaction 1 */}
          <div className="flex items-center justify-between p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-[16px]">
              <div className="w-12 h-12 rounded-full bg-error-container/20 flex items-center justify-center text-error">
                <span className="material-symbols-outlined">home</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-on-background">Tiền thuê nhà</p>
                <p className="text-xs text-outline mt-1">Hôm qua • 18:30</p>
              </div>
            </div>
            <p className="text-[14px] font-medium text-error">-8.500.000đ</p>
          </div>
          {/* Transaction 2 */}
          <div className="flex items-center justify-between p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-[16px]">
              <div className="w-12 h-12 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">restaurant</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-on-background">Ăn uống</p>
                <p className="text-xs text-outline mt-1">Hôm nay • 12:15</p>
              </div>
            </div>
            <p className="text-[14px] font-medium text-error">-250.000đ</p>
          </div>
          {/* Transaction 3 */}
          <div className="flex items-center justify-between p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-[16px]">
              <div className="w-12 h-12 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">shopping_bag</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-on-background">Mua sắm</p>
                <p className="text-xs text-outline mt-1">Hôm nay • 09:45</p>
              </div>
            </div>
            <p className="text-[14px] font-medium text-error">-1.200.000đ</p>
          </div>
        </div>
      </section>
    </div>
  );
}

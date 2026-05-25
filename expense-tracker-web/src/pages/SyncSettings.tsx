import { useState } from "react";

export default function SyncSettings() {
  const [faqs, setFaqs] = useState({
    faq1: false,
    faq2: false,
    faq3: false,
    faq4: false,
  });

  const toggleFaq = (key: keyof typeof faqs) => {
    setFaqs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="px-[16px] py-[32px] space-y-[32px]">
      
      {/* Hero Section */}
      <section className="grid grid-cols-1 gap-[32px] items-center mb-[32px]">
        <div>
          <h2 className="text-[28px] font-semibold text-on-surface mb-[16px]">
            Tự động hóa tài chính với Gmail
          </h2>
          <p className="text-[18px] text-on-surface-variant mb-[32px]">
            Kết nối tài khoản Gmail để FinTrack tự động đồng bộ hóa các hóa đơn điện tử, giúp bạn quản lý chi tiêu mà không cần nhập liệu thủ công.
          </p>

          {/* Value Propositions */}
          <div className="space-y-[16px] mb-[32px]">
            <div className="flex items-start gap-[16px] p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-surface-container-high">
              <div className="bg-primary-container/10 p-[8px] rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface mb-1">Bảo mật tuyệt đối</h3>
                <p className="text-[12px] font-semibold text-outline">Mã hóa chuẩn ngân hàng, chúng tôi chỉ đọc các email có chứa từ khóa hóa đơn.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-[16px] p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-surface-container-high">
              <div className="bg-secondary-container/10 p-[8px] rounded-lg">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>document_scanner</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface mb-1">Tự động quét hóa đơn</h3>
                <p className="text-[12px] font-semibold text-outline">Phát hiện và phân loại chi tiêu từ Grab, Shopee, Tiki và các dịch vụ khác ngay lập tức.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-[16px] p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-surface-container-high">
              <div className="bg-tertiary-container/10 p-[8px] rounded-lg">
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface mb-1">Quyền riêng tư tối đa</h3>
                <p className="text-[12px] font-semibold text-outline">Bạn có toàn quyền kiểm soát dữ liệu. Chúng tôi không bao giờ chia sẻ thông tin của bạn.</p>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <button className="w-full flex items-center justify-center gap-[16px] bg-primary hover:bg-primary-container text-on-primary px-[32px] py-[16px] rounded-xl text-[14px] font-medium transition-all active:scale-95 shadow-lg">
            <img alt="Google Logo" className="w-6 h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn4s17AZcAa25eR7L9LTr8kbuGLc3k2XaSXqlnQUfK4Nlcv1udgy74z4HetlkBZy_cS7nlXjv2cBqBLQ8NXcqp84xxTgn99knjLDzg5O2d6D4gVoD5baVU0ev5EX77ScReJHg7BQ7RKYF6qHVT9kdZ6nQWoF6r0cpjMJq4w8SU6tBQaM1oly_jbE0tEp2OWGrrTJQMAoRPff487rHKeOlCfvxCyCHgviszYQ9qClUgIL0j8pFXIz2LE4VgmYd8XRDZI6iEb9QioQM"/>
            Kết nối với Gmail
          </button>
        </div>
      </section>

      {/* Gmail Config Settings (Auto-generated based on MD3 design) */}
      <section className="bg-surface-container-lowest p-[24px] rounded-[24px] shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-outline-variant space-y-[16px]">
        <h2 className="text-[24px] font-semibold text-on-surface">Cấu hình Đồng bộ</h2>
        <div className="space-y-[16px]">
          <div>
            <label className="block text-[12px] font-bold text-on-surface-variant uppercase mb-2">Tài khoản Gmail</label>
            <input type="email" placeholder="your-email@gmail.com" className="w-full bg-surface-container px-[16px] py-[12px] rounded-xl border-0 focus:ring-2 focus:ring-primary text-[14px] text-on-surface" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-on-surface-variant uppercase mb-2">App Password</label>
            <input type="password" placeholder="••••••••••••••••" className="w-full bg-surface-container px-[16px] py-[12px] rounded-xl border-0 focus:ring-2 focus:ring-primary text-[14px] text-on-surface" />
          </div>
          <button className="w-full bg-secondary-container text-on-secondary-container font-bold py-[12px] rounded-xl flex justify-center items-center gap-[8px] hover:bg-secondary-fixed transition-colors mt-[8px]">
            <span className="material-symbols-outlined">save</span>
            Lưu thiết lập
          </button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mt-[32px]">
        <h2 className="text-[24px] font-semibold text-on-surface mb-[24px]">Câu hỏi thường gặp (FAQ)</h2>
        <div className="space-y-[16px]">
          
          <div 
            className={`bg-surface-container-lowest p-[24px] rounded-xl border ${faqs.faq1 ? 'border-primary' : 'border-outline-variant'} transition-colors cursor-pointer group`} 
            onClick={() => toggleFaq('faq1')}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-[14px] font-medium text-on-surface group-hover:text-primary">Dữ liệu của tôi có an toàn không?</h4>
              <span className="material-symbols-outlined text-outline">expand_more</span>
            </div>
            {faqs.faq1 && (
              <p className="mt-[16px] text-[16px] text-on-surface-variant">
                FinTrack sử dụng OAuth 2.0 - chuẩn bảo mật cao nhất của Google. Chúng tôi chỉ yêu cầu quyền truy cập vào các email được xác định là hóa đơn. Mật khẩu Gmail của bạn không bao giờ được lưu trữ.
              </p>
            )}
          </div>

          <div 
            className={`bg-surface-container-lowest p-[24px] rounded-xl border ${faqs.faq2 ? 'border-primary' : 'border-outline-variant'} transition-colors cursor-pointer group`} 
            onClick={() => toggleFaq('faq2')}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-[14px] font-medium text-on-surface group-hover:text-primary">Hỗ trợ các loại hóa đơn nào?</h4>
              <span className="material-symbols-outlined text-outline">expand_more</span>
            </div>
            {faqs.faq2 && (
              <p className="mt-[16px] text-[16px] text-on-surface-variant">
                Hiện tại chúng tôi hỗ trợ hóa đơn từ Grab, Shopee, Lazada, Tiki, Be, Gojek, Spotify, Netflix và hơn 100 nhà cung cấp dịch vụ tiện ích (Điện, Nước, Internet) tại Việt Nam.
              </p>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}

import { useState } from "react";

export default function SyncSettings() {
  const [faqs, setFaqs] = useState({
    faq1: false,
    faq2: false,
  });

  const toggleFaq = (key: keyof typeof faqs) => {
    setFaqs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="px-[16px] py-[32px] space-y-[32px]">
      <section className="grid grid-cols-1 gap-[32px] items-center mb-[32px]">
        <div>
          <h2 className="text-[28px] font-semibold text-on-surface mb-[16px]">
            Tu dong hoa tai chinh voi Gmail
          </h2>
          <p className="text-[18px] text-on-surface-variant mb-[32px]">
            Ket noi Gmail de FinTrack tu dong dong bo thong bao giao dich tu Techcombank, MoMo, Timo va Cake.
          </p>

          <div className="space-y-[16px] mb-[32px]">
            <div className="flex items-start gap-[16px] p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-surface-container-high">
              <div className="bg-primary-container/10 p-[8px] rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface mb-1">Bao mat du lieu ca nhan</h3>
                <p className="text-[12px] font-semibold text-outline">Noi dung email sync log duoc ma hoa trong co so du lieu.</p>
              </div>
            </div>

            <div className="flex items-start gap-[16px] p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-surface-container-high">
              <div className="bg-secondary-container/10 p-[8px] rounded-lg">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>document_scanner</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface mb-1">Tap trung dung nguon can thiet</h3>
                <p className="text-[12px] font-semibold text-outline">Parser hien chi nhan dien Techcombank, MoMo, Timo va Cake.</p>
              </div>
            </div>

            <div className="flex items-start gap-[16px] p-[16px] bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-surface-container-high">
              <div className="bg-tertiary-container/10 p-[8px] rounded-lg">
                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface mb-1">App ca nhan mot nguoi dung</h3>
                <p className="text-[12px] font-semibold text-outline">Khong them user/auth luc nay de uu tien chuc nang sync va quan ly chi tieu.</p>
              </div>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-[16px] bg-primary hover:bg-primary-container text-on-primary px-[32px] py-[16px] rounded-xl text-[14px] font-medium transition-all active:scale-95 shadow-lg">
            <img alt="Google Logo" className="w-6 h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn4s17AZcAa25eR7L9LTr8kbuGLc3k2XaSXqlnQUfK4Nlcv1udgy74z4HetlkBZy_cS7nlXjv2cBqBLQ8NXcqp84xxTgn99knjLDzg5O2d6D4gVoD5baVU0ev5EX77ScReJHg7BQ7RKYF6qHVT9kdZ6nQWoF6r0cpjMJq4w8SU6tBQaM1oly_jbE0tEp2OWGrrTJQMAoRPff487rHKeOlCfvxCyCHgviszYQ9qClUgIL0j8pFXIz2LE4VgmYd8XRDZI6iEb9QioQM"/>
            Ket noi voi Gmail
          </button>
        </div>
      </section>

      <section className="bg-surface-container-lowest p-[24px] rounded-[24px] shadow-[0px_2px_8px_rgba(0,82,204,0.05)] border border-outline-variant space-y-[16px]">
        <h2 className="text-[24px] font-semibold text-on-surface">Cau hinh dong bo</h2>
        <div className="space-y-[16px]">
          <div>
            <label className="block text-[12px] font-bold text-on-surface-variant uppercase mb-2">Tai khoan Gmail</label>
            <input type="email" placeholder="your-email@gmail.com" className="w-full bg-surface-container px-[16px] py-[12px] rounded-xl border-0 focus:ring-2 focus:ring-primary text-[14px] text-on-surface" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-on-surface-variant uppercase mb-2">App Password</label>
            <input type="password" placeholder="••••••••••••••••" className="w-full bg-surface-container px-[16px] py-[12px] rounded-xl border-0 focus:ring-2 focus:ring-primary text-[14px] text-on-surface" />
          </div>
          <button className="w-full bg-secondary-container text-on-secondary-container font-bold py-[12px] rounded-xl flex justify-center items-center gap-[8px] hover:bg-secondary-fixed transition-colors mt-[8px]">
            <span className="material-symbols-outlined">save</span>
            Luu thiet lap
          </button>
        </div>
      </section>

      <section className="mt-[32px]">
        <h2 className="text-[24px] font-semibold text-on-surface mb-[24px]">Cau hoi thuong gap</h2>
        <div className="space-y-[16px]">
          <div
            className={`bg-surface-container-lowest p-[24px] rounded-xl border ${faqs.faq1 ? "border-primary" : "border-outline-variant"} transition-colors cursor-pointer group`}
            onClick={() => toggleFaq("faq1")}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-[14px] font-medium text-on-surface group-hover:text-primary">Du lieu cua toi co an toan khong?</h4>
              <span className="material-symbols-outlined text-outline">expand_more</span>
            </div>
            {faqs.faq1 && (
              <p className="mt-[16px] text-[16px] text-on-surface-variant">
                Email sync log duoc ma hoa truoc khi luu. Gmail App Password nen duoc cau hinh qua bien moi truong khi chay production.
              </p>
            )}
          </div>

          <div
            className={`bg-surface-container-lowest p-[24px] rounded-xl border ${faqs.faq2 ? "border-primary" : "border-outline-variant"} transition-colors cursor-pointer group`}
            onClick={() => toggleFaq("faq2")}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-[14px] font-medium text-on-surface group-hover:text-primary">Ho tro nguon nao?</h4>
              <span className="material-symbols-outlined text-outline">expand_more</span>
            </div>
            {faqs.faq2 && (
              <p className="mt-[16px] text-[16px] text-on-surface-variant">
                Hien tai app tap trung vao 4 nguon ca nhan cua ban: Techcombank, MoMo, Timo va Cake.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

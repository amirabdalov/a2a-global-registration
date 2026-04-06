import { useState } from "react";
import { MessageCircle, X, Phone } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

const SUPPORT_PHONE = "+13026210214";
const TELEGRAM_URL = `https://t.me/${SUPPORT_PHONE.replace("+", "")}`;
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE.replace("+", "")}`;

export function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50" data-testid="support-fab">
      {/* Expanded menu */}
      {open && (
        <div className="mb-3 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-64 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-900">Need Help?</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Reach our support team via:</p>
          <div className="space-y-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
              data-testid="support-whatsapp"
            >
              <SiWhatsapp className="w-5 h-5 text-[#25D366]" />
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                <p className="text-[10px] text-gray-500">{SUPPORT_PHONE}</p>
              </div>
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9]/20 transition-colors"
              data-testid="support-telegram"
            >
              <SiTelegram className="w-5 h-5 text-[#229ED9]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Telegram</p>
                <p className="text-[10px] text-gray-500">{SUPPORT_PHONE}</p>
              </div>
            </a>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              data-testid="support-call"
            >
              <Phone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Call Us</p>
                <p className="text-[10px] text-gray-500">{SUPPORT_PHONE}</p>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}
        data-testid="button-support-fab"
        aria-label="Support"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}

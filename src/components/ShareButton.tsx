import React, { useState, useRef, useEffect } from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  TelegramIcon,
  LinkedinIcon
} from 'react-share';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title?: string;
  description?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ 
  url, 
  title = 'Play Sjaus - The Traditional Faeroese Card Game Online',
  description = 'Experience the authentic Faeroese card game of Sjaus in this beautiful digital adaptation. Play with friends, improve your skills, and become a master of this traditional game.'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleShare}
        className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 z-50 bg-[#1E293B] rounded-lg shadow-xl p-4 min-w-[200px] animate-fade-in"
          style={{ top: '100%' }}
        >
          <div className="flex flex-col gap-3">
            <FacebookShareButton url={url} quote={description} className="w-full">
              <div className="flex items-center gap-3 hover:bg-[#0F172A] p-2 rounded-lg transition-all duration-200">
                <FacebookIcon size={32} round />
                <span className="text-white">Facebook</span>
              </div>
            </FacebookShareButton>

            <TwitterShareButton url={url} title={description} className="w-full">
              <div className="flex items-center gap-3 hover:bg-[#0F172A] p-2 rounded-lg transition-all duration-200">
                <TwitterIcon size={32} round />
                <span className="text-white">Twitter</span>
              </div>
            </TwitterShareButton>

            <WhatsappShareButton url={url} title={description} className="w-full">
              <div className="flex items-center gap-3 hover:bg-[#0F172A] p-2 rounded-lg transition-all duration-200">
                <WhatsappIcon size={32} round />
                <span className="text-white">WhatsApp</span>
              </div>
            </WhatsappShareButton>

            <TelegramShareButton url={url} title={description} className="w-full">
              <div className="flex items-center gap-3 hover:bg-[#0F172A] p-2 rounded-lg transition-all duration-200">
                <TelegramIcon size={32} round />
                <span className="text-white">Telegram</span>
              </div>
            </TelegramShareButton>

            <LinkedinShareButton url={url} title={title} summary={description} className="w-full">
              <div className="flex items-center gap-3 hover:bg-[#0F172A] p-2 rounded-lg transition-all duration-200">
                <LinkedinIcon size={32} round />
                <span className="text-white">LinkedIn</span>
              </div>
            </LinkedinShareButton>
          </div>

          <div className="mt-3 pt-3 border-t border-[#334155]">
            <div className="flex items-center gap-2 bg-[#0F172A] rounded-lg p-2">
              <input
                type="text"
                value={url}
                readOnly
                className="bg-transparent text-white text-sm flex-1 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  setIsOpen(false);
                }}
                className="text-sm text-[#D4AF37] hover:text-[#E9C85D] whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
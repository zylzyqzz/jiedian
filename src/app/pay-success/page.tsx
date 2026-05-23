'use client';
import { useState } from 'react';

export default function PaySuccess() {
  const [orderNo] = useState('NODE' + Math.floor(Math.random() * 8999999 + 1000000));
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-blue-600">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">✓</div>
        <h2 className="text-xl font-bold text-neutral-100 mb-1">支付成功 / 额度已扣</h2>
        <p className="text-[11px] text-neutral-400 mb-5">订单已自动生成，请联系平台官方客服核对发货</p>

        <div className="bg-black border border-white/5 rounded-xl p-3 text-left mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-neutral-500">流水订单号（提货唯一凭证）:</span>
            <button onClick={handleCopy} className="text-[10px] text-blue-400 hover:underline">
              {copied ? '已复制 ✔' : '一键复制'}
            </button>
          </div>
          <div className="font-mono text-xs text-white tracking-wider select-all">{orderNo}</div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
            <span className="text-neutral-400">专属微信客服:</span>
            <span className="text-white font-mono font-medium select-all">NodeHub_VIP_01</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
            <span className="text-neutral-400">Telegram 官方电报:</span>
            <span className="text-blue-400 font-mono font-medium select-all">@nodehub_service_bot</span>
          </div>
        </div>

        <div className="mt-5 text-[10px] text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 leading-relaxed text-left">
          ⚠️ 提示：添加客服微信或TG后，直接发送上面复制的订单号。客服核对完毕后将立即在线为您交付配置节点，别无其它繁琐操作。
        </div>
      </div>
    </div>
  );
}

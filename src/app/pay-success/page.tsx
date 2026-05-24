'use client';
import { useEffect, useState } from 'react';

export default function PaySuccessPage() {
  const [orderNo, setOrderNo] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setOrderNo(p.get('out_trade_no') || '');
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold">支付成功</h2>
        <p className="text-sm text-neutral-400">
          {orderNo ? `订单号：${orderNo}` : '支付已完成，系统正在处理'}
        </p>
        <p className="text-xs text-neutral-500">
          请返回首页查看订单状态
        </p>
        <a
          href="/"
          className="block w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NodeHub — 全球高质量节点服务",
  description: "稳定 · 高速 · 低延迟 · 多地区部署。覆盖亚洲、北美、欧洲核心节点，BGP 多线接入，即时自动开通。",
  keywords: ["VPS", "节点", "CN2 GIA", "Trojan", "VMess", "代理"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#050505] text-white antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NodeHub - 全球高质量节点服务",
  description: "稳定 · 高速 · 低延迟 · 多地区部署",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#050505] text-white font-sans antialiased selection:bg-blue-600">
        {children}
      </body>
    </html>
  );
}

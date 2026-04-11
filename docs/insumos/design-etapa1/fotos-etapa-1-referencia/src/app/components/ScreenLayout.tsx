import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function ScreenLayout({ children, showNav = true, showHeader = true }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {showHeader && <Header />}
      <div className={`flex-1 px-4 py-4 ${showNav ? "pb-20" : ""}`}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

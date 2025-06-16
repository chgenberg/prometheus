"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Home,
  Users,
  Database,
  Shield,
  GitBranch,
  BarChart3,
  MessageSquare,
  Eye,
  Crosshair,
  GitCommit,
  Bot,
  Flame,
  Cpu,
  Settings,
  Bell
} from 'lucide-react';
import { ReactNode } from 'react';

// Re-defining NavItem as it was likely in this file before corruption
const NavItem = ({ href, children, icon: Icon }: { href: string, children: ReactNode, icon: React.ElementType }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} legacyBehavior passHref>
            <a
                className={`flex items-center px-3 py-2 text-gray-300 rounded-md text-sm font-medium transition-colors
                ${isActive
                    ? 'bg-gray-700 text-white'
                    : 'hover:bg-gray-700/50 hover:text-white'
                }`}
            >
                <Icon className="mr-3 h-5 w-5" />
                <span>{children}</span>
            </a>
        </Link>
    );
};


export function Sidebar() {
  return (
    <div className="hidden border-r bg-gray-900 text-white md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[60px] items-center border-b border-gray-700 px-6">
          <Link className="flex items-center gap-2 font-semibold text-white" href="/">
            <Flame className="h-6 w-6 text-purple-400" />
            <span>PROMETHEUS</span>
          </Link>
          <Button className="ml-auto h-8 w-8" size="icon" variant="outline">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            <NavItem icon={Home} href="/">
              Dashboard
            </NavItem>
            <NavItem icon={Shield} href="/security-dashboard">
              Security Overview
            </NavItem>
             <NavItem icon={Bot} href="/god-mode">
              GOD Mode
            </NavItem>
            <NavItem icon={Cpu} href="/beast-mode">
              Beast Mode
            </NavItem>
            {/* Add other links back if remembered or discovered */}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Contact support for any issues with the security dashboard.
              </p>
              <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Sidebar; 
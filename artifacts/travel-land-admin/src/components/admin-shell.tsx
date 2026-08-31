import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import {
  Activity, Archive, Bell, BookOpen, Building2, ChevronDown, CircleHelp,
  ClipboardList, Compass, CreditCard, Database, DoorOpen, FileClock,
  LayoutDashboard, LogOut, Map, Menu, MessageSquare, PanelLeftClose,
  Settings, ShieldCheck, Store, Users, X
} from 'lucide-react';
import { useState } from 'react';

const primaryNav = [
  { href: '/dashboard', label: 'Command center', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/vendors', label: 'Vendors', icon: Store },
  { href: '/hotels', label: 'Hotels', icon: Building2 },
  { href: '/rooms', label: 'Rooms & inventory', icon: DoorOpen },
  { href: '/destinations', label: 'Destinations', icon: Compass },
  { href: '/places', label: 'Places', icon: Map },
  { href: '/events', label: 'Events', icon: BookOpen },
  { href: '/properties', label: 'Land & properties', icon: Archive },
  { href: '/bookings', label: 'Bookings', icon: ClipboardList },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/reviews', label: 'Reviews', icon: MessageSquare },
];
const secondaryNav = [
  { href: '/notifications', label: 'Announcements', icon: Bell },
  { href: '/content', label: 'Featured content', icon: Activity },
  { href: '/audit-logs', label: 'Audit history', icon: FileClock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navItem = (item: typeof primaryNav[number]) => {
    const Icon = item.icon;
    const active = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
        onClick={() => setOpen(false)}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] shadow-[inset_3px_0_0_hsl(var(--accent))]' : 'text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent)/.65)] hover:text-[hsl(var(--sidebar-foreground))]'} ${collapsed ? 'justify-center px-2' : ''}`}>
        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.label === 'Reviews' && <span className="ml-auto rounded-full bg-[hsl(var(--accent))] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">queue</span>}
      </Link>
    );
  };
  return (
    <div className="app-shell min-h-[100dvh] text-foreground">
      <div className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-sidebar transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'md:w-[76px]' : ''}`}>
        <div className={`flex h-[76px] items-center border-b border-sidebar-border px-5 ${collapsed ? 'justify-center px-2' : 'justify-between'}`}>
          <Link href="/dashboard" data-testid="link-brand" className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[0_5px_14px_hsl(var(--accent)/.18)]">
              <ShieldCheck size={19} strokeWidth={2.4} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[hsl(151_30%_58%)] ring-2 ring-sidebar" />
            </span>
            {!collapsed && <span><strong className="block font-semibold tracking-[-0.02em] text-sidebar-foreground">Northstar</strong><small className="block text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">operations</small></span>}
          </Link>
          {!collapsed && <button aria-label="Close navigation" data-testid="button-close-nav" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"><X size={18} /></button>}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className={`eyebrow mb-2 px-3 text-sidebar-foreground/35 ${collapsed ? 'text-center px-0' : ''}`}>{collapsed ? '•' : 'Workspace'}</div>
          <nav className="space-y-1">{primaryNav.map(navItem)}</nav>
          <div className={`my-5 border-t border-sidebar-border ${collapsed ? 'mx-2' : ''}`} />
          <div className={`eyebrow mb-2 px-3 text-sidebar-foreground/35 ${collapsed ? 'text-center px-0' : ''}`}>{collapsed ? '•' : 'Governance'}</div>
          <nav className="space-y-1">{secondaryNav.map(navItem)}</nav>
        </div>
         <div className="border-t border-sidebar-border p-3">
           {!collapsed && <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/65 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(199_55%_31%)] text-xs font-semibold text-sidebar-foreground"><ShieldCheck size={15} /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-sidebar-foreground">Signed-in administrator</p><p className="truncate text-[11px] text-sidebar-foreground/45">Platform access</p></div><ChevronDown size={14} className="ml-auto text-sidebar-foreground/40" /></div>}
          <button onClick={() => void signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })} data-testid="button-sign-out" className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground ${collapsed ? 'justify-center px-2' : ''}`}><LogOut size={16} />{!collapsed && 'Sign out'}</button>
        </div>
      </div>
      {open && <button aria-label="Close menu overlay" data-testid="button-menu-overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.26)] md:hidden" />}
      <div className={`min-h-[100dvh] transition-[padding] duration-300 md:pl-[260px] ${collapsed ? 'md:pl-[76px]' : ''}`}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3"><button aria-label="Open navigation" data-testid="button-open-nav" onClick={() => setOpen(true)} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted md:hidden"><Menu size={18} /></button><button aria-label="Collapse navigation" data-testid="button-collapse-nav" onClick={() => setCollapsed(!collapsed)} className="hidden rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted md:block"><PanelLeftClose size={18} className={collapsed ? 'rotate-180' : ''} /></button><div className="hidden h-5 w-px bg-border md:block" /><p className="text-xs text-muted-foreground">Secure workspace <span className="mx-1 text-border">/</span> <span className="font-medium text-foreground">{primaryNav.concat(secondaryNav).find((item) => location.startsWith(item.href))?.label ?? 'Overview'}</span></p></div>
          <div className="flex items-center gap-2"><button data-testid="button-help" className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted sm:block" title="Help"><CircleHelp size={18} /></button>{import.meta.env.VITE_DEMO_MODE === 'true' ? <span data-testid="demo-mode-badge" className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-2.5 py-1.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />Demo Data</span> : null}<div className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(151_30%_43%)]" /><span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">Systems nominal</span></div></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 md:py-9">{children}</main>
      </div>
    </div>
  );
}
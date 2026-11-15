import { Link } from '@tanstack/react-router';
import { Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStartTour } from '@/components/QuickStartTour';
const LINKS = [{ to: '/', label: 'Overview' }, { to: '/planner', label: 'Planner' }, { to: '/how-it-works', label: 'How it works' }, { to: '/models', label: 'Models' }, { to: '/methods', label: 'Methods' }] as const;
export function NavBar() {
  return <header className="sticky top-0 z-50 border-b border-hairline bg-background/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
    <Link to="/" className="flex items-center gap-3"><Moon className="size-6 text-primary" /><span className="font-display text-base font-semibold">Lunar South Pole<span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">/ Analysis</span></span></Link>
    <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center gap-1 sm:w-auto">{LINKS.map(l => <Button key={l.to} variant="ghost" size="sm" asChild className="px-2 md:px-3"><Link to={l.to} activeOptions={{ exact: l.to === '/' }} className="text-muted-foreground" activeProps={{ className: 'bg-secondary text-primary' }}>{l.label}</Link></Button>)}<QuickStartTour /></nav>
  </div></header>;
}

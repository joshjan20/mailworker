import { NavLink, Route, Routes } from 'react-router-dom'
import { LayoutDashboard, Mail, Ship } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import InboxPage from './pages/InboxPage'
import ShipmentDetailPage from './pages/ShipmentDetailPage'

function NavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-white/10 text-[var(--sidebar-text-active)]'
            : 'text-[var(--sidebar-text)] hover:bg-white/5 hover:text-[var(--sidebar-text-active)]'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-6 bg-[var(--sidebar-bg)] px-4 py-6">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Ship size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Mailworker</div>
            <div className="text-[11px] text-[var(--sidebar-text)]">Freight AI Ops</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          <NavItem to="/" end icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem to="/inbox" icon={<Mail size={16} />} label="Submit Email" />
        </nav>
      </aside>
      <main className="min-w-0 flex-1 bg-[var(--bg)]">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/emails/:id" element={<ShipmentDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}

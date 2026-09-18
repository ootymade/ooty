import { NavLink } from 'react-router-dom'
import { HomeIcon, BoxIcon, ScanIcon, ClipboardIcon, TruckIcon } from './icons.jsx'

const TABS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/products', label: 'Products', icon: BoxIcon },
  { to: '/scan', label: 'Scan', icon: ScanIcon },
  { to: '/purchase-orders', label: 'Orders', icon: ClipboardIcon },
  { to: '/suppliers', label: 'Suppliers', icon: TruckIcon },
]

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center rounded-full p-1.5 ${
                      to === '/scan' && isActive ? 'bg-brand-600 text-white' : ''
                    } ${to === '/scan' ? 'scale-110' : ''}`}
                  >
                    <Icon className={to === '/scan' ? 'h-6 w-6' : 'h-5 w-5'} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

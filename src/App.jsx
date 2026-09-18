import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TeamMemberProvider, useTeamMember } from './context/TeamMemberContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import NamePicker from './screens/onboarding/NamePicker.jsx'
import Dashboard from './screens/Dashboard.jsx'
import ProductList from './screens/products/ProductList.jsx'
import ProductDetail from './screens/products/ProductDetail.jsx'
import ProductForm from './screens/products/ProductForm.jsx'
import StockMove from './screens/stock/StockMove.jsx'
import Scan from './screens/scan/Scan.jsx'
import POList from './screens/po/POList.jsx'
import PODetail from './screens/po/PODetail.jsx'
import POForm from './screens/po/POForm.jsx'
import SupplierList from './screens/suppliers/SupplierList.jsx'
import SupplierDetail from './screens/suppliers/SupplierDetail.jsx'
import SupplierForm from './screens/suppliers/SupplierForm.jsx'
import DataSync from './screens/settings/DataSync.jsx'

function AppShell() {
  const { member } = useTeamMember()
  if (!member) return <NamePicker />

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-slate-50 pb-[calc(64px+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/stock-move" element={<StockMove />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/purchase-orders" element={<POList />} />
          <Route path="/purchase-orders/new" element={<POForm />} />
          <Route path="/purchase-orders/:id" element={<PODetail />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/suppliers/new" element={<SupplierForm />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
          <Route path="/data-sync" element={<DataSync />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <TeamMemberProvider>
        <AppShell />
      </TeamMemberProvider>
    </ToastProvider>
  )
}

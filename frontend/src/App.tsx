// BuilderConnect v2 - Route-level code splitting
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, getRoleHomePath } from './contexts/AuthContext'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Layouts (always loaded — used by all authenticated routes)
import DashboardLayout from './components/layout/DashboardLayout'
import { ForceLightMode } from './components/ui/ForceLightMode'
import { MaintenanceBanner } from './components/ui/MaintenanceBanner'

// Public pages
const Home = lazy(() => import('./pages/public/Home'))
const BuilderSearch = lazy(() => import('./pages/public/BuilderSearch'))
const BuilderComparison = lazy(() => import('./pages/public/BuilderComparison'))
const Blog = lazy(() => import('./pages/public/Blog'))
const BlogPost = lazy(() => import('./pages/public/BlogPost'))
const CmsPage = lazy(() => import('./pages/public/CmsPage'))
const NotFound = lazy(() => import('./pages/public/NotFound'))

// Auth pages
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))

// Client pages
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'))
const CreateProject = lazy(() => import('./pages/client/CreateProject'))
const MyProjects = lazy(() => import('./pages/client/MyProjects'))
const ProjectDetails = lazy(() => import('./pages/client/ProjectDetails'))
const ClientBuilders = lazy(() => import('./pages/client/Builders'))
const ClientBuildersCompare = lazy(() => import('./pages/client/BuildersCompare'))
const AiAssistant = lazy(() => import('./pages/shared/AiAssistant'))
const FloorPlanStudio = lazy(() => import('./pages/shared/FloorPlanStudio'))

// Builder pages
const BuilderDashboard = lazy(() => import('./pages/builder/Dashboard'))
const Marketplace = lazy(() => import('./pages/builder/Marketplace'))
const MarketplaceProjectDetail = lazy(() => import('./pages/builder/MarketplaceProjectDetail'))
const MyBids = lazy(() => import('./pages/builder/MyBids'))
const ActiveProjects = lazy(() => import('./pages/builder/ActiveProjects'))
const BuilderProjectView = lazy(() => import('./pages/builder/ProjectView'))
const BuilderReviews = lazy(() => import('./pages/builder/Reviews'))
const BuilderAnalytics = lazy(() => import('./pages/builder/Analytics'))
const BuilderSubscription = lazy(() => import('./pages/builder/Subscription'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const UsersManagement = lazy(() => import('./pages/admin/Users'))
const Verifications = lazy(() => import('./pages/admin/Verifications'))
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const ModerationQueue = lazy(() => import('./pages/admin/ModerationQueue'))
const RevenueReports = lazy(() => import('./pages/admin/RevenueReports'))
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'))
const CmsPages = lazy(() => import('./pages/admin/CmsPages'))
const BlogManagement = lazy(() => import('./pages/admin/BlogManagement'))
const EmailTemplates = lazy(() => import('./pages/admin/EmailTemplates'))
const AdminsManagement = lazy(() => import('./pages/admin/Admins'))

// Supplier pages
const SupplierDashboard = lazy(() => import('@/pages/supplier/Dashboard'))
const SupplierCatalog = lazy(() => import('@/pages/supplier/Catalog'))
const SupplierOrders = lazy(() => import('@/pages/supplier/Orders'))
const SupplierOrderDetail = lazy(() => import('@/pages/supplier/OrderDetail'))
const SupplierRevenue = lazy(() => import('@/pages/supplier/Revenue'))

// Support pages
const SupportDashboard = lazy(() => import('@/pages/support/Dashboard'))
const SupportTickets = lazy(() => import('@/pages/support/Tickets'))
const SupportTicketDetail = lazy(() => import('@/pages/support/TicketDetail'))
const SupportDisputes = lazy(() => import('@/pages/support/Disputes'))

// Shared pages
const ProductMarketplace = lazy(() => import('./pages/shared/marketplace/ProductMarketplace'))
const MarketProductDetail = lazy(() => import('./pages/shared/marketplace/ProductDetail'))
const MyMaterialOrders = lazy(() => import('./pages/shared/marketplace/MyOrders'))
const MaterialOrderDetail = lazy(() => import('./pages/shared/marketplace/OrderDetail'))
const Messages = lazy(() => import('./pages/shared/Messages'))
const NotificationCenter = lazy(() => import('./pages/shared/NotificationCenter'))
const Settings = lazy(() => import('./pages/shared/Settings'))
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'))
const MySupportTickets = lazy(() => import('./pages/shared/support/MyTickets'))
const MySupportTicketDetail = lazy(() => import('./pages/shared/support/MyTicketDetail'))

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Guest-only wrapper: an already-authenticated user hitting login/register/verify-email is
// bounced to their role dashboard instead of seeing the auth screen.
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage label="Loading..." />}>
      <MaintenanceBanner />
      <Routes>
        {/* Public Routes — always light mode */}
        <Route path="/" element={<ForceLightMode><Home /></ForceLightMode>} />
        <Route path="/builders" element={<ForceLightMode><BuilderSearch /></ForceLightMode>} />
        <Route path="/builders/compare" element={<ForceLightMode><BuilderComparison /></ForceLightMode>} />
        {/* Builder profiles are now the login-gated /profile/:userId page. */}
        <Route path="/blog" element={<ForceLightMode><Blog /></ForceLightMode>} />
        <Route path="/blog/:slug" element={<ForceLightMode><BlogPost /></ForceLightMode>} />
        <Route path="/pages/:slug" element={<ForceLightMode><CmsPage /></ForceLightMode>} />
        <Route path="/login" element={<ForceLightMode><GuestRoute><Login /></GuestRoute></ForceLightMode>} />
        <Route path="/register" element={<ForceLightMode><GuestRoute><Register /></GuestRoute></ForceLightMode>} />
        <Route path="/forgot-password" element={<ForceLightMode><ForgotPassword /></ForceLightMode>} />
        <Route path="/reset-password" element={<ForceLightMode><ResetPassword /></ForceLightMode>} />
        <Route path="/verify-email" element={<ForceLightMode><GuestRoute><VerifyEmail /></GuestRoute></ForceLightMode>} />

        {/* Client Routes */}
        <Route
          path="/client/*"
          element={
            <ProtectedRoute allowedRoles={['CLIENT']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<ClientDashboard />} />
                  <Route path="assistant" element={<AiAssistant />} />
                  <Route path="floor-plan" element={<FloorPlanStudio />} />
                  <Route path="projects/new" element={<CreateProject />} />
                  <Route path="projects" element={<MyProjects />} />
                  <Route path="projects/:id" element={<ProjectDetails />} />
                  <Route path="builders" element={<ClientBuilders />} />
                  <Route path="builders/compare" element={<ClientBuildersCompare />} />
                  <Route path="products" element={<ProductMarketplace />} />
                  <Route path="products/:id" element={<MarketProductDetail />} />
                  <Route path="orders" element={<MyMaterialOrders />} />
                  <Route path="orders/:id" element={<MaterialOrderDetail />} />
                  <Route path="support" element={<MySupportTickets />} />
                  <Route path="support/tickets/:id" element={<MySupportTicketDetail />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Builder Routes */}
        <Route
          path="/builder/*"
          element={
            <ProtectedRoute allowedRoles={['BUILDER']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<BuilderDashboard />} />
                  <Route path="assistant" element={<AiAssistant />} />
                  <Route path="floor-plan" element={<FloorPlanStudio />} />
                  <Route path="marketplace" element={<Marketplace />} />
                  <Route path="marketplace/:id" element={<MarketplaceProjectDetail />} />
                  <Route path="bids" element={<MyBids />} />
                  <Route path="projects" element={<ActiveProjects />} />
                  <Route path="projects/:id" element={<BuilderProjectView />} />
                  <Route path="reviews" element={<BuilderReviews />} />
                  <Route path="analytics" element={<BuilderAnalytics />} />
                  <Route path="leads" element={<Navigate to="/builder/subscription" replace />} />
                  <Route path="subscription" element={<BuilderSubscription />} />
                  <Route path="products" element={<ProductMarketplace />} />
                  <Route path="products/:id" element={<MarketProductDetail />} />
                  <Route path="orders" element={<MyMaterialOrders />} />
                  <Route path="orders/:id" element={<MaterialOrderDetail />} />
                  <Route path="support" element={<MySupportTickets />} />
                  <Route path="support/tickets/:id" element={<MySupportTicketDetail />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<UsersManagement />} />
                  <Route
                    path="admins"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <AdminsManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="verifications" element={<Verifications />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="moderation" element={<ModerationQueue />} />
                  <Route path="revenue" element={<RevenueReports />} />
                  <Route path="system-settings" element={<SystemSettings />} />
                  <Route path="cms-pages" element={<CmsPages />} />
                  <Route path="blog" element={<BlogManagement />} />
                  <Route path="email-templates" element={<EmailTemplates />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Supplier Routes */}
        <Route
          path="/supplier/*"
          element={
            <ProtectedRoute allowedRoles={['SUPPLIER']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<SupplierDashboard />} />
                  <Route path="catalog" element={<SupplierCatalog />} />
                  <Route path="orders" element={<SupplierOrders />} />
                  <Route path="orders/:id" element={<SupplierOrderDetail />} />
                  <Route path="revenue" element={<SupplierRevenue />} />
                  <Route path="support" element={<MySupportTickets />} />
                  <Route path="support/tickets/:id" element={<MySupportTicketDetail />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Support Agent Routes (admins get oversight access too) */}
        <Route
          path="/support/*"
          element={
            <ProtectedRoute allowedRoles={['SUPPORT_AGENT', 'ADMIN', 'SUPER_ADMIN']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<SupportDashboard />} />
                  <Route path="tickets" element={<SupportTickets />} />
                  <Route path="tickets/:id" element={<SupportTicketDetail />} />
                  <Route path="disputes" element={<SupportDisputes />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile Routes — any authenticated user (own profile + viewing others) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 — show a proper error page instead of silently redirecting */}
        <Route path="*" element={<ForceLightMode><NotFound /></ForceLightMode>} />
      </Routes>
    </Suspense>
  )
}

export default App

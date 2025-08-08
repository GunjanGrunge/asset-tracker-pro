import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import logoImage from '@/logo/logo.png'
import { 
  House, 
  Package, 
  Plus, 
  Bell, 
  TrendUp, 
  Calendar,
  Gear,
  SignOut,
  User
} from '@phosphor-icons/react'
import Dashboard from '@/components/Dashboard'
import AssetList from '@/components/AssetList'
import AddAsset from '@/components/AddAsset'
import Reminders from '@/components/Reminders'
import Login from '@/components/Login'

function App() {
  const { user, loading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background font-['Inter'] cyber-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 glass-card border border-border/30 rounded-xl flex items-center justify-center animate-glow-pulse p-2">
            <img 
              src={logoImage} 
              alt="AssetTracker Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Initializing AssetTracker...</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background font-['Inter'] cyber-grid">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Header */}
      <header className="border-b border-border/50 glass-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 glass-card border border-border/30 rounded-xl flex items-center justify-center animate-glow-pulse p-1">
                <img 
                  src={logoImage} 
                  alt="AssetTracker Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AssetTracker</h1>
                <p className="text-sm text-muted-foreground">Next-Gen Asset Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="hidden md:flex items-center gap-2 glass-card px-3 py-2 rounded-lg">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                  <User size={14} className="text-primary" />
                </div>
                <span className="text-sm text-foreground font-medium">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
              </div>
              
              {/* Action Buttons */}
              <Button variant="ghost" size="sm" className="glass-card hover:bg-primary/10">
                <Bell size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="glass-card hover:bg-primary/10">
                <Gear size={18} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="glass-card hover:bg-destructive/10 hover:text-destructive"
                title="Sign Out"
              >
                <SignOut size={18} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation */}
          <TabsList className="grid w-full grid-cols-4 mb-8 glass-card">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <House size={18} />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Package size={18} />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2 data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
              <Plus size={18} />
              <span className="hidden sm:inline">Add Asset</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2 data-[state=active]:bg-success/20 data-[state=active]:text-success">
              <Calendar size={18} />
              <span className="hidden sm:inline">Reminders</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="space-y-8 animate-slide-in-glass">
            <Dashboard />
          </TabsContent>

          <TabsContent value="assets" className="space-y-8 animate-slide-in-glass">
            <AssetList />
          </TabsContent>

          <TabsContent value="add" className="space-y-8 animate-slide-in-glass">
            <AddAsset />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-8 animate-slide-in-glass">
            <Reminders />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
    </div>
  )
}

export default App
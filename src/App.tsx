import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  House, 
  Package, 
  Plus, 
  Bell, 
  TrendingUp, 
  Calendar,
  Gear
} from '@phosphor-icons/react'
import Dashboard from '@/components/Dashboard'
import AssetList from '@/components/AssetList'
import AddAsset from '@/components/AddAsset'
import Reminders from '@/components/Reminders'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

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
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center animate-glow-pulse">
                <TrendingUp size={28} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground neon-text">AssetTracker</h1>
                <p className="text-sm text-muted-foreground">Next-Gen Asset Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="glass-card hover:bg-primary/10">
                <Bell size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="glass-card hover:bg-primary/10">
                <Gear size={18} />
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
    </div>
  )
}

export default App
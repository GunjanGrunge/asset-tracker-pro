import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Package, 
  Plus, 
  Bell, 
  TrendingUp, 
  Calendar,
  Upload,
  Search,
  Settings
} from '@phosphor-icons/react'
import Dashboard from '@/components/Dashboard'
import AssetList from '@/components/AssetList'
import AddAsset from '@/components/AddAsset'
import Reminders from '@/components/Reminders'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-background font-['Inter']">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp size={24} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AssetTracker</h1>
                <p className="text-sm text-muted-foreground">Smart Asset Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell size={16} />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation */}
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Package size={16} />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Asset</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Calendar size={16} />
              <span className="hidden sm:inline">Reminders</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <AssetList />
          </TabsContent>

          <TabsContent value="add" className="space-y-6">
            <AddAsset />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
            <Reminders />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App
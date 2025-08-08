import { useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, apiRequest } from '@/lib/api'
import { 
  TrendUp, 
  Package, 
  CurrencyDollar, 
  Calendar,
  Warning,
  Clock,
  Plus
} from '@phosphor-icons/react'

interface Asset {
  id: string
  name: string
  category: string
  purchasePrice: number
  purchaseDate: string
  status: 'active' | 'sold' | 'lost' | 'broken'
  salePrice?: number
  imageUrl?: string
}

interface Reminder {
  id: string
  assetId: string
  title: string
  dueDate: string
  type: string
  completed: boolean
}

export default function Dashboard() {
  const [assets, setAssets] = useKV<Asset[]>('assets', [])
  const [reminders, setReminders] = useKV<Reminder[]>('reminders', [])
  const [animateMetrics, setAnimateMetrics] = useState(false)

  // Load data from backend on component mount
  useEffect(() => {
    loadAssetsFromAPI()
    loadRemindersFromAPI()
    const timer = setTimeout(() => setAnimateMetrics(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const loadAssetsFromAPI = async () => {
    try {
      const apiAssets = await apiRequest('/assets')
      console.log('Loaded assets from API:', apiAssets)
      setAssets(apiAssets)
    } catch (error) {
      console.error('Failed to load assets:', error)
      // Continue with local storage data if API fails
    }
  }

  // Refresh assets data every 30 seconds to keep in sync
  useEffect(() => {
    const interval = setInterval(loadAssetsFromAPI, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRemindersFromAPI = async () => {
    try {
      const apiReminders = await apiRequest('/reminders')
      setReminders(apiReminders)
    } catch (error) {
      console.error('Failed to load reminders:', error)
      // Continue with local storage data if API fails
    }
  }

  // Calculate metrics
  const activeAssets = assets.filter(asset => asset.status === 'active')
  const totalAssets = activeAssets.length
  const totalWorth = activeAssets.reduce((sum, asset) => {
    // Handle both number and string formats from database
    let price = asset.purchasePrice
    if (typeof price === 'string') {
      price = parseFloat(price.replace(/[^0-9.-]+/g, '')) // Remove currency symbols
    }
    return sum + (isNaN(price) ? 0 : price)
  }, 0)

  console.log('Dashboard metrics:', { totalAssets, totalWorth, activeAssets })
  
  // Recent assets (last 5 added)
  const recentAssets = assets
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    .slice(0, 5)

  // Upcoming reminders (next 7 days)
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingReminders = reminders
    .filter(reminder => !reminder.completed && new Date(reminder.dueDate) <= weekFromNow)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < now
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-foreground mb-2">Command Center</h2>
        <p className="text-muted-foreground text-lg">Real-time asset portfolio analytics</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`glass-card metric-card transition-all duration-700 ${animateMetrics ? 'animate-count-up' : 'opacity-0'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Assets
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalAssets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active items in portfolio
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card metric-card transition-all duration-700 delay-150 ${animateMetrics ? 'animate-count-up' : 'opacity-0'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Worth
            </CardTitle>
            <div className="p-2 rounded-lg bg-success/10">
              <CurrencyDollar className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{formatCurrency(totalWorth)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined purchase value
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card metric-card transition-all duration-700 delay-300 ${animateMetrics ? 'animate-count-up' : 'opacity-0'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Pending Alerts
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/10">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{upcomingReminders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Due in next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assets & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assets */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendUp size={22} className="text-primary" />
              </div>
              <span className="text-foreground">Recent Acquisitions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAssets.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-muted/20 w-fit mx-auto mb-4">
                  <Package size={48} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg">No assets detected</p>
                <p className="text-sm text-muted-foreground">Initialize your portfolio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAssets.map((asset, index) => (
                  <div 
                    key={asset.id} 
                    className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-gradient-to-r from-card/50 to-card/20 hover:from-primary/5 hover:to-primary/10 transition-all duration-300 hover:border-primary/30"
                    style={{animationDelay: `${index * 100}ms`}}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-foreground">{asset.name}</h4>
                        <Badge 
                          variant={asset.status === 'active' ? 'default' : 'secondary'}
                          className={asset.status === 'active' ? 'bg-success/20 text-success border-success/30' : ''}
                        >
                          {asset.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wide">{asset.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-foreground">{formatCurrency(asset.purchasePrice)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(asset.purchaseDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Clock size={22} className="text-accent" />
              </div>
              <span className="text-foreground">Priority Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-success/10 w-fit mx-auto mb-4">
                  <Calendar size={48} className="text-success" />
                </div>
                <p className="text-success text-lg">System Optimal</p>
                <p className="text-sm text-muted-foreground">All maintenance current</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingReminders.map((reminder, index) => {
                  const asset = assets.find(a => a.id === reminder.assetId)
                  const overdue = isOverdue(reminder.dueDate)
                  
                  return (
                    <div 
                      key={reminder.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                        overdue 
                          ? 'border-destructive/40 bg-gradient-to-r from-destructive/10 to-destructive/5 animate-pulse-gentle' 
                          : 'border-border/30 bg-gradient-to-r from-card/50 to-card/20 hover:from-accent/5 hover:to-accent/10 hover:border-accent/30'
                      }`}
                      style={{animationDelay: `${index * 100}ms`}}
                    >
                      <div className="flex items-center gap-4">
                        {overdue && (
                          <div className="p-1 rounded-full bg-destructive/20">
                            <Warning size={18} className="text-destructive" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-foreground">{reminder.title}</h4>
                          <p className="text-sm text-muted-foreground">{asset?.name || 'Unknown Asset'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                          {formatDate(reminder.dueDate)}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{reminder.type}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {assets.length === 0 && (
        <Card className="glass-card border-dashed border-2 border-primary/30">
          <CardContent className="pt-8">
            <div className="text-center">
              <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto mb-6 animate-glow-pulse">
                <TrendUp size={64} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Initialize AssetTracker</h3>
              <p className="text-muted-foreground mb-6 text-lg">
                Begin building your digital asset portfolio
              </p>
              <Button className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-3 text-lg rounded-xl">
                <Plus size={20} className="mr-2" />
                Deploy First Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Calendar,
  AlertTriangle,
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
  const [assets] = useKV<Asset[]>('assets', [])
  const [reminders] = useKV<Reminder[]>('reminders', [])
  const [animateMetrics, setAnimateMetrics] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateMetrics(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Calculate metrics
  const activeAssets = assets.filter(asset => asset.status === 'active')
  const totalAssets = activeAssets.length
  const totalWorth = activeAssets.reduce((sum, asset) => sum + asset.purchasePrice, 0)
  
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < now
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your asset portfolio</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`transition-all duration-500 ${animateMetrics ? 'animate-count-up' : 'opacity-0'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              Active items in portfolio
            </p>
          </CardContent>
        </Card>

        <Card className={`transition-all duration-500 delay-100 ${animateMetrics ? 'animate-count-up' : 'opacity-0'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Worth
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalWorth)}</div>
            <p className="text-xs text-muted-foreground">
              Combined purchase value
            </p>
          </CardContent>
        </Card>

        <Card className={`transition-all duration-500 delay-200 ${animateMetrics ? 'animate-count-up' : 'opacity-0'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reminders
            </CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{upcomingReminders.length}</div>
            <p className="text-xs text-muted-foreground">
              Due in next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assets & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Recent Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAssets.length === 0 ? (
              <div className="text-center py-8">
                <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No assets added yet</p>
                <p className="text-sm text-muted-foreground">Start by adding your first asset</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{asset.name}</h4>
                        <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
                          {asset.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{asset.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(asset.purchasePrice)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(asset.purchaseDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} className="text-accent" />
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming reminders</p>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => {
                  const asset = assets.find(a => a.id === reminder.assetId)
                  const overdue = isOverdue(reminder.dueDate)
                  
                  return (
                    <div key={reminder.id} className={`flex items-center justify-between p-3 rounded-lg border ${overdue ? 'border-destructive/20 bg-destructive/5' : 'bg-card hover:bg-muted/50'} transition-colors`}>
                      <div className="flex items-center gap-3">
                        {overdue && <AlertTriangle size={16} className="text-destructive animate-pulse-gentle" />}
                        <div>
                          <h4 className="font-medium text-foreground">{reminder.title}</h4>
                          <p className="text-sm text-muted-foreground">{asset?.name || 'Unknown Asset'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                          {formatDate(reminder.dueDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">{reminder.type}</p>
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
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to AssetTracker</h3>
              <p className="text-muted-foreground mb-4">
                Start building your asset portfolio by adding your first valuable purchase
              </p>
              <Button>
                <Plus size={16} className="mr-2" />
                Add Your First Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
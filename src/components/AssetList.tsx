import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Search, 
  Package, 
  DollarSign, 
  Calendar,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  MoreHorizontal
} from '@phosphor-icons/react'

interface Asset {
  id: string
  name: string
  category: string
  purchasePrice: number
  purchaseDate: string
  status: 'active' | 'sold' | 'lost' | 'broken'
  description?: string
  model?: string
  serialNumber?: string
  warrantyExpiry?: string
  salePrice?: number
  saleDate?: string
}

const statusConfig = {
  active: { color: 'default', icon: CheckCircle, label: 'Active' },
  sold: { color: 'secondary', icon: DollarSign, label: 'Sold' },
  lost: { color: 'destructive', icon: XCircle, label: 'Lost' },
  broken: { color: 'destructive', icon: AlertTriangle, label: 'Broken' }
}

export default function AssetList() {
  const [assets, setAssets] = useKV<Asset[]>('assets', [])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Asset>>({})

  // Get unique categories
  const categories = Array.from(new Set(assets.map(asset => asset.category)))

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

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

  const handleStatusChange = (assetId: string, newStatus: Asset['status'], salePrice?: number) => {
    setAssets(current => 
      current.map(asset => {
        if (asset.id === assetId) {
          const updates: Partial<Asset> = { status: newStatus }
          if (newStatus === 'sold' && salePrice) {
            updates.salePrice = salePrice
            updates.saleDate = new Date().toISOString().split('T')[0]
          }
          return { ...asset, ...updates }
        }
        return asset
      })
    )
    toast.success(`Asset marked as ${newStatus}`)
  }

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setEditForm(asset)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedAsset || !editForm.name || !editForm.category) {
      toast.error('Please fill in required fields')
      return
    }

    setAssets(current =>
      current.map(asset =>
        asset.id === selectedAsset.id ? { ...asset, ...editForm } : asset
      )
    )
    
    toast.success('Asset updated successfully')
    setIsEditDialogOpen(false)
    setSelectedAsset(null)
    setEditForm({})
  }

  const handleDeleteAsset = (assetId: string) => {
    setAssets(current => current.filter(asset => asset.id !== assetId))
    toast.success('Asset deleted successfully')
  }

  const StatusChangeButton = ({ asset }: { asset: Asset }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [salePrice, setSalePrice] = useState('')

    const handleStatusClick = (status: Asset['status']) => {
      if (status === 'sold') {
        const price = parseFloat(salePrice)
        if (!price || price <= 0) {
          toast.error('Please enter a valid sale price')
          return
        }
        handleStatusChange(asset.id, status, price)
      } else {
        handleStatusChange(asset.id, status)
      }
      setIsOpen(false)
      setSalePrice('')
    }

    if (asset.status !== 'active') {
      return null
    }

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="glass-card hover:bg-accent/10 hover:border-accent/50">
            <MoreHorizontal size={16} />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Update Asset Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Modify status for <span className="font-medium text-foreground">"{asset.name}"</span>
            </p>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider">Sale Price (if selling)</Label>
              <Input
                type="number"
                placeholder="Enter sale price"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="glass-card border-border/50 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => handleStatusClick('sold')}
                variant="outline"
                className="flex items-center gap-2 glass-card hover:bg-success/10 hover:border-success/50 hover:text-success"
              >
                <DollarSign size={16} />
                Sold
              </Button>
              <Button
                onClick={() => handleStatusClick('lost')}
                variant="outline"
                className="flex items-center gap-2 glass-card hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
              >
                <XCircle size={16} />
                Lost
              </Button>
              <Button
                onClick={() => handleStatusClick('broken')}
                variant="outline"
                className="flex items-center gap-2 glass-card hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
              >
                <AlertTriangle size={16} />
                Broken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-foreground neon-text mb-2">Asset Registry</h2>
        <p className="text-muted-foreground text-lg">Comprehensive portfolio management system</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-card border-border/50 focus:border-primary"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="broken">Broken</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="p-1 rounded bg-primary/10">
                <Filter size={16} className="text-primary" />
              </div>
              <span className="font-medium">{filteredAssets.length}</span> of <span className="font-medium">{assets.length}</span> assets
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid/List */}
      {filteredAssets.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="p-6 rounded-full bg-muted/20 w-fit mx-auto mb-6">
              <Package size={64} className="text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              {assets.length === 0 ? 'Asset Registry Empty' : 'No Assets Found'}
            </h3>
            <p className="text-muted-foreground text-lg">
              {assets.length === 0 
                ? 'Initialize your portfolio by deploying your first asset'
                : 'Adjust search parameters or filter criteria'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset, index) => {
            const config = statusConfig[asset.status]
            const StatusIcon = config.icon
            
            return (
              <Card 
                key={asset.id} 
                className="glass-card hover:border-primary/50 transition-all duration-300 animate-slide-in-glass"
                style={{animationDelay: `${index * 100}ms`}}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-foreground">{asset.name}</CardTitle>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider">{asset.category}</p>
                    </div>
                    <Badge 
                      variant={config.color as any} 
                      className={`flex items-center gap-2 px-3 py-1 ${
                        asset.status === 'active' ? 'bg-success/20 text-success border-success/30' :
                        asset.status === 'sold' ? 'bg-primary/20 text-primary border-primary/30' :
                        'bg-destructive/20 text-destructive border-destructive/30'
                      }`}
                    >
                      <StatusIcon size={14} />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Purchase Price</p>
                      <p className="font-bold text-lg text-foreground">{formatCurrency(asset.purchasePrice)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Purchase Date</p>
                      <p className="font-semibold text-foreground">{formatDate(asset.purchaseDate)}</p>
                    </div>
                    {asset.model && (
                      <div className="col-span-2 p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Model</p>
                        <p className="font-semibold text-foreground">{asset.model}</p>
                      </div>
                    )}
                    {asset.salePrice && (
                      <div className="col-span-2 p-3 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/30">
                        <p className="text-success text-xs uppercase tracking-wider">Sale Price</p>
                        <p className="font-bold text-lg text-success">{formatCurrency(asset.salePrice)}</p>
                      </div>
                    )}
                  </div>

                  {asset.warrantyExpiry && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Warranty expires:</span> {formatDate(asset.warrantyExpiry)}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t border-border/30">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAsset(asset)}
                        className="glass-card hover:bg-primary/10 hover:border-primary/50"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="glass-card hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <StatusChangeButton asset={asset} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Modify Asset Registry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider">Asset Name</Label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="glass-card border-border/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider">Category</Label>
              <Input
                value={editForm.category || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                className="glass-card border-border/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider">Purchase Price</Label>
              <Input
                type="number"
                value={editForm.purchasePrice || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) }))}
                className="glass-card border-border/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider">Model</Label>
              <Input
                value={editForm.model || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, model: e.target.value }))}
                className="glass-card border-border/50 focus:border-primary"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground">
                Deploy Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="glass-card border-border/50">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
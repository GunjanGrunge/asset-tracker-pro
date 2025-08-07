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
          <Button variant="outline" size="sm">
            <MoreHorizontal size={16} />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Asset Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Change the status of "{asset.name}"
            </p>
            
            <div className="space-y-2">
              <Label>Sale Price (if selling)</Label>
              <Input
                type="number"
                placeholder="Enter sale price"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleStatusClick('sold')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <DollarSign size={16} />
                Sold
              </Button>
              <Button
                onClick={() => handleStatusClick('lost')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <XCircle size={16} />
                Lost
              </Button>
              <Button
                onClick={() => handleStatusClick('broken')}
                variant="outline"
                className="flex items-center gap-2"
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">All Assets</h2>
        <p className="text-muted-foreground">Manage and track your asset portfolio</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="broken">Broken</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter size={16} />
              {filteredAssets.length} of {assets.length} assets
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid/List */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Package size={64} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {assets.length === 0 ? 'No Assets Added' : 'No Assets Found'}
            </h3>
            <p className="text-muted-foreground">
              {assets.length === 0 
                ? 'Start by adding your first asset to track your portfolio'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => {
            const config = statusConfig[asset.status]
            const StatusIcon = config.icon
            
            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{asset.category}</p>
                    </div>
                    <Badge variant={config.color as any} className="flex items-center gap-1">
                      <StatusIcon size={12} />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Purchase Price</p>
                      <p className="font-medium">{formatCurrency(asset.purchasePrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchase Date</p>
                      <p className="font-medium">{formatDate(asset.purchaseDate)}</p>
                    </div>
                    {asset.model && (
                      <div>
                        <p className="text-muted-foreground">Model</p>
                        <p className="font-medium">{asset.model}</p>
                      </div>
                    )}
                    {asset.salePrice && (
                      <div>
                        <p className="text-muted-foreground">Sale Price</p>
                        <p className="font-medium">{formatCurrency(asset.salePrice)}</p>
                      </div>
                    )}
                  </div>

                  {asset.warrantyExpiry && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Warranty expires: {formatDate(asset.warrantyExpiry)}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAsset(asset)}
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 size={14} />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={editForm.category || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={editForm.purchasePrice || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={editForm.model || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, model: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
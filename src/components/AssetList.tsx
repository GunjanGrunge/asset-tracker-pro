import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import DocumentViewer from '@/components/DocumentViewer'
import { formatCurrency, formatDate, apiRequest } from '@/lib/api'
import { 
  MagnifyingGlass, 
  Package, 
  CurrencyDollar, 
  Calendar,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
  Warning,
  Funnel,
  DotsThree,
  FileText,
  Eye
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
  documents?: AssetDocument[]
}

interface AssetDocument {
  id: string
  type: 'receipt' | 'invoice' | 'warranty' | 'manual' | 'other'
  filename: string
  originalName: string
  url: string
  uploadDate: string
}

const statusConfig = {
  active: { color: 'default', icon: CheckCircle, label: 'Active' },
  sold: { color: 'secondary', icon: CurrencyDollar, label: 'Sold' },
  lost: { color: 'destructive', icon: XCircle, label: 'Lost' },
  broken: { color: 'destructive', icon: Warning, label: 'Broken' }
}

export default function AssetList() {
  const [assets, setAssets] = useKV<Asset[]>('assets', [])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false)
  const [isAssetDetailOpen, setIsAssetDetailOpen] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<AssetDocument[]>([])
  const [editForm, setEditForm] = useState<Partial<Asset>>({})
  
  // Document viewer state
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string
    name: string
    type: string
  } | null>(null)

  // Load assets from backend on component mount
  useEffect(() => {
    loadAssetsFromAPI()
  }, [])

  const loadAssetsFromAPI = async () => {
    try {
      const apiAssets = await apiRequest('/assets')
      console.log('Loaded assets from API for AssetList:', apiAssets)
      setAssets(apiAssets)
    } catch (error) {
      console.error('Failed to load assets in AssetList:', error)
      // Continue with local storage data if API fails
    }
  }

  // Refresh assets data every 30 seconds to keep in sync
  useEffect(() => {
    const interval = setInterval(loadAssetsFromAPI, 30000)
    return () => clearInterval(interval)
  }, [])

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
    // toast.success(`Asset marked as ${newStatus}`)
  }

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setEditForm(asset)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAsset || !editForm.name || !editForm.category) {
      // toast.error('Please fill in required fields')
      return
    }

    // Convert purchasePrice to number and validate
    const purchasePrice = typeof editForm.purchasePrice === 'string' 
      ? parseFloat(editForm.purchasePrice) 
      : editForm.purchasePrice || 0

    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      // toast.error('Please enter a valid purchase price')
      return
    }

    const updatedAsset = {
      ...selectedAsset,
      ...editForm,
      purchasePrice: purchasePrice
    }

    try {
      // Update in backend
      await apiRequest(`/assets/${selectedAsset.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedAsset)
      })

      // Update local state
      setAssets(current =>
        current.map(asset =>
          asset.id === selectedAsset.id ? updatedAsset : asset
        )
      )
      
      // toast.success('Asset updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedAsset(null)
      setEditForm({})
    } catch (error) {
      console.error('Failed to update asset:', error)
      // toast.error('Failed to update asset. Please try again.')
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    try {
      // Delete from backend
      await apiRequest(`/assets/${assetId}`, {
        method: 'DELETE'
      })
      
      // Update local state
      setAssets(current => current.filter(asset => asset.id !== assetId))
      //       // toast.success('Asset deleted successfully!')
    } catch (error) {
      console.error('Failed to delete asset:', error)
      // toast.error('Failed to delete asset. Please try again.')
    }
  }

  const handleViewDocuments = (asset: Asset) => {
    setSelectedAsset(asset)
    setSelectedDocuments(asset.documents || [])
    setIsDocumentDialogOpen(true)
  }

  const handleViewDocument = (document: AssetDocument) => {
    setSelectedDocument({
      id: document.id,
      name: document.originalName,
      type: document.type
    })
    setIsDocumentViewerOpen(true)
  }

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsAssetDetailOpen(true)
  }

  const StatusChangeButton = ({ asset }: { asset: Asset }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [salePrice, setSalePrice] = useState('')

    const handleStatusClick = (status: Asset['status']) => {
      if (status === 'sold') {
        const price = parseFloat(salePrice)
        if (!price || price <= 0) {
          // toast.error('Please enter a valid sale price')
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => e.stopPropagation()}
            className="glass-card hover:bg-accent/10 hover:border-accent/50"
          >
            <DotsThree size={16} />
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
                <CurrencyDollar size={16} />
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
                <Warning size={16} />
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
        <h2 className="text-4xl font-bold text-foreground mb-2">Asset Registry</h2>
        <p className="text-muted-foreground text-lg">Comprehensive portfolio management system</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
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
                <Funnel size={16} className="text-primary" />
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
                className="glass-card hover:border-primary/50 transition-all duration-300 animate-slide-in-glass cursor-pointer"
                style={{animationDelay: `${index * 100}ms`}}
                onClick={() => handleAssetClick(asset)}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditAsset(asset)
                        }}
                        className="glass-card hover:bg-primary/10 hover:border-primary/50"
                      >
                        <PencilSimple size={16} />
                      </Button>
                      {asset.documents && asset.documents.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDocuments(asset)
                          }}
                          className="glass-card hover:bg-accent/10 hover:border-accent/50"
                        >
                          <FileText size={16} />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                          >
                            <Trash size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border-border/50" onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Delete Asset</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Are you sure you want to delete "{asset.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="glass-card border-border/50">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAsset(asset.id)
                              }}
                              className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                onChange={(e) => setEditForm(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
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

      {/* Document Viewer Dialog */}
      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent className="max-w-2xl glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Asset Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No documents uploaded for this asset</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {selectedDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 rounded-lg glass-card border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{document.originalName}</p>
                        <p className="text-sm text-muted-foreground capitalize">{document.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(document.uploadDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(document)}
                        className="glass-card hover:bg-primary/10 hover:border-primary/50"
                      >
                        <Eye size={16} />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Dialog */}
      {selectedAsset && (
        <Dialog open={isAssetDetailOpen} onOpenChange={setIsAssetDetailOpen}>
          <DialogContent className="max-w-4xl glass-card border-border/50">
            <DialogHeader>
              <DialogTitle className="text-2xl text-foreground flex items-center gap-3">
                <Package size={24} className="text-primary" />
                {selectedAsset.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Asset Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Category</p>
                  <p className="font-semibold text-lg text-foreground">{selectedAsset.category}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Purchase Price</p>
                  <p className="font-bold text-xl text-foreground">{formatCurrency(selectedAsset.purchasePrice)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {statusConfig[selectedAsset.status].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Asset Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Asset Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-muted-foreground text-sm">Purchase Date</p>
                      <p className="text-foreground">{formatDate(selectedAsset.purchaseDate)}</p>
                    </div>
                    {selectedAsset.model && (
                      <div>
                        <p className="text-muted-foreground text-sm">Model</p>
                        <p className="text-foreground">{selectedAsset.model}</p>
                      </div>
                    )}
                    {selectedAsset.serialNumber && (
                      <div>
                        <p className="text-muted-foreground text-sm">Serial Number</p>
                        <p className="text-foreground font-mono">{selectedAsset.serialNumber}</p>
                      </div>
                    )}
                    {selectedAsset.warrantyExpiry && (
                      <div>
                        <p className="text-muted-foreground text-sm">Warranty Expiry</p>
                        <p className="text-foreground">{formatDate(selectedAsset.warrantyExpiry)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Documents</h3>
                  {selectedAsset.documents && selectedAsset.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedAsset.documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{document.originalName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{document.type}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(document)}
                            className="glass-card hover:bg-primary/10 hover:border-primary/50"
                          >
                            <Eye size={16} />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No documents attached</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedAsset.description && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedAsset.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditForm(selectedAsset)
                    setIsAssetDetailOpen(false)
                    setIsEditDialogOpen(true)
                  }}
                  className="glass-card hover:bg-primary/10 hover:border-primary/50"
                >
                  <PencilSimple size={16} className="mr-2" />
                  Edit Asset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAssetDetailOpen(false)}
                  className="glass-card"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          isOpen={isDocumentViewerOpen}
          onClose={() => {
            setIsDocumentViewerOpen(false)
            setSelectedDocument(null)
          }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
          documentType={selectedDocument.type}
        />
      )}
    </div>
  )
}
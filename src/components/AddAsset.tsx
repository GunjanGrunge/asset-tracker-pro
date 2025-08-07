import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Upload, 
  Plus, 
  FileText, 
  Loader, 
  Check,
  Edit3,
  Calendar,
  DollarSign
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
  receiptUrl?: string
}

interface ParsedReceipt {
  name: string
  category: string
  price: number
  date: string
  model?: string
  serialNumber?: string
  warrantyExpiry?: string
}

const categories = [
  'Electronics',
  'Vehicles',
  'Home Appliances',
  'Furniture',
  'Tools & Equipment',
  'Jewelry',
  'Art & Collectibles',
  'Sports & Recreation',
  'Other'
]

export default function AddAsset() {
  const [assets, setAssets] = useKV<Asset[]>('assets', [])
  const [activeTab, setActiveTab] = useState<'manual' | 'receipt'>('manual')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    purchasePrice: '',
    purchaseDate: '',
    description: '',
    model: '',
    serialNumber: '',
    warrantyExpiry: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      purchasePrice: '',
      purchaseDate: '',
      description: '',
      model: '',
      serialNumber: '',
      warrantyExpiry: ''
    })
    setParsedData(null)
    setIsEditing(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }

    setIsProcessing(true)
    
    try {
      // Simulate receipt parsing with LLM
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock parsed data - in real implementation, this would come from LLM
      const mockParsedData: ParsedReceipt = {
        name: 'iPhone 15 Pro',
        category: 'Electronics',
        price: 999,
        date: new Date().toISOString().split('T')[0],
        model: 'A3102',
        serialNumber: 'G6GZN8XHMD',
        warrantyExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
      
      setParsedData(mockParsedData)
      setFormData({
        name: mockParsedData.name,
        category: mockParsedData.category,
        purchasePrice: mockParsedData.price.toString(),
        purchaseDate: mockParsedData.date,
        description: '',
        model: mockParsedData.model || '',
        serialNumber: mockParsedData.serialNumber || '',
        warrantyExpiry: mockParsedData.warrantyExpiry || ''
      })
      
      toast.success('Receipt parsed successfully! Review and edit details if needed.')
    } catch (error) {
      toast.error('Failed to parse receipt. Please try manual entry.')
      setActiveTab('manual')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.category || !formData.purchasePrice || !formData.purchaseDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const newAsset: Asset = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category,
      purchasePrice: parseFloat(formData.purchasePrice),
      purchaseDate: formData.purchaseDate,
      status: 'active',
      description: formData.description || undefined,
      model: formData.model || undefined,
      serialNumber: formData.serialNumber || undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined
    }

    setAssets(current => [...current, newAsset])
    toast.success('Asset added successfully!')
    resetForm()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-foreground neon-text mb-2">Deploy New Asset</h2>
        <p className="text-muted-foreground text-lg">Manual registration or AI-powered receipt parsing</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'receipt')}>
        <TabsList className="grid w-full grid-cols-2 glass-card">
          <TabsTrigger value="manual" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Edit3 size={18} />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2 data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
            <Upload size={18} />
            Upload Receipt
          </TabsTrigger>
        </TabsList>

        {/* Receipt Upload Tab */}
        <TabsContent value="receipt" className="space-y-6 animate-slide-in-glass">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <FileText size={22} className="text-accent" />
                </div>
                <span className="text-foreground">AI Receipt Parser</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!parsedData && !isProcessing ? (
                <div className="border-2 border-dashed border-accent/30 rounded-xl p-12 text-center hover:border-accent/50 transition-all duration-300 glass-card">
                  <div className="p-6 rounded-full bg-accent/10 w-fit mx-auto mb-6">
                    <Upload size={64} className="text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground neon-text mb-3">Upload Receipt</h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Upload a PDF receipt and our AI will extract purchase details automatically
                  </p>
                  <label htmlFor="receipt-upload">
                    <Button asChild className="bg-accent hover:bg-accent/80 text-accent-foreground px-8 py-3 text-lg rounded-xl">
                      <span className="cursor-pointer">Choose PDF File</span>
                    </Button>
                  </label>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : isProcessing ? (
                <div className="text-center py-12">
                  <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto mb-6 animate-glow-pulse">
                    <Loader size={64} className="text-primary animate-spin" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground neon-text mb-3">AI Processing</h3>
                  <p className="text-muted-foreground text-lg">Extracting purchase intelligence...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-success p-4 rounded-xl bg-success/10 border border-success/30">
                    <Check size={24} />
                    <span className="font-bold text-lg">Receipt processed successfully!</span>
                  </div>
                  <div className="glass-card p-6 rounded-xl">
                    <h4 className="font-bold text-foreground mb-4 text-lg">Extracted Intelligence:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Product</span>
                        <div className="font-semibold text-foreground">{parsedData?.name}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Category</span>
                        <div className="font-semibold text-foreground">{parsedData?.category}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Price</span>
                        <div className="font-bold text-lg text-foreground">${parsedData?.price}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                        <div className="font-semibold text-foreground">{parsedData?.date}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="glass-card hover:bg-primary/10 hover:border-primary/50">
                      <Edit3 size={18} className="mr-2" />
                      Review & Modify
                    </Button>
                    <Button 
                      onClick={() => {
                        resetForm()
                        setActiveTab('manual')
                      }} 
                      variant="ghost"
                      className="glass-card"
                    >
                      Reset & Start Over
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-6 animate-slide-in-glass">
          {/* Show parsing status if data was parsed */}
          {parsedData && (
            <Card className="glass-card border-success/30 bg-gradient-to-r from-success/10 to-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-success mb-2">
                  <Check size={20} />
                  <span className="font-bold text-lg">Data imported from receipt</span>
                </div>
                <p className="text-muted-foreground">
                  Review and modify the details below before deployment
                </p>
              </CardContent>
            </Card>
          )}

          {/* Asset Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus size={22} className="text-primary" />
                </div>
                <span className="text-foreground">Asset Registration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Required Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-muted-foreground uppercase tracking-wider text-sm">
                      Asset Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., iPhone 15 Pro"
                      className="glass-card border-border/50 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-muted-foreground uppercase tracking-wider text-sm">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="glass-card border-border/50">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-border/50">
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-muted-foreground uppercase tracking-wider text-sm">
                      Purchase Price <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-success" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.purchasePrice}
                        onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                        placeholder="0.00"
                        className="pl-10 glass-card border-border/50 focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-muted-foreground uppercase tracking-wider text-sm">
                      Purchase Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                        className="pl-10 glass-card border-border/50 focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border/30 pb-2">Optional Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-muted-foreground uppercase tracking-wider text-sm">Model/Version</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        placeholder="e.g., A3102"
                        className="glass-card border-border/50 focus:border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serial" className="text-muted-foreground uppercase tracking-wider text-sm">Serial Number</Label>
                      <Input
                        id="serial"
                        value={formData.serialNumber}
                        onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                        placeholder="e.g., ABC123456789"
                        className="glass-card border-border/50 focus:border-primary"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="warranty" className="text-muted-foreground uppercase tracking-wider text-sm">Warranty Expiry</Label>
                      <Input
                        id="warranty"
                        type="date"
                        value={formData.warrantyExpiry}
                        onChange={(e) => handleInputChange('warrantyExpiry', e.target.value)}
                        className="glass-card border-border/50 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-muted-foreground uppercase tracking-wider text-sm">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Additional notes about this asset..."
                      rows={3}
                      className="glass-card border-border/50 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6 border-t border-border/30">
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-3 text-lg rounded-xl">
                    <Plus size={20} className="mr-2" />
                    Deploy Asset
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="glass-card border-border/50 px-6">
                    Clear Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
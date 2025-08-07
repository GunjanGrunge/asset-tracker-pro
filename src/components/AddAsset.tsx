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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Add New Asset</h2>
        <p className="text-muted-foreground">Add assets manually or upload a receipt for automatic parsing</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'receipt')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Edit3 size={16} />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Upload size={16} />
            Upload Receipt
          </TabsTrigger>
        </TabsList>

        {/* Receipt Upload Tab */}
        <TabsContent value="receipt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Receipt Parser
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!parsedData && !isProcessing ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Upload size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Upload Receipt</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a PDF receipt and our AI will extract the purchase details automatically
                  </p>
                  <label htmlFor="receipt-upload">
                    <Button asChild>
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
                <div className="text-center py-8">
                  <Loader size={48} className="mx-auto text-primary mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Processing Receipt</h3>
                  <p className="text-muted-foreground">Our AI is extracting purchase details...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-success">
                    <Check size={20} />
                    <span className="font-medium">Receipt processed successfully!</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">Extracted Information:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Product:</span> {parsedData?.name}</div>
                      <div><span className="text-muted-foreground">Category:</span> {parsedData?.category}</div>
                      <div><span className="text-muted-foreground">Price:</span> ${parsedData?.price}</div>
                      <div><span className="text-muted-foreground">Date:</span> {parsedData?.date}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      <Edit3 size={16} className="mr-2" />
                      Review & Edit
                    </Button>
                    <Button 
                      onClick={() => {
                        resetForm()
                        setActiveTab('manual')
                      }} 
                      variant="ghost"
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-6">
          {/* Show parsing status if data was parsed */}
          {parsedData && (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-success mb-2">
                  <Check size={16} />
                  <span className="font-medium">Data imported from receipt</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review and modify the details below before saving
                </p>
              </CardContent>
            </Card>
          )}

          {/* Asset Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={20} className="text-primary" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Required Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Asset Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., iPhone 15 Pro"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium">
                      Purchase Price <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.purchasePrice}
                        onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                        placeholder="0.00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      Purchase Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-sm font-medium">Model/Version</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="e.g., A3102"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serial" className="text-sm font-medium">Serial Number</Label>
                    <Input
                      id="serial"
                      value={formData.serialNumber}
                      onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                      placeholder="e.g., ABC123456789"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="warranty" className="text-sm font-medium">Warranty Expiry</Label>
                    <Input
                      id="warranty"
                      type="date"
                      value={formData.warrantyExpiry}
                      onChange={(e) => handleInputChange('warrantyExpiry', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Additional notes about this asset..."
                    rows={3}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    <Plus size={16} className="mr-2" />
                    Add Asset
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
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
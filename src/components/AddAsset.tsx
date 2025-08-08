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
import { apiRequest, API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Upload, 
  Plus, 
  FileText, 
  CircleNotch, 
  Check,
  PencilSimple,
  Calendar,
  CurrencyDollar,
  Shield,
  Trash
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

interface DocumentUpload {
  id: string
  type: 'receipt' | 'invoice' | 'warranty' | 'manual' | 'other'
  file: File
  name: string
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
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentUpload[]>([])
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  
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
    setUploadedDocuments([])
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: 'receipt' | 'invoice' | 'warranty' | 'manual' | 'other') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type (PDF, JPG, PNG)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, JPG, or PNG files only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploadingDocument(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      
      const response = await fetch('http://localhost:8000/api/receipts/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const uploadResult = await response.json()
      
      const newDocument: DocumentUpload = {
        id: uploadResult.id || Date.now().toString(),
        type: documentType,
        file: file,
        name: file.name
      }

      setUploadedDocuments(prev => [...prev, newDocument])
      toast.success(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} uploaded successfully!`)
      
      // Clear the file input
      event.target.value = ''
    } catch (error) {
      console.error('Document upload failed:', error)
      toast.error('Failed to upload document. Please try again.')
    } finally {
      setIsUploadingDocument(false)
    }
  }

  const removeDocument = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId))
    toast.success('Document removed')
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type (images and PDFs)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, JPG, PNG, GIF, or WebP files only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsProcessing(true)
    
    try {
      console.log('Starting AI receipt parsing...')
      
      // Create form data for AI parsing
      const aiFormData = new FormData()
      aiFormData.append('file', file)
      
      // Call AI parsing API
      const response = await fetch('http://localhost:8000/api/ai/parse-receipt', {
        method: 'POST',
        body: aiFormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || 'AI parsing failed')
      }

      const result = await response.json()
      console.log('AI parsing result:', result)
      console.log('Extracted date:', result.extracted_data?.data?.date)
      console.log('Extracted category:', result.extracted_data?.data?.category)

      if (!result.success) {
        throw new Error(result.message || 'AI parsing failed')
      }

      // Extract data from our Python service response structure
      const extractedData = result.extracted_data?.data || {}

      // Helper function to convert date formats
      const convertDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0]
        
        // Handle DD.MM.YYYY format (common in receipts)
        if (dateStr.includes('.')) {
          const [day, month, year] = dateStr.split('.')
          if (day && month && year) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
        
        // Handle DD/MM/YYYY format
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/')
          if (day && month && year) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
        
        // Handle DD-MM-YYYY format
        if (dateStr.includes('-') && dateStr.length === 10) {
          const parts = dateStr.split('-')
          if (parts.length === 3 && parts[0].length === 2) {
            const [day, month, year] = parts
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
        
        // If already in YYYY-MM-DD format or fallback
        return dateStr || new Date().toISOString().split('T')[0]
      }

      // Helper function to map AI category to form category
      const mapCategory = (aiCategory: string): string => {
        if (!aiCategory) return 'Other'
        
        const categoryMapping: { [key: string]: string } = {
          'electronics': 'Electronics',
          'electronic': 'Electronics',
          'tech': 'Electronics',
          'technology': 'Electronics',
          'computer': 'Electronics',
          'phone': 'Electronics',
          'mobile': 'Electronics',
          'appliance': 'Home Appliances',
          'appliances': 'Home Appliances',
          'home': 'Home Appliances',
          'kitchen': 'Home Appliances',
          'vehicle': 'Vehicles',
          'car': 'Vehicles',
          'auto': 'Vehicles',
          'automotive': 'Vehicles',
          'furniture': 'Furniture',
          'tool': 'Tools & Equipment',
          'tools': 'Tools & Equipment',
          'equipment': 'Tools & Equipment',
          'jewelry': 'Jewelry',
          'jewellery': 'Jewelry',
          'art': 'Art & Collectibles',
          'collectible': 'Art & Collectibles',
          'collectibles': 'Art & Collectibles',
          'sport': 'Sports & Recreation',
          'sports': 'Sports & Recreation',
          'recreation': 'Sports & Recreation',
          'fitness': 'Sports & Recreation'
        }
        
        const lowerCategory = aiCategory.toLowerCase().trim()
        return categoryMapping[lowerCategory] || 'Other'
      }

      // Map AI extracted data to our form structure
      const mappedData: ParsedReceipt = {
        name: extractedData.item_name || extractedData.description || 'Unknown Item',
        category: mapCategory(extractedData.category),
        price: extractedData.price || 0,
        date: convertDate(extractedData.date),
        model: extractedData.model_number || extractedData.model,
        serialNumber: extractedData.serial_number,
        warrantyExpiry: extractedData.warranty_expiry || extractedData.warranty_period
      }
      
      console.log('Mapped data:', mappedData)
      console.log('Final form purchaseDate:', mappedData.date)
      console.log('Final form category:', mappedData.category)
      
      setParsedData(mappedData)
      setFormData({
        name: mappedData.name,
        category: mappedData.category,
        purchasePrice: mappedData.price.toString(),
        purchaseDate: mappedData.date,
        description: extractedData.description || mappedData.name,
        model: mappedData.model || '',
        serialNumber: mappedData.serialNumber || '',
        warrantyExpiry: mappedData.warrantyExpiry || ''
      })

      // Auto-upload the parsed receipt as a document
      const receiptDocument: DocumentUpload = {
        id: Date.now().toString(),
        type: 'receipt',
        file: file,
        name: file.name
      }
      setUploadedDocuments(prev => [...prev, receiptDocument])
      
      // Show success message
      toast.success(`Receipt parsed successfully! 🤖 AI extracted ${Object.keys(extractedData).length} fields. Please review and edit details if needed.`)
      
      // Clear the file input
      event.target.value = ''
      
    } catch (error) {
      console.error('AI receipt parsing failed:', error)
      toast.error(`Failed to parse receipt: ${error.message}. Please try manual entry.`)
      setActiveTab('manual')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.category || !formData.purchasePrice || !formData.purchaseDate) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate purchase price
    const purchasePrice = parseFloat(formData.purchasePrice)
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      toast.error('Please enter a valid purchase price')
      return
    }

    try {
      const assetData = {
        name: formData.name,
        category: formData.category,
        purchasePrice: purchasePrice,
        purchaseDate: formData.purchaseDate,
        status: 'active',
        description: formData.description || '',
        model: formData.model || '',
        serialNumber: formData.serialNumber || '',
        warrantyExpiry: formData.warrantyExpiry ? formData.warrantyExpiry : null
      }

      console.log('🚀 Sending asset data:', assetData)

      // Save to backend database
      const savedAsset = await apiRequest('/assets', {
        method: 'POST',
        body: JSON.stringify(assetData)
      })

      const newAssetId = savedAsset.id;
      const linkedDocuments: AssetDocument[] = [];

      // Upload and link documents if any
      if (uploadedDocuments.length > 0) {
        for (const doc of uploadedDocuments) {
          try {
            // Upload the document
            const formData = new FormData();
            formData.append('file', doc.file);
            formData.append('documentType', doc.type);

            const uploadResponse = await fetch(`${API_BASE_URL}/receipts/upload`, {
              method: 'POST',
              body: formData
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              
              // Link the document to the asset
              const linkResponse = await apiRequest('/receipts/link', {
                method: 'POST',
                body: JSON.stringify({
                  documentId: uploadResult.id,
                  assetId: newAssetId
                })
              });

              if (linkResponse.success) {
                linkedDocuments.push({
                  id: uploadResult.id,
                  type: doc.type,
                  filename: uploadResult.filename || uploadResult.originalName,
                  originalName: uploadResult.originalName,
                  url: uploadResult.url,
                  uploadDate: uploadResult.uploadDate
                });
              }
            }
          } catch (docError) {
            console.error(`Failed to upload document ${doc.file?.name}:`, docError);
            // Continue with other documents
          }
        }
      }

      // Also update local state for immediate UI update
      const newAsset: Asset = {
        id: savedAsset.id,
        name: formData.name,
        category: formData.category,
        purchasePrice: purchasePrice,
        purchaseDate: formData.purchaseDate,
        status: 'active',
        description: formData.description || undefined,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        warrantyExpiry: formData.warrantyExpiry || undefined,
        documents: linkedDocuments
      }

      setAssets(current => [...current, newAsset])
      toast.success('Asset added successfully!')
      resetForm()
    } catch (error) {
      console.error('Error saving asset:', error)
      
      // Show specific error message if it's a validation error
      if (error instanceof Error && error.message.includes('400')) {
        toast.error('Validation error: Please check your data format. See console for details.')
      } else {
        toast.error('Failed to save asset. Please try again.')
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-foreground mb-2">Deploy New Asset</h2>
        <p className="text-muted-foreground text-lg">Manual registration or AI-powered receipt parsing</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'receipt')}>
        <TabsList className="grid w-full grid-cols-2 glass-card">
          <TabsTrigger value="manual" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <PencilSimple size={18} />
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
                  <h3 className="text-2xl font-bold text-foreground mb-3">Upload Receipt</h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Upload a receipt (PDF, JPG, PNG) and our AI will extract purchase details automatically
                  </p>
                  <label htmlFor="receipt-upload">
                    <Button asChild className="bg-accent hover:bg-accent/80 text-accent-foreground px-8 py-3 text-lg rounded-xl">
                      <span className="cursor-pointer">Choose Receipt File</span>
                    </Button>
                  </label>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : isProcessing ? (
                <div className="text-center py-12">
                  <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto mb-6 animate-glow-pulse">
                    <CircleNotch size={64} className="text-primary animate-spin" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">AI Processing</h3>
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
                        <div className="font-bold text-lg text-foreground">₹{parsedData?.price}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-card/50 to-card/20 border border-border/30">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                        <div className="font-semibold text-foreground">{parsedData?.date}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => setActiveTab('manual')} variant="outline" className="glass-card hover:bg-primary/10 hover:border-primary/50">
                      <PencilSimple size={18} className="mr-2" />
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
                      <CurrencyDollar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-success" />
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
                      <Input
                        id="date"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                        className="glass-card border-border/50 focus:border-primary text-green-600"
                        style={{ colorScheme: 'dark' }}
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
                      <div className="relative">
                        <Input
                          id="warranty"
                          type="date"
                          value={formData.warrantyExpiry}
                          onChange={(e) => handleInputChange('warrantyExpiry', e.target.value)}
                          className="glass-card border-border/50 focus:border-primary text-green-600"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
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

                {/* Document Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border/30 pb-2">Documents & Receipts</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Receipt Upload */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase tracking-wider text-sm">Purchase Receipt</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(e, 'receipt')}
                          className="hidden"
                          id="receipt-upload"
                          disabled={isUploadingDocument}
                        />
                        <label htmlFor="receipt-upload">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full glass-card border-border/50 hover:border-primary/50"
                            disabled={isUploadingDocument}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <Upload size={18} className="mr-2" />
                              {isUploadingDocument ? 'Uploading...' : 'Upload Receipt'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {/* Invoice Upload */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase tracking-wider text-sm">Invoice</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(e, 'invoice')}
                          className="hidden"
                          id="invoice-upload"
                          disabled={isUploadingDocument}
                        />
                        <label htmlFor="invoice-upload">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full glass-card border-border/50 hover:border-primary/50"
                            disabled={isUploadingDocument}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <FileText size={18} className="mr-2" />
                              {isUploadingDocument ? 'Uploading...' : 'Upload Invoice'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {/* Warranty Upload */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase tracking-wider text-sm">Warranty Card</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(e, 'warranty')}
                          className="hidden"
                          id="warranty-upload"
                          disabled={isUploadingDocument}
                        />
                        <label htmlFor="warranty-upload">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full glass-card border-border/50 hover:border-primary/50"
                            disabled={isUploadingDocument}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <Shield size={18} className="mr-2" />
                              {isUploadingDocument ? 'Uploading...' : 'Upload Warranty'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {/* Manual Upload */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase tracking-wider text-sm">User Manual</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(e, 'manual')}
                          className="hidden"
                          id="manual-upload"
                          disabled={isUploadingDocument}
                        />
                        <label htmlFor="manual-upload">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full glass-card border-border/50 hover:border-primary/50"
                            disabled={isUploadingDocument}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <FileText size={18} className="mr-2" />
                              {isUploadingDocument ? 'Uploading...' : 'Upload Manual'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Documents List */}
                  {uploadedDocuments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Uploaded Documents:</h4>
                      <div className="space-y-2">
                        {uploadedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg glass-card border border-border/30">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <FileText size={16} className="text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{doc.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{doc.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Ready to upload
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDocument(doc.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
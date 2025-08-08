import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { apiRequest } from '@/lib/api'
import { 
  Plus, 
  Calendar, 
  Bell, 
  Clock,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  Wrench,
  Car,
  Lightning,
  Shield,
  Trash,
  PencilSimple
} from '@phosphor-icons/react'

interface Asset {
  id: string
  name: string
  category: string
  purchasePrice: number
  purchaseDate: string
  status: 'active' | 'sold' | 'lost' | 'broken'
}

interface Reminder {
  id: string
  assetId: string
  title: string
  description?: string
  dueDate: string
  type: string
  completed: boolean
  recurring?: boolean
  frequency?: 'monthly' | 'quarterly' | 'yearly'
  completedDate?: string
}

const reminderTypes = [
  { value: 'service', label: 'Service/Maintenance', icon: Wrench },
  { value: 'insurance', label: 'Insurance Renewal', icon: Shield },
  { value: 'warranty', label: 'Warranty Check', icon: CheckCircle },
  { value: 'cleaning', label: 'Cleaning', icon: Car },
  { value: 'inspection', label: 'Inspection', icon: Warning },
  { value: 'battery', label: 'Battery Replacement', icon: Lightning },
  { value: 'other', label: 'Other', icon: Bell }
]

export default function Reminders() {
  const [assets, setAssets] = useKV<Asset[]>('assets', [])
  const [reminders, setReminders] = useKV<Reminder[]>('reminders', [])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('pending')

  // Load data from backend on component mount
  useEffect(() => {
    loadAssetsFromAPI()
    loadRemindersFromAPI()
  }, [])

  const loadAssetsFromAPI = async () => {
    try {
      const apiAssets = await apiRequest('/assets')
      setAssets(apiAssets)
    } catch (error) {
      console.error('Failed to load assets:', error)
    }
  }

  const loadRemindersFromAPI = async () => {
    try {
      const apiReminders = await apiRequest('/reminders')
      setReminders(apiReminders)
    } catch (error) {
      console.error('Failed to load reminders:', error)
    }
  }
  
  const [formData, setFormData] = useState({
    assetId: '',
    title: '',
    description: '',
    dueDate: '',
    type: '',
    recurring: false,
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly'
  })

  const activeAssets = assets.filter(asset => asset.status === 'active')

  const resetForm = () => {
    setFormData({
      assetId: '',
      title: '',
      description: '',
      dueDate: '',
      type: '',
      recurring: false,
      frequency: 'monthly'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const getDaysUntilDue = (dateString: string) => {
    const due = new Date(dateString)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Filter reminders
  const filteredReminders = reminders.filter(reminder => {
    switch (filter) {
      case 'pending':
        return !reminder.completed && !isOverdue(reminder.dueDate)
      case 'completed':
        return reminder.completed
      case 'overdue':
        return !reminder.completed && isOverdue(reminder.dueDate)
      default:
        return true
    }
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form data:', formData)
    console.log('Active assets:', activeAssets)
    console.log('assetId type:', typeof formData.assetId)
    console.log('assetId value:', formData.assetId)
    console.log('assetId truthy:', !!formData.assetId)
    
    // Check each field individually
    const missingFields: string[] = []
    if (!formData.assetId || formData.assetId === '') missingFields.push('assetId')
    if (!formData.title || formData.title.trim() === '') missingFields.push('title')
    if (!formData.dueDate || formData.dueDate === '') missingFields.push('dueDate')
    if (!formData.type || formData.type === '') missingFields.push('type')
    
    if (missingFields.length > 0) {
      console.error('Please fill in all required fields')
      console.error('Missing fields:', missingFields)
      console.error('Current form data:', JSON.stringify(formData, null, 2))
      return
    }

    try {
      const reminderData = {
        assetId: parseInt(formData.assetId),
        title: formData.title,
        description: formData.description || null,
        dueDate: formData.dueDate,
        type: formData.type,
        recurring: formData.recurring,
        frequency: formData.recurring ? formData.frequency : null
      }

      console.log('Sending reminder data to backend:', JSON.stringify(reminderData, null, 2))

      // Save to backend
      const savedReminder = await apiRequest('/reminders', {
        method: 'POST',
        body: JSON.stringify(reminderData)
      })

      console.log('Backend response:', savedReminder)

      // Update local state
      setReminders(current => [...current, savedReminder])
      console.log('Reminder added successfully!')
      resetForm()
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to add reminder:', error)
    }
  }

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      // Update in backend using dedicated complete endpoint
      const completedReminder = await apiRequest(`/reminders/${reminderId}/complete`, {
        method: 'POST'
      })

      console.log('Completed reminder response:', completedReminder)

      // Update local state
      setReminders(current =>
        current.map(reminder => {
          if (reminder.id === reminderId) {
            const updated = { 
              ...reminder, 
              completed: true, 
              completedDate: new Date().toISOString().split('T')[0] 
            }
            
            // If recurring, create next reminder
            if (reminder.recurring && reminder.frequency) {
              const nextDate = new Date(reminder.dueDate)
              switch (reminder.frequency) {
                case 'monthly':
                  nextDate.setMonth(nextDate.getMonth() + 1)
                  break
                case 'quarterly':
                  nextDate.setMonth(nextDate.getMonth() + 3)
                  break
                case 'yearly':
                  nextDate.setFullYear(nextDate.getFullYear() + 1)
                  break
              }

              // Create next reminder automatically
              const nextReminder = {
                assetId: parseInt(reminder.assetId),
                title: reminder.title,
                description: reminder.description || null,
                dueDate: nextDate.toISOString().split('T')[0],
                type: reminder.type,
                recurring: true,
                frequency: reminder.frequency
              }

              // Add next reminder to backend
              apiRequest('/reminders', {
                method: 'POST',
                body: JSON.stringify(nextReminder)
              }).then(savedNextReminder => {
                setReminders(current => [...current, savedNextReminder])
              }).catch(error => {
                console.error('Failed to create next recurring reminder:', error)
              })
            }
            
            return updated
          }
          return reminder
        })
      )
      
      console.log('Reminder completed!')
    } catch (error) {
      console.error('Failed to complete reminder:', error)
    }
  }

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setFormData({
      assetId: reminder.assetId,
      title: reminder.title,
      description: reminder.description || '',
      dueDate: reminder.dueDate,
      type: reminder.type,
      recurring: reminder.recurring || false,
      frequency: reminder.frequency || 'monthly'
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateReminder = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingReminder || !formData.title || !formData.dueDate || !formData.type) {
      console.error('Please fill in all required fields')
      return
    }

    setReminders(current =>
      current.map(reminder =>
        reminder.id === editingReminder.id
          ? {
              ...reminder,
              title: formData.title,
              description: formData.description || undefined,
              dueDate: formData.dueDate,
              type: formData.type,
              recurring: formData.recurring,
              frequency: formData.recurring ? formData.frequency : undefined
            }
          : reminder
      )
    )
    
    console.log('Reminder updated successfully!')
    setIsEditDialogOpen(false)
    setEditingReminder(null)
    resetForm()
  }

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      // Delete from backend
      await apiRequest(`/reminders/${reminderId}`, {
        method: 'DELETE'
      })

      // Update local state
      setReminders(current => current.filter(reminder => reminder.id !== reminderId))
      console.log('Reminder deleted successfully!')
    } catch (error) {
      console.error('Failed to delete reminder:', error)
    }
  }

  const getFilterCounts = () => {
    return {
      all: reminders.length,
      pending: reminders.filter(r => !r.completed && !isOverdue(r.dueDate)).length,
      overdue: reminders.filter(r => !r.completed && isOverdue(r.dueDate)).length,
      completed: reminders.filter(r => r.completed).length
    }
  }

  const counts = getFilterCounts()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-foreground mb-2">Alert System</h2>
          <p className="text-muted-foreground text-lg">Intelligent maintenance and renewal scheduling</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/80 text-accent-foreground px-6 py-3 rounded-xl">
              <Plus size={18} className="mr-2" />
              Schedule Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md glass-card border-border/50">
            <DialogHeader>
              <DialogTitle className="text-foreground text-xl">Deploy New Alert</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddReminder} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase tracking-wider">Asset <span className="text-destructive">*</span></Label>
                <Select value={formData.assetId} onValueChange={(value) => {
                  console.log('Asset selected:', value, typeof value)
                  setFormData(prev => ({ ...prev, assetId: value }))
                }}>
                  <SelectTrigger className="glass-card border-border/50">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {activeAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id.toString()}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase tracking-wider">Reminder Type <span className="text-destructive">*</span></Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="glass-card border-border/50">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {reminderTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase tracking-wider">Title <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Annual service due"
                  className="glass-card border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase tracking-wider">Due Date <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="glass-card border-border/50 focus:border-primary text-green-600"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase tracking-wider">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details..."
                  rows={2}
                  className="glass-card border-border/50 focus:border-primary"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={formData.recurring}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, recurring: !!checked }))}
                  className="border-2 border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white bg-white/10 backdrop-blur-sm"
                />
                <Label htmlFor="recurring" className="text-muted-foreground">Recurring reminder</Label>
              </div>

              {formData.recurring && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground uppercase tracking-wider">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value as any }))}>
                    <SelectTrigger className="glass-card border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-border/50">
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-accent hover:bg-accent/80 text-accent-foreground">Deploy Alert</Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="glass-card border-border/50">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'pending', label: 'Pending', count: counts.pending, color: 'default' },
              { key: 'overdue', label: 'Overdue', count: counts.overdue, color: 'destructive' },
              { key: 'completed', label: 'Completed', count: counts.completed, color: 'secondary' },
              { key: 'all', label: 'All', count: counts.all, color: 'outline' }
            ].map(({ key, label, count, color }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                onClick={() => setFilter(key as any)}
                className={`justify-between glass-card ${filter === key ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/50'}`}
              >
                <span>{label}</span>
                <Badge variant={color as any} className={
                  key === 'overdue' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                  key === 'completed' ? 'bg-success/20 text-success border-success/30' :
                  'bg-primary/20 text-primary border-primary/30'
                }>{count}</Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="p-6 rounded-full bg-muted/20 w-fit mx-auto mb-6">
              <Bell size={64} className="text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              {filter === 'all' ? 'Alert System Inactive' : `No ${filter} Alerts`}
            </h3>
            <p className="text-muted-foreground text-lg">
              {filter === 'all' 
                ? 'Deploy alerts to maintain optimal asset performance' 
                : `No alerts match the ${filter} filter criteria`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReminders.map((reminder, index) => {
            const asset = assets.find(a => a.id === reminder.assetId)
            const typeConfig = reminderTypes.find(t => t.value === reminder.type)
            const TypeIcon = typeConfig?.icon || Bell
            const overdue = isOverdue(reminder.dueDate)
            const daysUntil = getDaysUntilDue(reminder.dueDate)
            
            return (
              <Card 
                key={reminder.id} 
                className={`glass-card transition-all duration-300 animate-slide-in-glass ${
                  overdue && !reminder.completed ? 'border-destructive/40 bg-gradient-to-r from-destructive/10 to-destructive/5' : 
                  reminder.completed ? 'border-success/30 bg-gradient-to-r from-success/10 to-success/5' :
                  'hover:border-primary/50'
                }`}
                style={{animationDelay: `${index * 100}ms`}}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        reminder.completed ? 'bg-success/20' : 
                        overdue ? 'bg-destructive/20 animate-pulse-gentle' : 
                        'bg-primary/20'
                      }`}>
                        <TypeIcon size={24} className={
                          reminder.completed ? 'text-success' : 
                          overdue ? 'text-destructive' : 
                          'text-primary'
                        } />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-xl text-foreground">{reminder.title}</h3>
                          {reminder.recurring && (
                            <Badge variant="outline" className="glass-card border-accent/30 text-accent">
                              <ArrowsClockwise size={12} className="mr-1" />
                              {reminder.frequency}
                            </Badge>
                          )}
                          {reminder.completed && (
                            <Badge className="bg-success/20 text-success border-success/30">
                              <CheckCircle size={12} className="mr-1" />
                              Complete
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-3 text-lg">
                          <span className="font-semibold">{asset?.name || 'Unknown Asset'}</span> • {typeConfig?.label}
                        </p>
                        
                        {reminder.description && (
                          <p className="text-muted-foreground mb-3 p-3 rounded-lg bg-gradient-to-r from-card/50 to-card/20 border border-border/30">
                            {reminder.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-card/50 to-card/20 border border-border/30">
                            <Calendar size={16} className="text-primary" />
                            <span className="font-medium">{formatDate(reminder.dueDate)}</span>
                          </div>
                          {!reminder.completed && (
                            <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                              overdue ? 'bg-destructive/10 border-destructive/30 text-destructive' : 
                              daysUntil <= 7 ? 'bg-accent/10 border-accent/30 text-accent' :
                              'bg-gradient-to-r from-card/50 to-card/20 border-border/30'
                            }`}>
                              <Clock size={16} />
                              <span className="font-medium">
                                {overdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days remaining`}
                              </span>
                            </div>
                          )}
                          {reminder.completed && reminder.completedDate && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border-success/30 text-success">
                              <CheckCircle size={16} />
                              <span className="font-medium">Completed {formatDate(reminder.completedDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!reminder.completed && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="bg-success hover:bg-success/80 text-success-foreground px-4 py-2"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditReminder(reminder)}
                        className="glass-card hover:bg-primary/10 hover:border-primary/50"
                      >
                        <PencilSimple size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="glass-card hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Reminder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateReminder} className="space-y-4">
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Update Reminder</Button>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
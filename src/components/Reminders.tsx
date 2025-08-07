import { useState } from 'react'
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
import { toast } from 'sonner'
import { 
  Plus, 
  Calendar, 
  Bell, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Repeat,
  Wrench,
  Car,
  Zap,
  Shield,
  Trash2,
  Edit3
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
  { value: 'inspection', label: 'Inspection', icon: AlertTriangle },
  { value: 'battery', label: 'Battery Replacement', icon: Zap },
  { value: 'other', label: 'Other', icon: Bell }
]

export default function Reminders() {
  const [assets] = useKV<Asset[]>('assets', [])
  const [reminders, setReminders] = useKV<Reminder[]>('reminders', [])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('pending')
  
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

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.assetId || !formData.title || !formData.dueDate || !formData.type) {
      toast.error('Please fill in all required fields')
      return
    }

    const newReminder: Reminder = {
      id: Date.now().toString(),
      assetId: formData.assetId,
      title: formData.title,
      description: formData.description || undefined,
      dueDate: formData.dueDate,
      type: formData.type,
      completed: false,
      recurring: formData.recurring,
      frequency: formData.recurring ? formData.frequency : undefined
    }

    setReminders(current => [...current, newReminder])
    toast.success('Reminder added successfully!')
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleCompleteReminder = (reminderId: string) => {
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
            
            const nextReminder: Reminder = {
              ...reminder,
              id: Date.now().toString() + '_next',
              dueDate: nextDate.toISOString().split('T')[0],
              completed: false,
              completedDate: undefined
            }
            
            setTimeout(() => {
              setReminders(prev => [...prev, nextReminder])
            }, 100)
          }
          
          return updated
        }
        return reminder
      })
    )
    toast.success('Reminder marked as completed!')
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
      toast.error('Please fill in all required fields')
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
    
    toast.success('Reminder updated successfully!')
    setIsEditDialogOpen(false)
    setEditingReminder(null)
    resetForm()
  }

  const handleDeleteReminder = (reminderId: string) => {
    setReminders(current => current.filter(reminder => reminder.id !== reminderId))
    toast.success('Reminder deleted successfully!')
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
                <Select value={formData.assetId} onValueChange={(value) => setFormData(prev => ({ ...prev, assetId: value }))}>
                  <SelectTrigger className="glass-card border-border/50">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {activeAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
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
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="glass-card border-border/50 focus:border-primary"
                />
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
                              <Repeat size={12} className="mr-1" />
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
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="glass-card hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                      >
                        <Trash2 size={16} />
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
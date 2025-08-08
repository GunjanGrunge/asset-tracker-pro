import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { 
  Eye, 
  EyeSlash, 
  User,
  Envelope,
  Lock,
  ArrowRight,
  Planet
} from '@phosphor-icons/react'
import logoImage from '@/logo/logo.png'

export default function Login() {
  const { signIn, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password.length < 6) {
      console.error('Password must be at least 6 characters')
      return
    }
    
    try {
      await signIn(formData.email, formData.password)
      console.log('Welcome back!')
    } catch (error: any) {
      console.error('Authentication error:', error)
      
      // Handle specific Firebase errors
      const errorCode = error.code
      let errorMessage = 'Authentication failed'
      
      switch (errorCode) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email'
          break
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password'
          break
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address'
          break
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later'
          break
        default:
          errorMessage = error.message || 'Authentication failed'
      }
      
      console.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-background font-['Inter'] cyber-grid flex items-center justify-center p-4">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-success/5 rounded-full blur-3xl animate-float" style={{animationDelay: '6s'}}></div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md glass-card border-border/50 animate-slide-in-glass relative z-10">
        <CardHeader className="text-center space-y-6 pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 glass-card border border-border/30 rounded-xl flex items-center justify-center animate-glow-pulse p-2">
              <img 
                src={logoImage} 
                alt="AssetTracker Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Planet size={24} className="text-primary" />
              AssetTracker
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Access your digital portfolio
            </p>
            {/* Limited Access Notice */}
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <span>⚠️</span>
                Access is limited to authorized users only
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Envelope size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 glass-card border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 glass-card border-border/50 focus:border-primary"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full glass-card bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white font-medium shadow-lg transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-white">Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white font-semibold">Sign In</span>
                  <ArrowRight size={16} className="text-white" />
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Secure • Encrypted • Next-Gen Authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

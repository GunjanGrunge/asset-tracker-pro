import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { 
  Eye, 
  EyeSlash, 
  GoogleLogo, 
  ShieldCheck, 
  User,
  Envelope,
  Lock,
  ArrowRight,
  Planet
} from '@phosphor-icons/react'
import logoImage from '@/logo/logo.png'

export default function Login() {
  const { signIn, signUp, signInWithGoogle, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSignUp && formData.password !== formData.confirmPassword) {
      console.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      console.error('Password must be at least 6 characters')
      return
    }
    
    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password, formData.displayName)
        console.log('Account created successfully!')
      } else {
        await signIn(formData.email, formData.password)
        console.log('Welcome back!')
      }
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
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already registered'
          break
        case 'auth/weak-password':
          errorMessage = 'Password is too weak'
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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      console.log('Welcome!')
    } catch (error: any) {
      console.error('Google sign in error:', error)
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
              {isSignUp ? 'Initialize your account' : 'Access your digital portfolio'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Auth Mode Toggle */}
          <div className="flex gap-1 p-1 glass-card rounded-lg">
            <Button
              type="button"
              variant={!isSignUp ? "default" : "ghost"}
              className={`flex-1 transition-all ${!isSignUp ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
              onClick={() => setIsSignUp(false)}
            >
              <User size={16} className="mr-2" />
              Sign In
            </Button>
            <Button
              type="button"
              variant={isSignUp ? "default" : "ghost"}
              className={`flex-1 transition-all ${isSignUp ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
              onClick={() => setIsSignUp(true)}
            >
              <ShieldCheck size={16} className="mr-2" />
              Sign Up
            </Button>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  Display Name
                </Label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="pl-10 glass-card border-border/50 focus:border-primary"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

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

            {/* Confirm Password (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 glass-card border-border/50 focus:border-primary"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full glass-card bg-primary hover:bg-primary/80 text-primary-foreground font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <Separator className="bg-border/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full glass-card border-border/50 hover:bg-muted/50 font-medium"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleLogo size={18} className="mr-2" />
            Google Account
          </Button>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Secure • Encrypted • Next-Gen Authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

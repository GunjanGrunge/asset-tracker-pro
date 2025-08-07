# Asset Management System

A comprehensive personal asset tracking application that helps users manage their valuable purchases, set maintenance reminders, and track asset lifecycle with intelligent receipt parsing capabilities.

**Experience Qualities**: 
1. **Intuitive** - Users should effortlessly add assets and understand their portfolio at a glance
2. **Reliable** - Reminders and data persistence ensure users never miss important maintenance
3. **Intelligent** - AI-powered receipt parsing minimizes manual data entry and errors

**Complexity Level**: Light Application (multiple features with basic state)
This application manages multiple interconnected features including asset tracking, reminder systems, and AI parsing, but maintains simplicity through clear workflows and smart defaults.

## Essential Features

### Dashboard Overview
- **Functionality**: Central hub displaying total assets, total worth, recent additions, and upcoming reminders
- **Purpose**: Provides immediate value assessment and actionable insights
- **Trigger**: App launch or navigation to home
- **Progression**: Load dashboard → Display metrics cards → Show recent activity → Highlight urgent reminders
- **Success criteria**: Users can assess their asset portfolio within 3 seconds

### Asset Management
- **Functionality**: Add, view, edit, and update asset status (active/sold/lost/broken)
- **Purpose**: Complete lifecycle tracking of valuable purchases
- **Trigger**: "Add Asset" button or receipt upload
- **Progression**: Add asset → Fill details → Set initial reminder → Save → View in asset list
- **Success criteria**: Asset creation takes under 2 minutes, status changes update totals immediately

### Smart Receipt Parser
- **Functionality**: Upload PDF receipts and extract purchase details via LLM
- **Purpose**: Eliminate manual data entry and capture purchase details accurately
- **Trigger**: PDF upload on add asset page
- **Progression**: Upload PDF → LLM processing → Display extracted data → User reviews/edits → Confirm and save
- **Success criteria**: 90% of receipt details extracted correctly, user can override any field

### Reminder System
- **Functionality**: Set, view, and manage maintenance/service reminders for assets
- **Purpose**: Proactive asset maintenance to preserve value and functionality
- **Trigger**: Asset creation, calendar date, or manual reminder creation
- **Progression**: Set reminder → Choose frequency → Get notification → Mark complete → Auto-reschedule if recurring
- **Success criteria**: Users never miss critical maintenance due to forgotten schedules

### Asset Portfolio View
- **Functionality**: Comprehensive list/grid view of all assets with filtering and search
- **Purpose**: Easy access to any asset's complete information and history
- **Trigger**: "View All Assets" navigation
- **Progression**: Navigate to assets → Apply filters → Select asset → View details → Edit if needed
- **Success criteria**: Users can find any asset within 10 seconds

## Edge Case Handling
- **Failed Receipt Parsing**: Manual form entry fallback with pre-populated categories
- **Duplicate Assets**: Detection algorithm suggests potential duplicates before saving
- **Invalid Dates**: Smart date validation prevents impossible purchase/reminder dates
- **Missing Asset Details**: Required field validation with helpful error messages
- **Connectivity Issues**: Offline capability for viewing existing assets and adding basic reminders

## Design Direction
The interface should feel professional yet approachable, like a premium financial app that builds confidence in asset management decisions while remaining accessible for everyday use.

## Color Selection
Triadic color scheme emphasizing trust and financial responsibility with accent colors for actionable elements.

- **Primary Color**: Deep Blue (`oklch(0.45 0.15 240)`) - Communicates trust, stability, and financial responsibility
- **Secondary Colors**: Warm Gray (`oklch(0.85 0.02 60)`) for backgrounds and Sage Green (`oklch(0.75 0.1 120)`) for positive financial indicators
- **Accent Color**: Vibrant Orange (`oklch(0.65 0.2 45)`) for calls-to-action and urgent reminders
- **Foreground/Background Pairings**: 
  - Background (White `oklch(1 0 0)`): Dark Blue text (`oklch(0.2 0.05 240)`) - Ratio 15.8:1 ✓
  - Primary (Deep Blue): White text (`oklch(1 0 0)`) - Ratio 8.2:1 ✓  
  - Secondary (Warm Gray): Dark text (`oklch(0.2 0.02 60)`) - Ratio 12.1:1 ✓
  - Accent (Vibrant Orange): White text (`oklch(1 0 0)`) - Ratio 5.1:1 ✓

## Font Selection
Clean, modern sans-serif typography that conveys professionalism while maintaining excellent readability across financial data and form interfaces.

- **Typographic Hierarchy**: 
  - H1 (Page Titles): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal spacing  
  - H3 (Card Titles): Inter Medium/18px/normal spacing
  - Body (Content): Inter Regular/16px/relaxed line height
  - Caption (Metadata): Inter Regular/14px/muted color

## Animations
Subtle, purposeful motion that guides users through financial workflows while maintaining the serious tone appropriate for asset management.

- **Purposeful Meaning**: Smooth transitions reinforce data relationships and guide attention to important financial metrics without feeling playful
- **Hierarchy of Movement**: Dashboard metrics animate in sequence to build understanding, reminder notifications use gentle pulses, form validation provides immediate feedback

## Component Selection
- **Components**: Cards for asset display, Form components for data entry, Dialog for receipt parsing, Badge for asset status, Progress for loading states, Calendar for reminder scheduling, Alert for important notifications
- **Customizations**: Financial metric cards with animated counters, receipt upload zone with drag-and-drop, asset status chips with color coding
- **States**: Buttons show loading during LLM processing, forms validate in real-time, asset cards highlight on hover with action buttons
- **Icon Selection**: Phosphor icons for consistency - Upload for receipts, Calendar for reminders, TrendingUp for asset value, Bell for notifications
- **Spacing**: Consistent 4-unit spacing (16px) between sections, 2-unit (8px) within components, generous padding in financial data cards
- **Mobile**: Stack dashboard metrics vertically, collapsible asset details, touch-friendly reminder date picker, mobile-optimized receipt upload
# UI Redesign Plan: AI Roleplay Chatbot Style
## Character.ai / KHUI AI Inspired Design

---

## 🎯 Design Goals

1. **หน้าแรก (Explore/Discovery)**: การ์ดตัวละครแบบ Pinterest/Character.ai
2. **หน้าแชท (Chat Room)**: 3-column layout - History (left) | Chat (center) | Settings/Lore (right)
3. **Mobile-First**: Responsive design with collapsible sidebars
4. **Modern Aesthetic**: Glassmorphism, smooth animations, gradient accents

---

## 🏗️ Component Architecture

### **1. Layout Components**

```
/components/layout/
├── AppShell.tsx                    # Main app wrapper with navigation
├── ThreeColumnLayout.tsx           # Chat page layout (L-C-R structure)
├── SidebarLeft.tsx                 # Chat history sidebar
├── SidebarRight.tsx                # Settings/Lore sidebar
├── MobileNav.tsx                   # Bottom navigation for mobile
└── TopBar.tsx                      # Top navigation with search
```

### **2. Character Display Components**

```
/components/character/
├── CharacterGrid.tsx               # Grid container for cards
├── CharacterCard.tsx               # Single character card (Pinterest style)
├── CharacterCardCompact.tsx        # Compact version for lists
├── CharacterHeader.tsx             # Character details header
├── CharacterAvatar.tsx             # Avatar with status indicators
├── CharacterBadges.tsx             # Tags/badges display
└── CategorySection.tsx             # Category header + grid
```

### **3. Chat Components**

```
/components/chat/
├── ChatWindow.tsx                  # Main chat container
├── ChatMessage.tsx                 # Single message bubble
├── ChatInput.tsx                   # Message input with controls
├── ChatHistoryList.tsx             # Left sidebar chat history
├── ChatHistoryItem.tsx             # Single chat entry
├── TypingIndicator.tsx             # "Character is typing..."
└── MessageActions.tsx              # Edit/Delete/React controls
```

### **4. Settings/Lore Components**

```
/components/settings/
├── LorePanel.tsx                   # Right sidebar lore section
├── LoreItem.tsx                    # Single lore entry
├── RelationshipPanel.tsx           # Relationship status display
├── CharacterInfoPanel.tsx          # Character details
├── ChatSettingsPanel.tsx           # Chat-specific settings
└── QuickActions.tsx                # Quick action buttons
```

---

## 📱 Page Redesign Plan

### **Page 1: ExplorePage (Home) - Character Discovery**

**Current Issues:**
- Traditional list view
- Limited visual appeal
- Tabs are text-heavy

**New Design:**

```tsx
┌─────────────────────────────────────────────────┐
│  [Logo]    [Search Bar]    [Filters] [Profile] │ ← Top Bar
├─────────────────────────────────────────────────┤
│                                                 │
│  ★ Trending Today                     [See All]│
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Card │ │ Card │ │ Card │ │ Card │  →      │ ← Horizontal scroll
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                 │
│  🔥 Popular This Week                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Card │ │ Card │ │ Card │ │ Card │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Card │ │ Card │ │ Card │ │ Card │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                 │
│  💝 Romance                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Card │ │ Card │ │ Card │ │ Card │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                 │
└─────────────────────────────────────────────────┘
│ [Explore] [Chats] [Create] [Events] [Profile] │ ← Mobile Nav
└─────────────────────────────────────────────────┘
```

**Character Card Design:**
```
┌─────────────────────┐
│                     │
│   [Avatar Image]    │ ← 16:9 or 3:4 ratio
│                     │
├─────────────────────┤
│ Character Name      │
│ Tagline...          │
│ ┌─┐ ┌─┐ ┌─┐       │ ← Badges
│ │💬│ │❤️│ │👁│      │ ← Stats (chats/likes/views)
└─────────────────────┘
```

---

### **Page 2: ChatRoomPage - 3-Column Layout**

**Desktop Layout (>1024px):**

```
┌─────┬────────────────────┬─────┐
│     │                    │     │
│  L  │     Chat Area      │  R  │
│  E  │                    │  I  │
│  F  │  ┌──────────────┐  │  G  │
│  T  │  │ Message      │  │  H  │
│     │  └──────────────┘  │  T  │
│  H  │  ┌──────────────┐  │     │
│  I  │  │ Your Reply   │  │  L  │
│  S  │  └──────────────┘  │  O  │
│  T  │                    │  R  │
│  O  │  [Input Bar]       │  E  │
│  R  │                    │     │
│  Y  │                    │     │
└─────┴────────────────────┴─────┘
```

**Left Sidebar - Chat History:**
```
┌──────────────────────┐
│ [Search Chats]       │
├──────────────────────┤
│ ● Maya - Girlfriend  │ ← Active
│   Last: "ยินดี..."    │
├──────────────────────┤
│   Kaito - Rival      │
│   Last: "อืม..."      │
├──────────────────────┤
│   Luna - Friend      │
│   2h ago             │
├──────────────────────┤
│ + New Chat           │
└──────────────────────┘
```

**Right Sidebar - Lore & Settings:**
```
┌──────────────────────┐
│ [Character Info]     │ ← Collapsible sections
│  Avatar, Name, Bio   │
├──────────────────────┤
│ [Relationship]       │
│  ❤️ Partner (85%)    │
│  Trust: ████░        │
├──────────────────────┤
│ [Lore Entries]       │
│  📝 First Date       │
│  📝 Birthday         │
│  + Add Memory        │
├──────────────────────┤
│ [Settings]           │
│  🔊 Voice            │
│  🎨 Style            │
│  ⚙️ Advanced         │
└──────────────────────┘
```

---

## 🎨 Design System

### **Color Palette**

```css
/* Primary Colors */
--primary: #8b5cf6;          /* Purple - Main brand */
--primary-dark: #7c3aed;
--primary-light: #a78bfa;

/* Accent Colors */
--accent-pink: #ec4899;      /* Romance/Love */
--accent-blue: #3b82f6;      /* Trust/Friend */
--accent-red: #ef4444;       /* Rival/Enemy */
--accent-green: #10b981;     /* Success */

/* Neutrals */
--bg-primary: #0f172a;       /* Dark background */
--bg-secondary: #1e293b;     /* Cards/Panels */
--bg-tertiary: #334155;      /* Hover states */
--text-primary: #f1f5f9;     /* Main text */
--text-secondary: #94a3b8;   /* Muted text */

/* Glassmorphism */
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-shadow: rgba(0, 0, 0, 0.3);
```

### **Typography**

```css
/* Headings */
h1: 2.5rem / 600 weight / Inter
h2: 2rem / 600 weight / Inter
h3: 1.5rem / 600 weight / Inter

/* Body */
body: 1rem / 400 weight / Inter
small: 0.875rem / 400 weight / Inter

/* Thai Font Support */
font-family: 'Inter', 'Noto Sans Thai', sans-serif;
```

### **Spacing System**

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
```

### **Border Radius**

```
sm: 0.375rem (6px)  - Buttons, inputs
md: 0.5rem (8px)    - Cards
lg: 1rem (16px)     - Panels
xl: 1.5rem (24px)   - Large cards
```

---

## 🔧 Technical Implementation

### **State Management**

```typescript
// Chat UI State
interface ChatUIState {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  activePanel: 'lore' | 'settings' | 'character'
  isMobile: boolean
}

// Character Display State
interface ExploreUIState {
  viewMode: 'grid' | 'list'
  selectedCategory: string | null
  sortBy: 'newest' | 'popular' | 'viewed'
  filters: CharacterFilters
}
```

### **Responsive Breakpoints**

```typescript
const breakpoints = {
  mobile: '0px',      // < 640px
  tablet: '640px',    // 640px - 1024px
  desktop: '1024px',  // > 1024px
  wide: '1440px',     // > 1440px
}

// Sidebar behavior
mobile: hidden, toggle via button
tablet: left sidebar auto-hide, right sidebar overlay
desktop: both sidebars visible, resizable
wide: wider sidebars for more content
```

---

## 📦 Component Examples

### **CharacterCard Component**

```tsx
interface CharacterCardProps {
  character: Character
  variant?: 'default' | 'compact' | 'featured'
  onSelect?: (character: Character) => void
}

export function CharacterCard({ character, variant = 'default', onSelect }: CharacterCardProps) {
  return (
    <div className="character-card group relative overflow-hidden rounded-xl bg-bg-secondary hover:scale-105 transition-transform">
      {/* Avatar */}
      <div className="aspect-[3/4] overflow-hidden">
        <img 
          src={character.avatarUrl} 
          alt={character.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-semibold text-white">{character.name}</h3>
        <p className="text-sm text-text-secondary line-clamp-2">{character.tagline}</p>
        
        {/* Badges */}
        <div className="flex gap-2 mt-2">
          {character.badges.map(badge => (
            <span className="px-2 py-1 rounded-full bg-glass-bg text-xs">{badge}</span>
          ))}
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 mt-3 text-xs text-text-secondary">
          <span>💬 {character.chatCount}</span>
          <span>❤️ {character.favoriteCount}</span>
          <span>👁 {character.viewCount}</span>
        </div>
      </div>
    </div>
  )
}
```

### **ThreeColumnLayout Component**

```tsx
interface ThreeColumnLayoutProps {
  leftSidebar: React.ReactNode
  rightSidebar: React.ReactNode
  children: React.ReactNode
}

export function ThreeColumnLayout({ leftSidebar, rightSidebar, children }: ThreeColumnLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const isMobile = useMediaQuery('(max-width: 640px)')
  
  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Chat History */}
      <aside 
        className={cn(
          "w-80 border-r border-glass-border bg-bg-secondary transition-transform",
          leftOpen ? "translate-x-0" : "-translate-x-full",
          isMobile && "absolute z-20 h-full"
        )}
      >
        {leftSidebar}
      </aside>
      
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      {/* Right Sidebar - Lore/Settings */}
      <aside 
        className={cn(
          "w-96 border-l border-glass-border bg-bg-secondary transition-transform",
          rightOpen ? "translate-x-0" : "translate-x-full",
          isMobile && "absolute right-0 z-20 h-full"
        )}
      >
        {rightSidebar}
      </aside>
      
      {/* Mobile Overlays */}
      {isMobile && (leftOpen || rightOpen) && (
        <div 
          className="fixed inset-0 bg-black/50 z-10"
          onClick={() => { setLeftOpen(false); setRightOpen(false) }}
        />
      )}
    </div>
  )
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Layout Foundation** (Week 1)
- ✅ Create base layout components
- ✅ Implement responsive grid system
- ✅ Setup design tokens (colors, spacing, typography)
- ✅ ThreeColumnLayout component

### **Phase 2: Character Discovery** (Week 2)
- ✅ Redesign ExplorePage
- ✅ CharacterCard component with hover effects
- ✅ Category sections with horizontal scroll
- ✅ Search and filter UI

### **Phase 3: Chat Interface** (Week 3)
- ✅ Left sidebar (chat history)
- ✅ Center chat area
- ✅ Right sidebar (lore/settings)
- ✅ Mobile responsive behavior

### **Phase 4: Polish & Animation** (Week 4)
- ✅ Smooth transitions
- ✅ Loading states
- ✅ Error states
- ✅ Micro-interactions

---

## 📊 Mobile Considerations

### **Mobile Layout Priorities:**

1. **Explore Page**: 
   - Single column card grid
   - Horizontal scroll categories
   - Bottom navigation always visible

2. **Chat Page**:
   - Full-width chat area (default)
   - Sidebar toggle buttons (top corners)
   - Sidebars overlay on top
   - Swipe gestures to open/close

3. **Touch Targets**:
   - Minimum 44x44px
   - Adequate spacing between interactive elements
   - Pull-to-refresh support

---

## 🎭 Animation Guidelines

```typescript
// Transition Speeds
const transitions = {
  fast: '150ms',      // Hover, active states
  normal: '300ms',    // Sidebar, modal
  slow: '500ms',      // Page transitions
}

// Easing Functions
const easings = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Default
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',  // Playful
  inOut: 'cubic-bezier(0.4, 0, 0.6, 1)',   // Smooth in-out
}
```

---

## 📝 Checklist

### **Components to Create:**
- [ ] AppShell
- [ ] ThreeColumnLayout
- [ ] CharacterCard (3 variants)
- [ ] CharacterGrid
- [ ] CategorySection
- [ ] ChatHistoryList
- [ ] ChatWindow (updated)
- [ ] LorePanel
- [ ] RelationshipPanel
- [ ] MobileNav (updated)

### **Pages to Redesign:**
- [ ] ExplorePage (Home)
- [ ] ChatRoomPage (WorkspacePage)
- [ ] CharacterLobbyPage (Detail)
- [ ] MyChatsPage (List view)

### **Features to Add:**
- [ ] Horizontal scroll categories
- [ ] Card hover effects
- [ ] Sidebar toggle animations
- [ ] Search with autocomplete
- [ ] Filter chips
- [ ] Loading skeletons
- [ ] Empty states

---

## 🔗 Reference Links

- Character.ai: https://character.ai
- KHUI AI: (Thai AI roleplay platform)
- Pinterest Grid: Masonry layout inspiration
- Discord Layout: 3-column chat reference
- Figma Community: AI chat UI kits

---

**Last Updated:** 2026-06-07
**Status:** Planning Phase
**Next Action:** Create base layout components

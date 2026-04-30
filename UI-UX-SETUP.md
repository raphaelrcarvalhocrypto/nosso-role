# UI/UX Development Setup Documentation

## Overview
This project has been configured with professional UI/UX development tools to streamline design system creation and ensure consistent, high-quality interfaces.

## Installed Tools

### 1. **shadcn/ui**
- Component library for React/Next.js
- Command: `npx shadcn@latest add [component]`
- Configuration: `components.json`

### 2. **UI UX Pro Max Skill**
- AI-powered design system generator
- Command: `uipro init --ai claude` (or other AI assistants)
- Features:
  - 67 UI styles
  - 161 color palettes
  - 57 font pairings
  - 161 industry-specific reasoning rules

### 3. **Radix UI Components**
- Unstyled, accessible UI primitives
- Installed: accordion, alert, avatar, badge, button, card, dialog, dropdown-menu, hover-card, input, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, switch, tabs, toast, toggle, tooltip

### 4. **Icons**
- `lucide-react` - Beautiful & consistent icon set

## Available Commands

### Add Components
```bash
# Add shadcn/ui components
npx shadcn@latest add [component-name]
# Example: npx shadcn@latest add button card dialog

# Available components: accordion, alert, alert-dialog, aspect-ratio, 
# avatar, badge, breadcrumb, button, calendar, card, carousel, 
# checkbox, collapsible, combobox, command, context-menu, 
# date-picker, dialog, drawer, dropdown-menu, form, hover-card, 
# input, input-otp, label, menubar, navigation-menu, pagination, 
# popover, progress, radio-group, resizable, scroll-area, select, 
# separator, sheet, skeleton, slider, sonner, switch, table, 
# tabs, textarea, toast, toggle, toggle-group, tooltip
```

### UI UX Pro Max
```bash
# Install for specific AI assistant
uipro init --ai claude      # Claude Code

uipro init --ai cursor      # Cursor

uipro init --ai windsurf    # Windsurf

# Global installation
uipro init --ai claude --global

# Update to latest version
uipro update
```

### Generate Design System
```bash
# Generate complete design system for your product
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "your product description" --design-system -p "Product Name"

# Example for SaaS dashboard:
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS analytics dashboard" --design-system -p "Analytics Pro"
```

## Project Configuration

### Tailwind CSS
- Configured in `postcss.config.mjs`
- Uses `@tailwindcss/postcss` plugin
- CSS variables enabled for theming

### Design Tokens
- Colors: rose-500, wine-500, gold-500, slate shades
- Fonts: Inter (sans-serif), Cormorant Garamond (serif)
- Dark mode support with custom variant

### Theme System
- CSS custom properties in `globals.css`
- Automatic dark mode detection
- Smooth transitions between themes

## AI Assistant Integration

### For Claude Code
```bash
# Install the skill
uipro init --ai claude

# Use natural language prompts
"Build a landing page for my beauty spa"
"Create a dashboard with dark mode"
"Add a login form with email and password"
```

### For Cursor
```bash
# Install the skill
uipro init --ai cursor
```

### For Other AI Assistants
```bash
# Available options:
uipro init --ai claude
#uipro init --ai cursor
#uipro init --ai windsurf
#uipro init --ai antigravity
#uipro init --ai copilot
#uipro init --ai kiro
#uipro init --ai codex
#uipro init --ai qoder
#uipro init --ai roocode
#uipro init --ai gemini
#uipro init --ai trae
#uipro init --ai opencode
#uipro init --ai continue
#uipro init --ai codebuddy
#uipro init --ai droid
#uipro init --ai kilocode
#uipro init --ai warp
#uipro init --ai augment

# Install for all assistants
'uipro init --ai all'
```

## Best Practices

### Component Design
1. Use shadcn/ui components as base
2. Apply Tailwind CSS consistently
3. Follow the established color palette
4. Maintain typography hierarchy
5. Implement responsive design (375px, 768px, 1024px, 1440px)

### Accessibility
- WCAG AA compliance
- Focus states visible
- Keyboard navigation supported
- cursor-pointer on interactive elements
- prefers-reduced-motion respected

### Design System
1. Start with design system generation
2. Use AI suggestions as foundation
3. Customize to match brand
4. Document deviations from system
5. Maintain consistency across features

## Available Styles (67)

### General Styles
- Minimalism & Swiss Style
- Neumorphism
- Glassmorphism
- Brutalism
- 3D & Hyperrealism
- Vibrant & Block-based
- Dark Mode (OLED)
- Accessible & Ethical
- Claymorphism
- Aurora UI
- And 57 more...

### Landing Page Styles
- Hero-Centric Design
- Conversion-Optimized
- Feature-Rich Showcase
- Minimal & Direct
- Social Proof-Focused
- Interactive Product Demo
- Trust & Authority
- Storytelling-Driven

### Dashboard Styles
- Data-Dense Dashboard
- Heat Map & Heatmap Style
- Executive Dashboard
- Real-Time Monitoring
- Drill-Down Analytics
- Comparative Analysis Dashboard
- Predictive Analytics
- User Behavior Analytics
- Financial Dashboard
- Sales Intelligence Dashboard

## Industry-Specific Rules (161)

### Categories
- Tech & SaaS
- Finance & Fintech
- Healthcare
- E-commerce
- Services & Booking
- Creative Industries
- Lifestyle & Wellness
- Emerging Technologies

Each category includes:
- Recommended UI pattern
- Style priorities
- Color mood
- Typography mood
- Key effects
- Anti-patterns to avoid

## Troubleshooting

### Component Not Found
```bash
# Check available components
npx shadcn@latest add --list
```

### Design System Generation Error
```bash
# Ensure Python 3.x is installed
python3 --version

# Check script exists
ls .claude/skills/ui-ux-pro-max/scripts/search.py

# Run with explicit path
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "your query" --design-system
```

### AI Assistant Not Recognizing Skill
```bash
# Reinstall the skill
uipro init --ai [your-ai] --offline

# Check installation
ls .claude/skills/
ls .cursor/skills/
```

## Resources

- [UI UX Pro Max GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [UI Skills Platform](https://ui-skills.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Quick Start

1. Add components as needed:
   ```bash
   npx shadcn@latest add button card dialog
   ```

2. Generate design system:
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "your product" --design-system -p "Product Name"
   ```

3. Start building with AI assistance:
   ```bash
   # Claude Code
   claude
   
   # Then use natural language prompts
   "Build a landing page using the design system"
   ```

4. Iterate and customize based on generated recommendations

## Support

For issues or questions:
- Check the documentation links above
- Review existing components in `src/components/`
- Consult the UI UX Pro Max GitHub repository
- Use the `uipro --help` command for CLI assistance

# Sales Intelligence Frontend - React Edition

A modern React-based frontend for the Sales Intelligence AI platform, providing an intuitive interface for sales professionals to access company insights, discovery data, and competitive intelligence.

## 🚀 Recent Updates (v2.1.0)

- **Enhanced Discovery UI**: Fixed key contacts and tech stack rendering with proper object structure display
- **Improved Intelligence Cards**: Better visualization of company data, contacts, and technology information
- **Enhanced Authentication**: Robust user authentication with AWS Cognito integration
- **Profile Management**: Complete user profile system with preferences and settings
- **Responsive Design**: Modern, mobile-friendly interface using Tailwind CSS
- **Real-time Data**: Live integration with backend API for fresh company intelligence

## 🎯 Features

### Core Intelligence Features
- **Company Discovery**: Comprehensive company insights with key contacts and tech stack
- **Analysis Dashboard**: Deep AI-powered analysis with pain points and opportunities
- **Overview Reports**: Quick company summaries with financial and operational data
- **Real-time Updates**: Live status updates for processing requests

### UI/UX Features
- **Modern Interface**: Clean, professional design with shadcn/ui components
- **Dark/Light Mode**: Theme switching for user preference
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Status**: Live request status tracking with progress indicators
- **Smart Navigation**: Intuitive routing and breadcrumb navigation

### User Management
- **AWS Cognito Auth**: Secure authentication with sign-up, sign-in, and password reset
- **Profile System**: User preferences, company information, and settings
- **Protected Routes**: Secure access to intelligence features
- **Session Management**: Persistent login with automatic token refresh

## 🏗️ Architecture

```
src/
├── components/           # Reusable UI components
│   ├── chat/            # Intelligence display components
│   │   ├── IntelligenceCard.tsx
│   │   ├── MessageBubble.tsx
│   │   └── SourceCredibility.tsx
│   ├── ui/              # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── Layout.tsx       # Main layout wrapper
│   ├── Navbar.tsx       # Navigation component
│   └── ProtectedRoute.tsx
├── contexts/            # React contexts
│   ├── AuthContext.tsx  # Authentication state
│   ├── ProfileContext.tsx
│   └── ProfileContextTypes.ts
├── hooks/               # Custom React hooks
│   ├── useAuth.ts
│   ├── useProfile.ts
│   └── use-toast.ts
├── lib/                 # Utility libraries
│   ├── api.ts          # API client
│   ├── config.ts       # App configuration
│   └── utils.ts        # Helper functions
├── pages/               # Main application pages
│   ├── EnhancedIntelligenceExperience.tsx
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   ├── ConfirmSignUpPage.tsx
│   └── ProfilePage.tsx
├── types/               # TypeScript definitions
│   └── api.ts
└── App.tsx             # Main application component
```

## 📦 Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Create .env file with:
VITE_API_URL=https://your-api-gateway-url.com/prod
VITE_AWS_REGION=us-west-2
VITE_AWS_USER_POOL_ID=your_user_pool_id
VITE_AWS_USER_POOL_WEB_CLIENT_ID=your_client_id
```

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

## 🎨 UI Components

### Intelligence Cards
Enhanced display components for company data:

```typescript
// IntelligenceCard with proper object rendering
<IntelligenceCard
  title="Key Contacts"
  data={contacts}
  renderItem={(contact) => (
    <div className="space-y-1">
      <div className="font-medium">{contact.name}</div>
      <div className="text-sm text-muted-foreground">{contact.title}</div>
      <div className="text-xs">{contact.approachStrategy}</div>
    </div>
  )}
/>
```

### Tech Stack Display
Color-coded technology stack visualization:

```typescript
// Tech stack with category-based styling
{techStack.current?.map((tech, index) => (
  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded">
    {tech}
  </span>
))}
```

### Discovery Interface
Comprehensive discovery insights with proper data structure handling:
- Key contacts with names, titles, and approach strategies
- Technology stack with current, planned, and vendor categories
- Company overview with financial and operational metrics
- Sources with credibility scoring and citations

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_URL=https://api.salesintelligence.com/prod
VITE_API_KEY=your_api_key  # Optional if using Cognito

# AWS Cognito Configuration
VITE_AWS_REGION=us-west-2
VITE_AWS_USER_POOL_ID=us-west-2_xxxxxxxxx
VITE_AWS_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional Features
VITE_ENABLE_ANALYTICS=true
VITE_DEBUG_MODE=false
```

### API Integration
The frontend integrates with the backend API using:

```typescript
// Enhanced API client with authentication
const apiClient = {
  getCompanyOverview: (domain: string) => 
    api.get(`/company/${domain}/overview`),
  
  getDiscoveryInsights: (domain: string) => 
    api.get(`/company/${domain}/discovery`),
    
  getAnalysis: (domain: string, searchResults: any[]) =>
    api.post(`/company/${domain}/analysis`, { searchResults }),
    
  checkRequestStatus: (requestId: string) =>
    api.get(`/requests/${requestId}`)
};
```

## 🎯 Key Features

### Enhanced Discovery Experience
- **Visual Company Cards**: Rich display of company information
- **Interactive Tech Stack**: Clickable technology categories with descriptions
- **Contact Intelligence**: Detailed contact profiles with approach strategies
- **Real-time Processing**: Live status updates during analysis generation

### Improved Data Rendering
- **Object Structure Support**: Proper rendering of complex data objects
- **Citation Integration**: Source links and credibility indicators
- **Error Handling**: Graceful fallbacks for missing or invalid data
- **Loading States**: Skeleton loaders and progress indicators

### User Experience
- **Intuitive Navigation**: Clean routing between discovery, analysis, and overview
- **Responsive Design**: Optimized for all device sizes
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized bundle size and lazy loading

## 🧪 Testing

```bash
# Run component tests
npm run test

# Run E2E tests
npm run test:e2e

# Run accessibility tests
npm run test:a11y

# Visual regression tests
npm run test:visual
```

## 🚀 Deployment

### Netlify (Recommended)
```bash
# Build command
npm run build

# Publish directory
dist

# Environment variables (set in Netlify dashboard)
VITE_API_URL=https://your-production-api.com/prod
VITE_AWS_REGION=us-west-2
VITE_AWS_USER_POOL_ID=your_prod_pool_id
VITE_AWS_USER_POOL_WEB_CLIENT_ID=your_prod_client_id
```

### AWS S3 + CloudFront
```bash
# Build for production
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Docker
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🎨 Styling & Theming

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
}
```

### Component Library
Built with shadcn/ui for consistent, accessible components:
- Button, Card, Input, Select components
- Dark/light mode support
- Consistent spacing and typography
- Professional color palette

## 📱 Mobile Support

The application is fully responsive with:
- Touch-friendly interface elements
- Optimized layouts for mobile screens
- Swipe gestures for navigation
- Mobile-specific loading states

## 🔐 Security Features

- **Secure Authentication**: AWS Cognito integration with MFA support
- **Protected Routes**: Authentication required for intelligence features
- **HTTPS Only**: Enforced secure connections
- **XSS Protection**: Sanitized data rendering
- **CSRF Protection**: Request validation and tokens

## 🚀 Performance

- **Code Splitting**: Lazy-loaded components and routes
- **Bundle Optimization**: Tree shaking and minification
- **Caching Strategy**: Intelligent API response caching
- **Image Optimization**: WebP format with fallbacks
- **CDN Integration**: Static asset optimization

## 📈 Analytics & Monitoring

- **User Analytics**: Page views, user flows, and engagement metrics
- **Error Tracking**: Real-time error monitoring and reporting
- **Performance Monitoring**: Core Web Vitals and load times
- **API Monitoring**: Request success rates and response times

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the component structure and naming conventions
4. Add tests for new components
5. Update documentation
6. Submit pull request

## 📝 License

MIT License - see LICENSE file for details.
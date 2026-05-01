import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export default function ComponentShowcasePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-medium tracking-tight text-slate-900 dark:text-slate-100 mb-4 sm:text-5xl lg:text-6xl">
            Component Library Showcase
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A collection of beautifully crafted components built with shadcn/ui and Tailwind CSS.
            Designed for consistency, accessibility, and developer experience.
          </p>
        </div>

        {/* Buttons Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif font-medium tracking-tight text-slate-900 dark:text-slate-100 mb-6 sm:text-4xl">
            Buttons
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-4 items-center mt-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif font-medium tracking-tight text-slate-900 dark:text-slate-100 mb-6 sm:text-4xl">
            Cards
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Design System</CardTitle>
                <CardDescription>
                  Comprehensive design system with 67 UI styles and 161 color palettes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Build consistent, professional interfaces with our AI-powered design system generator.
                </p>
                <Button className="w-full">Learn More</Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Component Library</CardTitle>
                <CardDescription>
                  50+ production-ready components built on Radix UI primitives.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Fully customizable components with excellent accessibility and performance.
                </p>
                <Button variant="outline" className="w-full">
                  Browse Components
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>
                  Smart code generation with Claude, Cursor, and other AI tools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Integrate AI assistants to accelerate your development workflow.
                </p>
                <Button variant="secondary" className="w-full">
                  Setup Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Alerts Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif font-medium tracking-tight text-slate-900 dark:text-slate-100 mb-6 sm:text-4xl">
            Alerts & Notifications
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Alert variant="default">
                  <span>This is a default alert message.</span>
                </Alert>
                <Alert variant="success">
                  <span>Your changes have been saved successfully!</span>
                </Alert>
                <Alert variant="warning">
                  <span>Please review the form for any errors.</span>
                </Alert>
                <Alert variant="destructive">
                  <span>Unable to delete item. Please try again.</span>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="glass border-0">
            <CardContent className="pt-8">
              <h2 className="text-4xl font-serif font-medium tracking-tight text-slate-900 dark:text-slate-100 mb-4 sm:text-5xl">
                Ready to Build Amazing Interfaces?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                Start with our component library and design system to create beautiful,
                accessible, and performant applications.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" className="px-8">
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="px-8">
                  View Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
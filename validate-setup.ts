#!/usr/bin/env node

/**
 * UI/UX Development Setup Validation Script
 * 
 * This script validates that all required tools and configurations
 * are properly installed and configured for the project.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkFile(path: string, description: string): boolean {
  const exists = existsSync(path)
  log(`  ${exists ? '✓' : '✗'} ${description}`, exists ? 'green' : 'red')
  if (!exists) {
    log(`    Path: ${path}`, 'yellow')
  }
  return exists
}

function checkCommand(command: string, description: string): boolean {
  try {
    execSync(command, { stdio: 'pipe' })
    log(`  ✓ ${description}`, 'green')
    return true
  } catch (error) {
    log(`  ✗ ${description}`, 'red')
    return false
  }
}

function checkJSONFile(path: string, description: string): boolean {
  try {
    const content = readFileSync(path, 'utf-8')
    JSON.parse(content)
    log(`  ✓ ${description}`, 'green')
    return true
  } catch (error) {
    log(`  ✗ ${description} - Invalid JSON`, 'red')
    return false
  }
}

function section(title: string) {
  log(`\n${colors.bold}${title}${colors.reset}`, 'blue')
  log('─'.repeat(60), 'blue')
}

// Main validation
log('\n' + colors.bold + 'UI/UX Development Setup Validation', 'blue')
log('═'.repeat(60), 'blue')

const rootDir = process.cwd()
const frontendDir = join(rootDir, 'frontend')

let passed = 0
let failed = 0

// Check package.json
section('Project Configuration')
passed += checkFile(join(rootDir, 'package.json'), 'Root package.json exists') ? 1 : 0
passed += checkFile(join(rootDir, 'components.json'), 'shadcn/ui components.json') ? 1 : 0
passed += checkFile(join(rootDir, 'tsconfig.json'), 'TypeScript configuration') ? 1 : 0

// Check frontend structure
section('Frontend Environment')
passed += checkFile(join(frontendDir, 'package.json'), 'Frontend package.json') ? 1 : 0
passed += checkFile(join(frontendDir, 'tsconfig.json'), 'Frontend TypeScript config') ? 1 : 0
passed += checkFile(join(frontendDir, 'postcss.config.mjs'), 'PostCSS configuration') ? 1 : 0
passed += checkFile(join(frontendDir, 'next.config.js'), 'Next.js configuration') ? 1 : 0

// Check source files
section('Source Files')
passed += checkFile(join(frontendDir, 'src', 'app', 'globals.css'), 'Global CSS file') ? 1 : 0
passed += checkFile(join(frontendDir, 'src', 'app', 'layout.tsx'), 'Root layout') ? 1 : 0
passed += checkFile(join(frontendDir, 'src', 'components', 'ui', 'button.tsx'), 'Button component') ? 1 : 0
passed += checkFile(join(frontendDir, 'src', 'components', 'ui', 'card.tsx'), 'Card component') ? 1 : 0
passed += checkFile(join(frontendDir, 'src', 'lib', 'utils.ts'), 'Utility functions') ? 1 : 0

// Check Node modules
section('Dependencies')
passed += checkCommand('npm list @radix-ui/react-button', 'Radix UI Button') ? 1 : 0
passed += checkCommand('npm list lucide-react', 'Lucide React Icons') ? 1 : 0
passed += checkCommand('npm list tailwindcss', 'Tailwind CSS') ? 1 : 0
passed += checkCommand('npm list next', 'Next.js') ? 1 : 0

// Check CLI tools
section('Development Tools')
passed += checkCommand('npx shadcn@latest --version', 'shadcn/ui CLI') ? 1 : 0
passed += checkCommand('uipro --version', 'UI UX Pro Max CLI') ? 1 : 0

// Check design system configuration
section('Design System')
passed += checkJSONFile(join(rootDir, 'components.json'), 'Component configuration') ? 1 : 0

// Summary
section('Summary')
const total = passed + failed
log(`\nTotal Checks: ${total}`, 'bold')
log(`Passed: ${passed}`, 'green')
log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green')

if (failed === 0) {
  log('\n✓ All checks passed! Your UI/UX development environment is ready.\n', 'green')
  process.exit(0)
} else {
  log('\n✗ Some checks failed. Please review the issues above.\n', 'red')
  process.exit(1)
}
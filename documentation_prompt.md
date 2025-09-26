# Claude Prompt for Internal Documentation

Use this prompt with Claude to generate comprehensive internal documentation for the Seed Financial Pricing Calculator:

---

**Prompt:**

Please create a comprehensive "Internal Document Walk Through: How to Use the Seed Financial Pricing Calculator" based on the following application details. This document should be written for internal sales team members and should include step-by-step instructions, feature explanations, and best practices.

## Application Overview

The Seed Financial Pricing Calculator is an internal web application built for generating accurate pricing quotes for bookkeeping and tax services. It features HubSpot CRM integration, approval workflows, and comprehensive quote management capabilities.

## Key Features to Document:

### 1. Authentication & Access

- Secure login system for @seedfinancial.io email addresses
- Automatic user registration for valid company emails
- HubSpot contact verification (only existing HubSpot contacts/owners can access)
- Default password: SeedAdmin1!
- User menu with logout functionality

### 2. Service Selection (Top of Page)

- Three service cards displayed in a single row:
  - **Bookkeeping**: Monthly bookkeeping, cleanup, and financial statements
  - **TaaS (Tax as a Service)**: Tax preparation, filing and planning services
  - **Other Services**: Coming soon (Payroll, FP&A Lite, AP/AR Lite)
- Click to activate/deactivate services
- Visual indicators (green checkmarks, pricing updates)
- Automatic navigation to relevant form sections

### 3. Quote Generation Process

#### Contact Information Section:

- Email verification with real-time HubSpot integration
- Visual indicators: green checkmark (verified) or red X (not found)
- Company name auto-population from HubSpot contact data
- Industry selection dropdown

#### Bookkeeping Service Configuration:

- Monthly Revenue Band selection (affects pricing multipliers)
- Monthly Transaction Volume selection
- Cleanup Complexity assessment
- Months of Cleanup Required (with approval override system)
- Approval code workflow for cleanup month overrides

#### TaaS Service Configuration:

- Number of business entities
- States filed in
- International filing requirements
- Number of business owners
- Personal 1040 inclusion
- Prior years unfiled count
- Bookkeeping quality assessment
- Seed Bookkeeping Package discount eligibility

### 4. Pricing Display & Calculations

- Real-time pricing updates as form changes
- Side-by-side layout: Quote Details | Pricing Summary
- Combined service pricing when both Bookkeeping and TaaS selected
- Individual service pricing breakdowns
- 15% Seed Package discount for existing bookkeeping clients
- Industry-specific pricing multipliers
- Dynamic fee calculations based on revenue bands and complexity

### 5. Quote Management Features

#### Save & Update Quotes:

- Auto-save functionality before HubSpot push
- Quote editing with form pre-population
- Unsaved changes warnings
- 30-day quote validity period

#### HubSpot Integration:

- Automatic deal creation with "New Business" classification
- Quote generation with proper Seed Financial company information
- Deal owner assignment to current user
- Line items automatically added from HubSpot product library
- E-signature enabled quotes
- Error handling for integration issues

#### Quote History Table:

- Search by contact email
- Sortable columns (contact, date, fees, industry)
- Quote loading for editing
- Archive functionality with confirmation dialogs
- Visual approval status indicators:
  - "Approved" (orange badge) - used approval override
  - "Override" (gray badge) - had override capability
  - "Standard" (gray text) - normal quote

### 6. Approval Workflow System

- Request Approval button triggers Slack notifications
- 4-digit approval code generation
- Codes expire after 1 hour and are single-use
- Secure approval code entry dialog
- Cleanup months field unlocking after approval
- Approval tracking in database for auditing

### 7. User Interface Features

- Modern, responsive design with Seed Financial branding
- Form navigation between Bookkeeping and TaaS sections
- Service toggle switches for combined quotes
- Reset functionality with confirmation dialogs
- Archive preference management
- Real-time form validation and error messages

## Documentation Structure Request:

Please organize the documentation into these sections:

1. **Getting Started** - Login process and initial access
2. **Understanding the Interface** - Overview of main sections
3. **Creating a New Quote** - Step-by-step walkthrough
4. **Service Configuration** - Detailed field explanations
5. **Pricing Logic** - How calculations work
6. **HubSpot Integration** - CRM features and workflows
7. **Quote Management** - Saving, editing, and archiving
8. **Approval Process** - When and how to request approvals
9. **Best Practices** - Tips for accurate quoting
10. **Troubleshooting** - Common issues and solutions

## Writing Style:

- Use clear, simple language suitable for sales team members
- Include specific examples and use cases
- Provide screenshots placeholders where helpful: [Screenshot: Description]
- Include tips, warnings, and best practices in callout boxes
- Write in a friendly, instructional tone
- Assume users are not technical but are familiar with sales processes

Please create this comprehensive internal documentation now.

---

**End of Prompt**

Copy the text above this line and paste it into a new Claude conversation to generate your internal documentation. The prompt includes all the key features and context needed for comprehensive documentation.

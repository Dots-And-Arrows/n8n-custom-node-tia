# n8n-nodes-tia

This is an n8n community node. It lets you use the **TIA (Time & Invoice Administration)** API in your n8n workflows.

TIA is a time registration and invoice management platform by Cronos. This node allows you to retrieve timesheet data, manage invoice lines, and access user information from the TIA API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) |
[Operations](#operations) |
[Credentials](#credentials) |
[Compatibility](#compatibility) |
[Usage](#usage) |
[Resources](#resources) |
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Local Development

```bash
# Install dependencies
npm install

# Build before you run
npm run build

# Start n8n with the custom node loaded (recommended)

npm run dev

# Alternative: use globally installed n8n

npm run dev:local
```

## Operations

### Timesheet

| Operation                 | Description                                                    |
| ------------------------- | -------------------------------------------------------------- |
| **Get Many**              | Retrieve all timesheets for a specific month and year          |
| **Get By Period**         | Retrieve timesheets between a start and end date               |
| **Get By User**           | Retrieve timesheets for a specific user by month and year      |
| **Get Completion Status** | Get timesheet completion status for all employees in a company |

All timesheet operations support:

- **Return All**: Fetch all results with automatic pagination
- **Limit**: Restrict the number of returned results (default: 10)

### User

| Operation    | Description                            |
| ------------ | -------------------------------------- |
| **Get Many** | Retrieve all users from the TIA system |

### Invoice Line

| Operation  | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| **Search** | Search and filter invoice lines with optional date and status filters |

**Available Filters:**

- **Created After**: Return invoice lines created on or after a specific date
- **Status ID**: Filter by invoice line status
  - `Any`: No status filter (returns all)
  - `Invoiced (6)`: Only invoiced lines
  - `Proforma / Draft (1)`: Only draft/proforma lines

**Pagination Options:**

- **Return All**: Fetch all matching results with automatic pagination
- **Limit**: Restrict the number of returned results (default: 50, applied client-side)

> **Note:** The TIA API returns invoice lines in different formats depending on query parameters. The node automatically detects and handles these formats.

## Credentials

To use this node you need the following credentials from your TIA administrator:

| Field        | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| **Base URL** | The TIA API endpoint (default: `https://api.staging.tia.cronos.be`) |
| **API Key**  | Your TIA API key (used in the `X-apikey` header)                    |
| **Username** | Your TIA username                                                   |
| **Password** | Your TIA password                                                   |

The node uses token-based authentication:

1. Credentials are exchanged for a temporary access token via `/v1/Token`
2. The token is cached and reused until it expires (with a 5-minute safety buffer)
3. Expired tokens are automatically refreshed

> **Tip:** If your API key or password contains special characters (like quotes), use "Expression" mode in n8n instead of "Fixed" mode.

## Compatibility

- Tested with n8n version **2.6.4** and **2.8.3**
- Requires Node.js **v18** or higher

## Usage

1. Add the **TIA** node to your workflow
2. Configure your TIA API credentials
3. Select a resource (**Timesheet**, **User**, or **Invoice Line**)
4. Choose an operation
5. Fill in the required parameters (dates, filters, etc.)
6. Execute the workflow

> **Tip:** For the "Get By User" operation, use the **User > Get Many** operation first to find available usernames.

### Date Format (Get By Period)

The TIA API expects dates in the format `yyyy-MM-dd HH:mm:ss:ffZ`. The node handles this conversion automatically - just select your dates using the n8n date picker.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [TIA API documentation (Swagger)](https://api.staging.tia.cronos.be/scalar/v1)
- [GitHub repository](https://github.com/Dots-And-Arrows/n8n-custom-node-tia)

## Version history

### 0.4.0

- **Timesheet Completion Status** operation for checking which employees have completed their timesheets
- Changed username field from dynamic dropdown to plain text input for AI Agent compatibility
- Updated README and DEVELOPER.md to reflect dropdown removal

### 0.3.0

- **Invoice Line resource** with Search operation
  - Filter by creation date (Created After)
  - Filter by status (Invoiced, Proforma/Draft, or Any)
  - Client-side limit support
  - Automatic detection and handling of different API response formats
- Changed default limit from 50 to 10 across all resources
- Added 404 and 429 error handling
- Added DEVELOPER.md with comprehensive developer guide

### 0.2.0

- **User resource** with Get Many operation
- Dynamic username dropdown for Get By User (loads usernames from API)
- Added Dots & Arrows logo

### 0.1.0

- Initial release
- **Timesheet resource** with Get Many, Get By Period, and Get By User operations
- Token-based authentication with automatic caching and refresh
- Pagination support for large datasets
- Date format conversion for Get By Period

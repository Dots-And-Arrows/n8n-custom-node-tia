# Developer Documentation

This document provides technical details for developers working on the TIA n8n custom node.

## Table of Contents

- [Architecture](#architecture)
- [Code Structure](#code-structure)
- [API Integration](#api-integration)
- [Important Implementation Notes](#important-implementation-notes)
- [Testing](#testing)
- [Common Issues](#common-issues)

## Architecture

The TIA node follows n8n's standard custom node architecture:

```
n8n-nodes-tia/
├── nodes/
│   └── Tia/
│       ├── Tia.node.ts              # Main node logic and execution
│       ├── descriptions/             # Field and operation definitions (modular)
│       │   ├── index.ts             # Exports all descriptions
│       │   ├── TimesheetDescription.ts
│       │   ├── UserDescription.ts
│       │   └── InvoiceLineDescription.ts
│       └── helpers/
│           └── tiaApi.ts            # API authentication and request handling
├── credentials/
│   └── TiaApi.credentials.ts        # Credential configuration
└── package.json
```

### Modular Design

Each resource (Timesheet, User, Invoice Line) has its own description file containing:
- **Operations**: Dropdown options for what actions can be performed
- **Fields**: Input fields that appear based on the selected operation

This keeps the main `Tia.node.ts` file clean and makes it easy to add new resources.

## Code Structure

### Main Node File: `Tia.node.ts`

The main node implements the `INodeType` interface with three key parts:

1. **Description** (`description: INodeTypeDescription`)
   - Defines how the node appears in n8n
   - Imports operations and fields from description files
   - Configures credentials and defaults

2. **Methods** (`methods`)
   - `loadOptions`: Methods for dynamic dropdowns
   - Example: `getUsers()` fetches users from API for the username dropdown

3. **Execute** (`async execute()`)
   - Main execution logic
   - Routes to appropriate resource handler based on `resource` and `operation` parameters
   - Returns formatted data for the next node in the workflow

### Description Files

Description files export two arrays:

```typescript
export const timesheetOperations: INodeProperties[] = [
  // Defines the operation dropdown
];

export const timesheetFields: INodeProperties[] = [
  // Defines input fields for each operation
  // Uses displayOptions.show to conditionally display fields
];
```

**Key Pattern**: Use `displayOptions.show` to control field visibility:

```typescript
{
  displayName: 'Month',
  name: 'month',
  displayOptions: {
    show: {
      resource: ['timesheet'],
      operation: ['getAll', 'getByUser'],  // Only show for these operations
    },
  },
}
```

## API Integration

### Authentication Flow

The TIA API uses token-based authentication:

1. **Initial Request**: Exchange credentials for access token
   ```
   POST /v1/Token
   Headers: X-apikey, Content-Type
   Body: { username, password }
   Response: { token, expiresOn }
   ```

2. **Subsequent Requests**: Use the token
   ```
   GET /v1/Resource
   Headers: X-apikey, Authorization: Access_token {token}
   ```

3. **Token Caching**: Token is cached in `tiaApi.ts` and reused until it expires
   - 5-minute safety buffer before expiration
   - Automatic refresh when expired

### Helper Functions: `tiaApi.ts`

Two main helper functions handle API communication:

- **`tiaApiRequest()`**: Single API request
  - Handles authentication (token fetch/refresh)
  - Makes the actual HTTP request
  - Returns response data

- **`tiaApiRequestAllItems()`**: Paginated requests
  - Automatically fetches all pages
  - Used when `returnAll` is true
  - Combines results from all pages

### Date Format

TIA API requires a specific date format: `yyyy-MM-dd HH:mm:ss:ffZ`

**Conversion Pattern**:
```typescript
// n8n provides: "2025-01-20T00:00:00" (ISO 8601)
// TIA expects: "2025-01-20 00:00:00:00Z"
const formattedDate = dateString.split('T')[0] + ' 00:00:00:00Z';
```

For end dates, use `23:59:59:99Z` to include the entire day.

## Important Implementation Notes

### Invoice Line Search: Response Format Handling

**Problem**: The TIA API `/v1/InvoiceLine/search` endpoint returns different response formats depending on query parameters.

**Formats Observed**:
1. **Wrapped Array**: `[{ "invoiceLines": [...] }]`
   - Usually when no filters are applied

2. **Direct Array**: `[invoice1, invoice2, ...]`
   - Usually when filters (createdFrom, statusId) are applied

3. **Unwrapped Object**: `{ "invoiceLines": [...] }`
   - Less common, but possible

**Solution**: The code implements format detection logic:

```typescript
let invoiceLines: IDataObject[] = [];

if (Array.isArray(responseData)) {
  if (responseData.length > 0) {
    const firstItem = responseData[0] as IDataObject;
    if (firstItem.invoiceLines && Array.isArray(firstItem.invoiceLines)) {
      // Wrapped: [{ "invoiceLines": [...] }]
      invoiceLines = firstItem.invoiceLines as IDataObject[];
    } else {
      // Direct: [invoice1, invoice2, ...]
      invoiceLines = responseData as IDataObject[];
    }
  }
} else if (responseData && typeof responseData === 'object') {
  // Unwrapped: { "invoiceLines": [...] }
  const dataObj = responseData as IDataObject;
  if (dataObj.invoiceLines && Array.isArray(dataObj.invoiceLines)) {
    invoiceLines = dataObj.invoiceLines as IDataObject[];
  }
}
```

This ensures the node works regardless of which format the API returns.

### Client-Side Limit for Invoice Lines

**Problem**: The TIA API `/v1/InvoiceLine/search` endpoint does NOT support a `limit` parameter.

**Solution**: Fetch results from API, then apply limit client-side:

```typescript
if (!returnAll && invoiceLines.length > limit) {
  invoiceLines = invoiceLines.slice(0, limit);
}
```

**Why This Matters**:
- Users expect the limit parameter to work
- We can't control API results, but we can trim them
- This is only applied when `returnAll` is false

### Dynamic Username Dropdown

The "Get By User" operation for timesheets uses a dynamic dropdown populated from the API.

**Implementation**:
1. Define `loadOptionsMethod` in the field definition:
   ```typescript
   {
     displayName: 'Username Name or ID',
     name: 'username',
     type: 'options',
     typeOptions: {
       loadOptionsMethod: 'getUsers',
     },
   }
   ```

2. Implement the method in `methods.loadOptions`:
   ```typescript
   methods = {
     loadOptions: {
       async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
         // Fetch users from API
         // Return array of { name, value } objects
       },
     },
   };
   ```

**n8n Naming Convention**: Fields with `loadOptionsMethod` must end with "Name or ID" (enforced by eslint).

## Testing

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start n8n with the custom node**:
   ```bash
   npm run dev
   ```
   This starts n8n with the custom node loaded from your local directory.

3. **Alternative (use global n8n)**:
   ```bash
   npm run dev:local
   ```

4. **Build only**:
   ```bash
   npm run build
   ```

### Testing Workflow

1. Start n8n locally (`npm run dev`)
2. Create a test workflow
3. Add the TIA node
4. Configure credentials (use staging API)
5. Test each operation
6. Check console for errors
7. Verify output data structure

### Debugging Tips

**Check the API Response**:
The code includes debugging fallbacks. For example, when no invoice lines are found:
```typescript
returnData.push({
  json: { message: 'No invoice lines found', rawResponse: responseData },
  pairedItem: { item: i },
});
```

This lets you see exactly what the API returned.

**Check Token Issues**:
Token authentication errors usually appear as 401/403 responses. Check:
- API key is correct
- Username/password are correct
- Token hasn't expired (though auto-refresh should handle this)

**Check Date Format**:
If date-based queries fail, verify the date format conversion. The API is strict about the format `yyyy-MM-dd HH:mm:ss:ffZ`.

## Common Issues

### Issue: `npm run dev` hangs

**Cause**: Old npx cache or n8n version mismatch

**Fix**:
```bash
# Update global n8n
npm install -g n8n@latest

# Clear npx cache if needed
rm -rf ~/.npm/_npx/*

# Or use dev:local instead
npm run dev:local
```

### Issue: Credentials not working after n8n upgrade

**Cause**: n8n database schema changed

**Fix**: Back up and reset the database:
```bash
cp ~/.n8n/database.sqlite ~/.n8n/database.sqlite.backup
rm ~/.n8n/database.sqlite
# Restart n8n and re-enter credentials
```

### Issue: Limit not working for Invoice Lines

**Cause**: API doesn't support limit parameter

**Expected**: This is working as designed - limit is applied client-side. If you're still seeing all results, check:
1. The code is properly extracting the invoice lines array
2. The limit is being applied after extraction (not before)
3. You've rebuilt after code changes: `npm run build`

### Issue: Empty results `[{}]`

**Cause**: Response format detection failed

**Fix**: Check the `rawResponse` in the output to see what the API actually returned. Update the detection logic if needed.

### Issue: Dynamic dropdown not loading

**Cause**:
- API request failed (check credentials)
- Method name mismatch
- Rate limiting (429 response)

**Fix**:
- Verify credentials are configured
- Check method name matches `loadOptionsMethod` value
- Wait a moment if rate limited

## Adding New Resources

To add a new resource (e.g., "Project"):

1. **Create description file**: `descriptions/ProjectDescription.ts`
   ```typescript
   import type { INodeProperties } from 'n8n-workflow';

   export const projectOperations: INodeProperties[] = [
     {
       displayName: 'Operation',
       name: 'operation',
       type: 'options',
       displayOptions: { show: { resource: ['project'] } },
       options: [
         { name: 'Get Many', value: 'getAll', action: 'Get many projects' },
       ],
       default: 'getAll',
     },
   ];

   export const projectFields: INodeProperties[] = [
     // Define fields for each operation
   ];
   ```

2. **Export from index**: `descriptions/index.ts`
   ```typescript
   export * from './ProjectDescription';
   ```

3. **Add to resource list**: `Tia.node.ts`
   ```typescript
   {
     displayName: 'Resource',
     options: [
       // ... existing resources
       { name: 'Project', value: 'project', description: 'Operations on projects' },
     ],
   }
   ```

4. **Import and spread fields**: `Tia.node.ts`
   ```typescript
   import { projectOperations, projectFields } from './descriptions';

   properties: [
     // ... existing properties
     ...projectOperations,
     ...projectFields,
   ]
   ```

5. **Implement execute logic**: `Tia.node.ts`
   ```typescript
   if (resource === 'project') {
     if (operation === 'getAll') {
       const endpoint = '/v1/Project';
       const responseData = await tiaApiRequest.call(this, 'GET', endpoint);
       // Format and return data
     }
   }
   ```

6. **Test and document**: Update README.md with the new resource.

## Overriding ESLint Rules

n8n enforces strict linting rules for custom nodes to ensure consistency and best practices. However, sometimes you need to deviate from these rules for valid reasons.

### When to Override Rules

Only override ESLint rules when you have a **good reason** and understand the implications. Common valid reasons:
- **Custom defaults**: n8n enforces `limit` default of 50, but your API or use case needs a different value
- **API-specific constraints**: Your API has different conventions than n8n's standards
- **Intentional design decisions**: You've made a conscious choice to deviate from the standard

### How to Override Rules

**Method 1: Inline Comments (Recommended for specific cases)**

Use `eslint-disable-next-line` to disable a rule for a single line:

```typescript
// Disable rule for the next line only
// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
default: 10,
```

**Better: Add explanation of WHY you're disabling the rule:**

```typescript
// We use a default of 10 instead of n8n's standard 50 because our API
// returns large objects and 50 results would be too much data
// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
default: 10,
```

**Method 2: File-level Comments (For multiple violations in one file)**

At the top of the file:

```typescript
/* eslint-disable n8n-nodes-base/node-param-default-wrong-for-limit */
// ... rest of file
```

**Method 3: Project-level Config (For project-wide overrides)**

Create `.eslintrc.js` in the project root:

```javascript
module.exports = {
  rules: {
    'n8n-nodes-base/node-param-default-wrong-for-limit': 'off',
  },
};
```

**Note**: The n8n build tool may not always respect `.eslintrc.js` files, so inline comments are more reliable.

### Common n8n ESLint Rules

| Rule | Purpose | When to Override |
|------|---------|-----------------|
| `node-param-default-wrong-for-limit` | Enforces limit default of 50 | When you need a different default limit (explain why in comments) |
| `node-param-display-name-wrong-for-dynamic-options` | Requires "Name or ID" suffix for dynamic options | Rarely (this is important for UX) |
| `node-param-placeholder-miscased-id` | Enforces proper casing for ID placeholders | Very rarely (usually indicates a real issue) |

### Example: Custom Limit Default

In this project, we use a limit default of 10 instead of 50:

```typescript
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  typeOptions: {
    minValue: 1,
  },
  // We use 10 as default instead of n8n's standard 50 because:
  // - Invoice line objects are large with nested data
  // - Most users need only recent results
  // - Reduces initial load time and data transfer
  // eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
  default: 10,
  description: 'Max number of results to return',
}
```

**Files with ESLint overrides:**
- `descriptions/InvoiceLineDescription.ts` - Custom limit default (10 instead of 50)
- `descriptions/TimesheetDescription.ts` - Custom limit default (10 instead of 50)

### Finding Rule Names

If you need to disable a rule but don't know its name, run ESLint with JSON output:

```bash
npx eslint path/to/file.ts --format=json
```

This shows the `ruleId` field which is the exact rule name to use in disable comments.

### Best Practices

1. **Document WHY**: Always add a comment explaining why you're disabling the rule
2. **Be specific**: Use `eslint-disable-next-line` instead of disabling for entire files
3. **Review regularly**: Periodically check if the override is still necessary
4. **Minimize overrides**: Only disable rules when truly needed
5. **Team discussion**: For project-wide overrides, discuss with the team first

## Code Style

- Use TypeScript strict mode
- Follow n8n eslint rules (automatically enforced)
- Add JSDoc comments for complex logic
- Use descriptive variable names
- Keep functions focused and small
- Add inline comments for non-obvious code

## Resources

- [n8n Node Development Docs](https://docs.n8n.io/integrations/creating-nodes/)
- [TIA API Documentation](https://api.staging.tia.cronos.be/scalar/v1)
- [n8n Community Nodes](https://docs.n8n.io/integrations/#community-nodes)

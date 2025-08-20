# Victron VRM MCP Server

A Model Context Protocol (MCP) server that provides read-only access to Victron VRM data.

## Features

- Read-only access to Victron VRM API
- Supports all major VRM endpoints for monitoring:
  - User information
  - Installation listings
  - System overview
  - Time-series statistics
  - Aggregated statistics
  - Alarms
  - Diagnostics
  - Widget graphs
- Full input validation and error handling
- Rate limiting awareness
- Comprehensive test coverage

## Installation

```bash
npm install
npm run build
```

## Configuration

Set the following environment variables:

- `VRM_TOKEN` (required): Your VRM personal access token
- `VRM_BASE_URL` (optional): Default is `https://vrmapi.victronenergy.com/v2`
- `VRM_TOKEN_KIND` (optional): Either `Token` (default) or `Bearer`

### Getting a VRM Token

1. Log into VRM Portal
2. Go to Preferences → Integrations → Access tokens
3. Create a new personal access token
4. Copy the token and set it as `VRM_TOKEN`

## Usage

### As MCP Server (stdio)

```bash
VRM_TOKEN=your-token-here npm start
```

### Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "vrm": {
      "command": "node",
      "args": ["/path/to/victron_vrm_mcp/dist/index.js"],
      "env": {
        "VRM_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Available Tools

### vrm.get_user_me
Get current user information including user ID.

### vrm.list_installations
List all installations accessible to the authenticated user.

### vrm.get_system_overview
Get high-level system overview for a specific site.

### vrm.get_stats
Retrieve time-series statistics (venus, live_feed, consumption, kwh, solar_yield, forecast).

### vrm.get_overall_stats
Get aggregated totals for specified attribute codes over a period.

### vrm.get_alarms
Retrieve alarms for a site.

### vrm.get_diagnostics
Get most recent diagnostic datapoints.

### vrm.get_widget_graph
Fetch widget graph data for specific device instances.

## Development

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Type checking
npm run typecheck

# Development mode with watch
npm run dev
```

## Testing

The project includes comprehensive unit tests for:
- Schema validation
- VRM client functionality
- MCP server integration
- Error handling
- Edge cases

Run tests with:

```bash
npm test
```

## Security

- Never logs tokens or sensitive data
- Strict path allowlisting
- Input validation on all tools
- Read-only operations only

## License

ISC
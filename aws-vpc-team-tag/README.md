# AWS VPC Team Tag Policy

## Overview

This policy pack enforces that all AWS VPC resources have a `team` tag with a value that follows the `team-*` prefix pattern.

## Policy Details

- **Policy Name**: `aws-vpc-requires-team-tag`
- **Enforcement Level**: `mandatory` (blocks deployments that don't comply)
- **Resource Type**: `aws:ec2/vpc:Vpc`

## Requirements

All AWS VPC resources must have:
- A `team` tag present
- The tag value must start with `team-` prefix
- Valid examples: `team-a`, `team-b`, `team-platform`, `team-infrastructure`
- Invalid examples: `teamA`, `a-team`, `team`, `engineering`

## Usage

### Publishing the Policy Pack

To publish this policy pack to your Pulumi organization:

```bash
cd aws-vpc-team-tag
npm install
pulumi policy publish
```

### Enabling the Policy Pack

Enable the policy pack for your organization or specific stacks through the Pulumi Cloud console or CLI:

```bash
# Enable for entire organization
pulumi policy enable pequod/aws-vpc-team-tag latest

# Enable for specific stack
pulumi policy enable pequod/aws-vpc-team-tag latest --stack my-project/my-stack
```

## Example Compliant Code

### TypeScript
```typescript
import * as aws from "@pulumi/aws";

const vpc = new aws.ec2.Vpc("my-vpc", {
    cidrBlock: "10.0.0.0/16",
    tags: {
        team: "team-platform",  // ✅ Valid: follows team-* pattern
        environment: "production",
    },
});
```

### Python
```python
import pulumi_aws as aws

vpc = aws.ec2.Vpc("my-vpc",
    cidr_block="10.0.0.0/16",
    tags={
        "team": "team-platform",  # ✅ Valid: follows team-* pattern
        "environment": "production",
    })
```

## Example Non-Compliant Code

### Missing team tag
```typescript
const vpc = new aws.ec2.Vpc("my-vpc", {
    cidrBlock: "10.0.0.0/16",
    tags: {
        environment: "production",  // ❌ Missing team tag
    },
});
```

### Invalid team tag format
```typescript
const vpc = new aws.ec2.Vpc("my-vpc", {
    cidrBlock: "10.0.0.0/16",
    tags: {
        team: "platform",  // ❌ Invalid: doesn't start with team-
    },
});
```

## Error Messages

When the policy is violated, you'll see one of these error messages:

1. **Missing tags entirely**:
   ```
   AWS VPC must have a 'team' tag. The tag value must follow the pattern 'team-*' 
   (e.g., team-a, team-b, team-platform).
   ```

2. **Missing team tag**:
   ```
   AWS VPC must have a 'team' tag. The tag value must follow the pattern 'team-*' 
   (e.g., team-a, team-b, team-platform).
   ```

3. **Invalid team tag format**:
   ```
   AWS VPC 'team' tag value must follow the pattern 'team-*' 
   (e.g., team-a, team-b, team-platform). Current value: 'platform'
   ```

## Remediation

If you encounter a policy violation:

1. Add a `team` tag to your VPC resource
2. Ensure the value starts with `team-` prefix
3. Use a descriptive team identifier after the prefix (e.g., `team-platform`, `team-data`, `team-security`)

## Development

### Testing Locally

You can test the policy locally before publishing:

```bash
# In your Pulumi project directory
pulumi preview --policy-pack ../path/to/aws-vpc-team-tag
```

### Modifying the Policy

1. Edit `index.ts` to modify the policy logic
2. Run `npm install` to ensure dependencies are installed
3. Run `npx tsc --noEmit` to validate TypeScript compilation
4. Test with a sample project before publishing

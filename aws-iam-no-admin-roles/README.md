# AWS IAM No Admin Roles Policy

## Overview

This policy pack prevents the creation of IAM roles with administrator permissions. It enforces security best practices by blocking roles that have overly permissive access to AWS resources.

## Policy Details

- **Policy Name**: `aws-iam-role-no-admin-permissions`
- **Enforcement Level**: `mandatory` (blocks deployments that don't comply)
- **Resource Type**: `aws:iam/role:Role`

## What This Policy Blocks

This policy prevents IAM roles with administrator-level permissions by detecting:

1. **Inline policies** with wildcard permissions (`Action: "*"` and `Resource: "*"`)
2. **Managed policy attachments** that grant admin access:
   - `arn:aws:iam::aws:policy/AdministratorAccess`
   - `arn:aws:iam::aws:policy/IAMFullAccess`
3. **Assume role policies** with wildcard permissions (though this is rare)

## Usage

### Publishing the Policy Pack

To publish this policy pack to your Pulumi organization:

```bash
cd aws-iam-no-admin-roles
npm install
pulumi policy publish
```

### Enabling the Policy Pack

Enable the policy pack for your organization or specific stacks through the Pulumi Cloud console or CLI:

```bash
# Enable for entire organization
pulumi policy enable pequod/aws-iam-no-admin-roles latest

# Enable for specific stack
pulumi policy enable pequod/aws-iam-no-admin-roles latest --stack my-project/my-stack
```

## Example Non-Compliant Code

### Inline Policy with Admin Permissions (TypeScript)
```typescript
import * as aws from "@pulumi/aws";

// ❌ This will be blocked
const adminRole = new aws.iam.Role("admin-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: { Service: "ec2.amazonaws.com" },
        }],
    }),
    inlinePolicies: [{
        name: "admin-policy",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: "*",      // ❌ Wildcard action
                Resource: "*",    // ❌ Wildcard resource
            }],
        }),
    }],
});
```

### Managed Policy with Admin Permissions (Python)
```python
import pulumi_aws as aws
import json

# ❌ This will be blocked
admin_role = aws.iam.Role("admin-role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {"Service": "ec2.amazonaws.com"},
        }],
    }),
    managed_policy_arns=[
        "arn:aws:iam::aws:policy/AdministratorAccess",  # ❌ Admin policy
    ])
```

## Example Compliant Code

### Limited Permissions with Inline Policy (TypeScript)
```typescript
import * as aws from "@pulumi/aws";

// ✅ This is allowed - specific permissions only
const s3ReadRole = new aws.iam.Role("s3-read-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: { Service: "ec2.amazonaws.com" },
        }],
    }),
    inlinePolicies: [{
        name: "s3-read-policy",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: ["s3:GetObject", "s3:ListBucket"],  // ✅ Specific actions
                Resource: [
                    "arn:aws:s3:::my-bucket",
                    "arn:aws:s3:::my-bucket/*"
                ],  // ✅ Specific resources
            }],
        }),
    }],
});
```

### Limited Permissions with Managed Policy (Python)
```python
import pulumi_aws as aws
import json

# ✅ This is allowed - read-only access
readonly_role = aws.iam.Role("readonly-role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {"Service": "ec2.amazonaws.com"},
        }],
    }),
    managed_policy_arns=[
        "arn:aws:iam::aws:policy/ReadOnlyAccess",  # ✅ Read-only policy
    ])
```

## Error Messages

When the policy is violated, you'll see one of these error messages:

1. **Inline policy with admin permissions**:
   ```
   IAM Role has an inline policy 'admin-policy' that grants administrator permissions 
   (Action: "*", Resource: "*"). This is not allowed for security reasons.
   ```

2. **Managed policy with admin permissions**:
   ```
   IAM Role has attached managed policy 'arn:aws:iam::aws:policy/AdministratorAccess' 
   that grants administrator permissions. This is not allowed for security reasons.
   ```

3. **Assume role policy with admin permissions**:
   ```
   IAM Role has an assume role policy that grants administrator permissions 
   (Action: "*", Resource: "*"). This is not allowed for security reasons.
   ```

## Remediation

If you encounter a policy violation:

1. **Review the permissions**: Determine what specific AWS actions and resources the role actually needs
2. **Apply least privilege**: Grant only the minimum permissions required for the role's function
3. **Use specific actions**: Replace `"*"` with specific actions like `["s3:GetObject", "s3:PutObject"]`
4. **Use specific resources**: Replace `"*"` with specific resource ARNs
5. **Consider AWS managed policies**: Use AWS-provided policies like `ReadOnlyAccess`, `PowerUserAccess`, or service-specific policies instead of `AdministratorAccess`

## Security Rationale

Administrator permissions (`Action: "*"`, `Resource: "*"`) grant unrestricted access to all AWS services and resources. This violates the principle of least privilege and creates significant security risks:

- **Blast radius**: A compromised role with admin access can affect all resources in the account
- **Compliance**: Many security frameworks (CIS, PCI-DSS, SOC 2) require least-privilege access
- **Auditability**: Overly broad permissions make it difficult to track what actions a role actually performs
- **Accidental damage**: Admin permissions increase the risk of unintended resource modifications or deletions

## Development

### Testing Locally

You can test the policy locally before publishing:

```bash
# In your Pulumi project directory
pulumi preview --policy-pack ../path/to/aws-iam-no-admin-roles
```

### Modifying the Policy

1. Edit `index.ts` to modify the policy logic
2. Run `npm install` to ensure dependencies are installed
3. Run `npx tsc --noEmit` to validate TypeScript compilation
4. Test with a sample project before publishing

## Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Principle of Least Privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege)
- [Pulumi Policy as Code](https://www.pulumi.com/docs/using-pulumi/crossguard/)

import { PolicyPack, ResourceValidationPolicy } from "@pulumi/policy";

/**
 * Helper function to check if a policy document grants admin permissions.
 * Admin permissions are defined as policies that allow all actions (*) on all resources (*).
 */
function hasAdminPermissions(policyDocument: any): boolean {
  if (!policyDocument || typeof policyDocument !== "object") {
    return false;
  }

  // Parse the policy document if it's a string
  let policy = policyDocument;
  if (typeof policyDocument === "string") {
    try {
      policy = JSON.parse(policyDocument);
    } catch (e) {
      // If we can't parse it, we can't validate it - allow it through
      return false;
    }
  }

  // Check if the policy has statements
  if (!policy.Statement || !Array.isArray(policy.Statement)) {
    return false;
  }

  // Check each statement for admin-level permissions
  for (const statement of policy.Statement) {
    // Only check Allow statements
    if (statement.Effect !== "Allow") {
      continue;
    }

    // Check if Action is "*" or includes "*"
    const actions = Array.isArray(statement.Action)
      ? statement.Action
      : [statement.Action];
    const hasWildcardAction = actions.some(
      (action: string) => action === "*",
    );

    // Check if Resource is "*" or includes "*"
    const resources = Array.isArray(statement.Resource)
      ? statement.Resource
      : [statement.Resource];
    const hasWildcardResource = resources.some(
      (resource: string) => resource === "*",
    );

    // If both Action and Resource are wildcards, this is admin access
    if (hasWildcardAction && hasWildcardResource) {
      return true;
    }
  }

  return false;
}

/**
 * List of AWS managed policy ARNs that grant admin access.
 */
const ADMIN_MANAGED_POLICIES = [
  "arn:aws:iam::aws:policy/AdministratorAccess",
  "arn:aws:iam::aws:policy/IAMFullAccess",
];

new PolicyPack("aws-iam-no-admin-roles", {
  policies: [
    {
      name: "aws-iam-role-no-admin-permissions",
      description:
        "Prevents creation of IAM roles with administrator permissions. " +
        "This includes roles with inline policies granting '*' actions on '*' resources, " +
        "or roles with attached managed policies like AdministratorAccess.",
      enforcementLevel: "mandatory",
      validateResource: (args, reportViolation) => {
        // Only validate AWS IAM Role resources
        if (args.type !== "aws:iam/role:Role") {
          return;
        }

        // Check inline policies
        const inlinePolicies = args.props.inlinePolicies;
        if (inlinePolicies && Array.isArray(inlinePolicies)) {
          for (const inlinePolicy of inlinePolicies) {
            if (inlinePolicy.policy && hasAdminPermissions(inlinePolicy.policy)) {
              reportViolation(
                `IAM Role has an inline policy '${inlinePolicy.name || "unnamed"}' that grants administrator permissions ` +
                  `(Action: "*", Resource: "*"). This is not allowed for security reasons.`,
              );
              return;
            }
          }
        }

        // Check assume role policy (shouldn't grant admin, but let's be thorough)
        const assumeRolePolicy = args.props.assumeRolePolicy;
        if (assumeRolePolicy && hasAdminPermissions(assumeRolePolicy)) {
          reportViolation(
            "IAM Role has an assume role policy that grants administrator permissions " +
              "(Action: \"*\", Resource: \"*\"). This is not allowed for security reasons.",
          );
          return;
        }

        // Check managed policy ARNs
        const managedPolicyArns = args.props.managedPolicyArns;
        if (managedPolicyArns && Array.isArray(managedPolicyArns)) {
          for (const policyArn of managedPolicyArns) {
            if (
              typeof policyArn === "string" &&
              ADMIN_MANAGED_POLICIES.some((adminArn) =>
                policyArn.includes(adminArn),
              )
            ) {
              reportViolation(
                `IAM Role has attached managed policy '${policyArn}' that grants administrator permissions. ` +
                  `This is not allowed for security reasons.`,
              );
              return;
            }
          }
        }
      },
    } as ResourceValidationPolicy,
  ],
});

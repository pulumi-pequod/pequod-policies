# approved-component-versions policy pack

The policy pack in this folder does the following:
* Validate that a stack is using the approved version of a component resource package. 

## Implementation Details

This policy pack uses policy config to manage the list of approved component versions. 
See [Policy Custom Configuration](https://www.pulumi.com/docs/iac/using-pulumi/crossguard/configuration/#custom-configuration).

The list of approved component versions can be managed as part of the component authoring/submission process and that process can then run `pulumi policy enable --config` to update the configuration.
See [Policy CLI](https://www.pulumi.com/docs/iac/using-pulumi/crossguard/configuration/#enabling-the-policy-pack).

## How to Publish Policy AND Configuration
### Publish the Policy

If the policy is updated perform the following steps:
* Update the version field in `package.json` 
* `npm i` 
* `pulumi policy publish pequod`

Go into the Pulumi Cloud UI and update policy groups that use the policy pack to use the latest version of the policy pack.

## Publish the Configuration for the Policy

**THIS POLICY PACK'S CONFIGRUATION IS MANAGED BY THE COMPONENTS' REPOS GITHUB ACTIONS**

**ONLY PERFORM THESE STEPS IF ADDING THE POLICY PACK TO A NEW POLICY GROUP**

Evaluate and push the policy config file for the `default-policy-group`:
(REPLACE `X.Y.Z` with the latest version of the policy pack.)
* `pulumi policy validate-config pequod/approved-component-versions X.Y.Z --config ./approved-component-versions.json --policy-group default-policy-group`
* `pulumi policy enable pequod/approved-component-versions X.Y.Z --config ./approved-component-versions.json --policy-group default-policy-group`

The `--policy-group` parameter can be used to push the config to other policy groups. 

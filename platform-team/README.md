# platform-team policies

The policy pack in this folder does the following:
* Validate that a stack is using approved components instead of declaring resources directly in the Pulumi program.
  * The premise is that a platform team wants to make sure teams are using vetted abstractions (i.e. components) that capture the organization's best practices.
* Validate that if a resource is created outside of an approved component, that it is a resource that is an "allowed type".

## Implementation Details

This policy pack uses policy config to manage the list of approved components outside of the policy pack itself.
See [Policy Custom Configuration](https://www.pulumi.com/docs/iac/using-pulumi/crossguard/configuration/#custom-configuration).

The idea is that the list of approved components can be managed as part of the component authoring/submission process and that process can then run `pulumi policy enable --config` to update the configuration.
See [Policy CLI](https://www.pulumi.com/docs/iac/using-pulumi/crossguard/configuration/#enabling-the-policy-pack).

## How to Publish Policy AND Configuration
### Publish the Policy

If the policy is updated perform the following steps:
* Update the version field in `package.json` 
* `npm i` 
* `pulumi policy publish pequod`

Go into the Pulumi Cloud UI and udpate policy groups that use the policy pack to use the latest version of the policy pack.

## Publish the Configuration for the Poliy
Evaluate and push the policy config file:
* `pulumi policy validate-config pequod/platform-team 1.3.0 --config ./platform-team-policy.json`
* `pulumi policy enable pequod/platform-team 1.3.0 --config ./platform-team-policy.json`

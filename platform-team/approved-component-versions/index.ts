import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import { log } from "@pulumi/pulumi";

new PolicyPack("approved-component-versions", {
    policies: [
        // Component version check.
        // This policy checks that if a component is used, it is the correct version.
        // It uses "validateStack" instead of "validateResource" only to show it's use.
        // Because "validateStack" is called after all resources have been validated, it introduces a loop-hole in that if one uses
        // `pulumi up --skip-preview` this policy will not stop the udpate even if the policy is set to mandatory.
        // But an assumption is that using an old version would likely not be a mandatory policy and thus shouldn't halt the update.
        // Plus uing "validateStack" allows for a nice summary of all the resources that are out of date. 
        {
            name: "approved-component-versions",
            description: "VALIDATES: If a component is used, it is the correct version.",
            enforcementLevel: "advisory",
            // Uses policy config. See README for links to docs.
            // See colocated `platform-team-policy.json` for the config file.
            // NOTE: That the versions in the config are all set to cause this policy to fire.
            configSchema: {
                properties: {
                    allowedComponentVersions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: {
                                    type: "string"
                                },
                                version: {
                                    type: "string"
                                }
                            },
                            required: ["type", "version"]
                        },
                        default: []
                    }
                }
            },
            validateStack: (stack, reportViolation) => {
                interface ComponentInfo {
                    type: string;
                    version: string;
                }
                // Get list of approved components from policy configuration.
                // This is an array of objects where the key is the component type and the value is the version.
                const allowedComponentVersions = stack.getConfig<{allowedComponentVersions: ComponentInfo[]}>().allowedComponentVersions;

                // Cycle through the resources and check the type and version of any providers that match the approved components.
                // First narrow down the list of resources to just the ones that are provider types.
                const providerTypeRegExp =  new RegExp("pulumi:providers")
                let resourcesToCheck = stack.resources.filter(resource => providerTypeRegExp.test(resource.type))

                let outofdateComponents = [] as string[];
                resourcesToCheck.forEach((resource) => {
                    const providerResourceBaseName = resource.type.split(":")[2];
                    const providerResourceVersion = resource.props.version;
                    // Need to see if the component is using the correct version.
                    const matchingComponent = allowedComponentVersions.find(component => component.type.split(":")[0] == providerResourceBaseName);
                    if (matchingComponent && matchingComponent.version != providerResourceVersion) {
                        outofdateComponents.push(matchingComponent.type);
                    }   
                })
                // Throw an error if there are resources created outside of approved components.
                if (outofdateComponents.length > 0) {
                    const outofdateComponentsString = outofdateComponents.join(", ");
                    reportViolation(
                        `This stack is using out of date versions of the following components:\n${outofdateComponentsString}`
                    );
                }
            }
        }
    ]
});

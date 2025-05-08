import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import { log } from "@pulumi/pulumi";

new PolicyPack("platform-team", {
    policies: [
        //// Component usage and allowed resource types check
        {
            name: "check-component-usage",
            description: "COMPONENT USAGE CHECK:Verifies approved components are used.",
            enforcementLevel: "advisory",
            // Uses policy config. See README for links to docs.
            // See colocated `platform-team-policy.json` for the config file and note how the JSON object is keyed by the policy name. 
            configSchema: {
                properties: {
                    approvedComponentTypess: {
                        type: "array",
                    },
                    allowedResourceTypes: {
                        type: "array",
                    }
                }
            },
            validateResource: (res, reportViolation) => {
                // Ignore provider resources and the stack itself.
                const ignoreTypeRegExp =  new RegExp("pulumi:providers|pulumi:pulumi:Stack")
                if (ignoreTypeRegExp.test(res.type)) {
                    log.debug(`Ignoring resource, ${res.name} since it is of type ${res.type}`);
                    return;
                }

                // Get list of approved components from policy configuration.
                // This is an array of objects where the key is the component type and the value is the version.
                const approvedComponents = res.getConfig<{approvedComponentTypes: string[]}>().approvedComponentTypes;
                if (!approvedComponents) {
                    log.error("No approved components found in policy configuration.");
                    return;
                }

                // Get list of allowed types
                // This is an array of resource types that are allowed to be used outside of a component.
                const allowedTypes = res.getConfig<{allowedResourceTypes: string[]}>().allowedResourceTypes;
                if (!allowedTypes) {
                    log.error("No allowed types found in policy configuration.");
                    return;
                }

                // Now check if the resource is parented to the stack since these are the resources declared directly in the program.
                // If so, by definition these are the resources we care about.
                // We can ignore any resources that are not direct children of the stack since the assumption is that if 
                // a resource is declared in the program that uses an approved component, it doesn't matter what that component's
                // children resources are since it's an approved component.
                // And similarly, if the resource is an approved type, that's acceptable.
                
                // Check if the resource has a parent defined. 
                // It should since the provider/stack filter above should have removed any resources that do not have a parent defined.
                if (res.opts?.parent) {
                    // Check if the resource is parented to the stack.
                    const stackRegExp = new RegExp("pulumi:pulumi:Stack");
                    if (stackRegExp.test(res.opts.parent)) {
                        // Check if the resource is not an approved component type nor an approved resource type.
                        // If not then report a violation.
                        if ((!approvedComponents.includes(res.type)) && (!allowedTypes.includes(res.type))) {
                            reportViolation(
                                `The following resource is not an approved component or resource type:\nResource name: ${res.name}\nResource type: ${res.type}\nContact the platform team to get this resource type approved or check the approved components list.`
                            );
                        };
                    } 
                } else {
                    log.info(`Resource, ${res.name}, of type ${res.type} is not parented to the stack.\nThis is unexpected and should be reported to the platform team.`);
                }
            }
        },

        // Component version check.
        // This policy checks that if a component is used, it is the correct version.
        // It uses "validateStack" instead of "validateResource" only to show it's use.
        // Because "validateStack" is called after all resources have been validated, it introduces a loop-hole in that if one uses
        // `pulumi up --skip-preview` this policy will not stop the udpate even if the policy is set to mandatory.
        // But an assumption is that using an old version would likely not be a mandatory policy and thus shouldn't halt the update.
        // Plus uing "validateStack" allows for a nice summary of all the resources that are out of date. 
        {
            name: "check-component-versions",
            description: "COMPONENT VERSION CHECK: Verifies that if a component is used, it is the correct version.",
            enforcementLevel: "advisory",
            // Uses policy config. See README for links to docs.
            // See colocated `platform-team-policy.json` for the config file.
            // NOTE: That the versions in the config are all set to cause this policy to fire.
            configSchema: {
                properties: {
                    allowedComponentVersions: {
                        type: "array",
                        default: []
                    },
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
            },
        }
    ],
});

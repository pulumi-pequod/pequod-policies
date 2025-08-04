import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import { log } from "@pulumi/pulumi";

new PolicyPack("approved-components-and-resource-types", {
    policies: [
        //// Component usage and allowed resource types check
        {
            name: "approved-components-and-resource-types",
            description: "VALIDATES: Approved components and resource types are used.",
            enforcementLevel: "advisory",
            // Uses policy config. See README for links to docs.
            // See colocated `platform-team-policy.json` for the config file and note how the JSON object is keyed by the policy name. 
            configSchema: {
                properties: {
                    approvedComponentTypes: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        default: []
                    },
                    allowedResourceTypes: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        default: []
                    }
                }
            },
            validateResource: (res, reportViolation) => {
                // Ignore provider resources and the stack itself.
                const ignoreTypeRegExp =  new RegExp("pulumi:providers|pulumi:pulumi:Stack")
                if (ignoreTypeRegExp.test(res.type)) {
                    log.debug(`Policy "approved-components-and-resource-types": Ignoring resource, ${res.name} since it is of type ${res.type}`);
                    return;
                }

                // Get list of approved components from policy configuration.
                // This is an array of objects where the key is the component type and the value is the version.
                const approvedComponents = res.getConfig<{approvedComponentTypes: string[]}>().approvedComponentTypes;
                if (!approvedComponents) {
                    log.error('Policy "approved-components-and-resource-types": No approved components found in policy configuration.');
                    return;
                }

                // Get list of allowed types
                // This is an array of resource types that are allowed to be used outside of a component.
                const allowedTypes = res.getConfig<{allowedResourceTypes: string[]}>().allowedResourceTypes;
                if (!allowedTypes) {
                    log.error('Policy "approved-components-and-resource-types": No allowed types found in policy configuration.');
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
                    log.info(`Policy "approved-components-and-resource-types": Resource, ${res.name}, of type ${res.type} is not parented to the stack.\nThis is unexpected and should be investigated further.`);
                }
            }
        }
    ]
});

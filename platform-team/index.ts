import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

new PolicyPack("platform-team", {
    policies: [
        //// Component usage and allowed resource types check
        {
            name: "check-component-usage",
            description: "COMPONENT USAGE CHECK:Verifies if certain resource types are created outside of a component.",
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
            validateStack: (stack, reportViolation) => {
                // Get list of approved components from policy configuration.
                // This is an array of objects where the key is the component type and the value is the version.
                const approvedComponents = stack.getConfig<{approvedComponentTypes: string[]}>().approvedComponentTypes;

                // Get list of allowed types
                // This is an array of resource types that are allowed to be used outside of a component.
                const allowedTypes = stack.getConfig<{allowedResourceTypes: string[]}>().allowedResourceTypes;

                // Get resources in the stack that are not "standard" Pulumi types
                const ignoreTypeRegExp =  new RegExp("pulumi:providers|pulumi:pulumi:Stack")
                let resourcesToCheck = stack.resources.filter(resource => !ignoreTypeRegExp.test(resource.type))

                // Whittle down the list of resources by removing any that ARE approved component type
                resourcesToCheck = resourcesToCheck.filter(resource => !approvedComponents.includes(resource.type))
                // And remove those resources that are in the allowed types list
                resourcesToCheck = resourcesToCheck.filter(resource => !allowedTypes.includes(resource.type))

                // Now find any resources left that are not parented to an approved component. 
                const unapprovedResources = resourcesToCheck.filter((resource) => !approvedComponents.includes(resource?.parent?.type || ""))

                // And build a list of unique types across that set of resources to report to the user.
                const unapprovedResourceTypes = unapprovedResources.map((resource) => ` ${resource.type}`).filter((value, index, array) => array.indexOf(value) === index)

                // Throw an error if there are resources created outside of approved components.
                if (unapprovedResourceTypes.length > 0) {
                    reportViolation(
                        `The following resource types should not be created outside of a platform-team provided component:\n${unapprovedResourceTypes}`
                    );
                }
            },
        },

        // Component version check.
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
                    reportViolation(
                        `This stack is using out of date versions of the following components:\n${outofdateComponents}`
                    );
                }
            },
        }
    ],
});

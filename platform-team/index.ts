import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

new PolicyPack("platform-team", {
    policies: [{
        name: "approved-component-required",
        description: "Prohibits creating certain resource types outside of a component.",
        enforcementLevel: "advisory",
        // Uses policy config. See README for links to docs.
        // See colocated `platform-team-policy.json` for the config file and note how the JSON object is keyed by the policy name. 
        configSchema: {
            properties: {
                approvedComponents: {
                    type: "array",
                    default: [ "stackmgmt:index:stacksettings" ]
                },
                allowedTypes: {
                    type: "array",
                    default: []
                }
            }
        },
        validateStack: (stack, reportViolation) => {
            // Get list of approved components
            const approvedComponents = stack.getConfig<{approvedComponents: string[]}>().approvedComponents;
            // Get list of allowed types
            const allowedTypes = stack.getConfig<{allowedTypes: string[]}>().allowedTypes;

            // Get resources in the stack that are not standard Pulumi types
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
                    `The following resource types cannot be created outside of a platform-team provided component:\n${unapprovedResourceTypes}`
                );
            }
        },
    }],
});

import * as gcp from "@pulumi/gcp";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import * as pulumi from "@pulumi/pulumi";

// tslint:disable-next-line:no-unused-expression
new PolicyPack("gcp", {
    policies: [
        {
            name: "discouraged-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (resource, _, reportViolation) => {
                resource.networkInterfaces?.forEach(networkInterface => {
                    if (networkInterface.accessConfigs !== undefined) {
                        reportViolation("`accessConfigs` should be undefined");
                    }
                });
            }),
        },
        {
            name: "discouraged-public-internet",
            description: "Ingress rules with public internet access are discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(gcp.compute.Firewall, (resource, _, reportViolation) => {
                resource.sourceRanges?.forEach(sourceRange => {
                    if (sourceRange === "0.0.0.0/0") {
                        reportViolation("`sourceRange` should not be '0.0.0.0/0'");
                    }
                });
            }),
        },
        {
            name: "subnet-sizing",
            description: `Subnetworks must be of appropriate size.`,
            enforcementLevel: "advisory",
            configSchema: {
                properties: {
                    maxSubnetPrefixLength: {
                        type: "number",
                        default: 22,
                    },
                },
            },
            validateResource: validateResourceOfType(gcp.compute.Subnetwork, (resource, args, reportViolation) => {
                const { maxSubnetPrefixLength } = args.getConfig<{ maxSubnetPrefixLength: number }>();

                const prefixLengthAsNumber = Number.parseInt(resource.ipCidrRange.split("/")[1], 10);
                if (prefixLengthAsNumber < maxSubnetPrefixLength) {
                    reportViolation(`Address space [${resource.ipCidrRange}] is too large. Must be [/${maxSubnetPrefixLength}] or smaller.`);
                }
            }),
        },
        {
            name: "required-tags",
            description: "The following tags are required: cost-center, stack, Name.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (resource, _, reportViolation) => {
                const projectName = pulumi.getProject();
                if (resource.metadata?.["cost-center"] !== projectName) {
                    reportViolation(`[cost-center] metadata does not match [${projectName}]`);
                }

                const stackName = pulumi.getStack();
                if (resource.metadata?.["stack"] !== stackName) {
                    reportViolation(`[stack] metadata does not match [${stackName}]`);
                }

                if (resource.metadata?.["Name"] === undefined) {
                    reportViolation(`[Name] metadata is undefined`);
                }
            }),
        },
        {
            name: "prohibited-services",
            description: "Prohibit restricted services.",
            enforcementLevel: "advisory",
            validateResource: (resource, reportViolation) => {
                const prohibitedServices = ["gcp:iot", "gcp:spanner"];
                prohibitedServices.forEach(it => {
                    if (resource.type.startsWith(it)) {
                        reportViolation(`Use of [${resource.type}] is prohibited`);
                    }
                });
            },
        },
        {
            name: "maximum-instance-count",
            description: "Check for maximum number of instances.",
            enforcementLevel: "advisory",
            configSchema: {
                properties: {
                    maximumInstanceCount: {
                        type: "integer",
                        default: 2,
                    },
                },
            },
            validateStack: (stack, reportViolation) => {
                const { maximumInstanceCount } = stack.getConfig<{ maximumInstanceCount: number }>();
                const instances = stack.resources.filter(it => it.isType(gcp.compute.Instance));
                if (instances.length > maximumInstanceCount) {
                    reportViolation(`Number of instances [${instances.length}] exceeds maximum number of instances [${maximumInstanceCount}].`);
                }
            },
        },
        {
            name: "allowed-image-owner",
            description: "Check machine image is from an approved publisher.",
            enforcementLevel: "advisory",
            configSchema: {
                properties: {
                    allowedPublishers: {
                        type: "array",
                        items: { type: "string", },
                        default: [
                            "ubuntu-os-cloud", // Ubuntu
                        ],
                    },
                },
            },
            validateResource: validateResourceOfType(gcp.compute.Instance, (it, args, reportViolation) => {
                const { allowedPublishers } = args.getConfig<{ allowedPublishers: string[] }>();

                // Validate the publisher of the image
                const imageName = it.bootDisk?.initializeParams?.image!;
                const imagePublisher = imageName.substring(0, imageName.indexOf("/"));
                if (allowedPublishers.indexOf(imagePublisher) === -1) {
                    reportViolation(`Publisher [${imagePublisher}] is not one of [${allowedPublishers}].`);
                }
            }),
        },
    ],
});

import * as network from "@pulumi/azure-native/network";
import * as compute from "@pulumi/azure-native/compute";
import * as web from "@pulumi/azure-native/web";
import * as containerservice from "@pulumi/azure-native/containerservice";

import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import * as pulumi from "@pulumi/pulumi";

new PolicyPack("azure", {
    policies: [
        {
            name: "discouraged-public-internet",
            description: "Ingress rules with public internet access are discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(network.SecurityRule, (resource, _, reportViolation) => {
                if (resource.sourceAddressPrefix === "*") {
                    reportViolation("`sourceAddressPrefix` should not be '*'");
                }
            }),
        },
        {
            name: "vnet-sizing",
            description: `VNETs must be of appropriate size.`,
            enforcementLevel: "advisory",
            configSchema: {
                properties: {
                    maxSubnetPrefixLength: {
                        type: "number",
                        default: 22,
                    },
                },
            },
            validateResource: validateResourceOfType(network.VirtualNetwork, (resource, args, reportViolation) => {
                const { maxSubnetPrefixLength } = args.getConfig<{ maxSubnetPrefixLength: number }>();

                resource.addressSpace?.addressPrefixes?.forEach(it => {
                    const prefixLengthAsNumber = Number.parseInt(it.split("/")[1], 10);
                    if (prefixLengthAsNumber < maxSubnetPrefixLength) {
                        reportViolation(`Address space [${it}] is too large. Must be [/${maxSubnetPrefixLength}] or smaller.`);
                    }
                });
            }),
        },
        {
            name: "required-tags",
            description: "The following tags are required: cost-center, stack, Name.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(compute.VirtualMachine, (resource, _, reportViolation) => {
                const projectName = pulumi.getProject();
                if (resource.tags?.["cost-center"] !== projectName) {
                    reportViolation(`[cost-center] tag does not match [${projectName}]`);
                }

                const stackName = pulumi.getStack();
                if (resource.tags?.["stack"] !== stackName) {
                    reportViolation(`[stack] tag does not match [${stackName}]`);
                }

                if (resource.tags?.["Name"] === undefined) {
                    reportViolation(`[Name] tag is undefined`);
                }
            }),
        },
        {
            name: "prohibited-services",
            description: "Prohibit restricted services.",
            enforcementLevel: "advisory",
            validateResource: (resource, reportViolation) => {
                const prohibitedServices = ["azure-native:iotcentral"];
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
                const instances = stack.resources.filter(it => it.isType(compute.VirtualMachine));
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
                        items: {
                            type: "string",
                        },
                        default: [
                            "canonical", // Ubuntu
                        ],
                    },
                },
            },
            validateResource: validateResourceOfType(compute.VirtualMachine, (resource, args, reportViolation) => {
                const { allowedPublishers } = args.getConfig<{ allowedPublishers: string[] }>();

                // Validate the publisher of the image
                const imagePublisher = resource.storageProfile?.imageReference?.publisher!;
                if (allowedPublishers.indexOf(imagePublisher) === -1) {
                    reportViolation(`Publisher [${imagePublisher}] is not one of [${allowedPublishers}].`);
                }
            }),
        },
        /** 
         * App Service Policies
         */
        {
            name: "app-service-sku-tier-check",
            description: "App service SKUs should only use the Basic tier.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(web.AppServicePlan, (resource, _, reportViolation) => {
                // If sku name is specified make sure it only uses "level 1" of the given type.
                if ((resource.sku) && (resource.sku.name)) {
                    const skuName = resource.sku.name
                    const skuLevel = parseInt(skuName.split("")[1])
                    if (skuLevel > 1) {
                        reportViolation("AppService Plan SKU should use level 1 (e.g. B1, S1, P1).");
                    }
                }
            }),
        },
        /**
         * AKS policies
         */
        {
            name: "aks-allowed-version",
            description: "Enforce the AKS Kubernetes version.",
            enforcementLevel: "advisory",
            configSchema: {
                properties: {
                    allowedVersions: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        default: [
                            // az aks get-versions
                            "1.19.7",
                            "1.20.2"
                        ],
                    },
                },
            },
            validateResource: validateResourceOfType(containerservice.ManagedCluster, (resource, args, reportViolation) => {
                const { allowedVersions } = args.getConfig<{ allowedVersions: string[] }>();

                const version = resource.kubernetesVersion || "";
                if (allowedVersions.indexOf(version) === -1) {
                    reportViolation(`Cluster version [${version}] is not one of [${allowedVersions}].`);
                }
            }),
        },
        {
            name: "aks-enable-rbac",
            description: "Enforce cluster RBAC.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(containerservice.ManagedCluster, (resource, args, reportViolation) => {
                if (resource.enableRBAC !== true) {
                    reportViolation(`Cluster property [enableRBAC] should be set to [true].`);
                }
            }),
        },
        {
            name: "aks-agentpool-count",
            description: "Enforce highly-available AgentPools.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(containerservice.AgentPool, (resource, args, reportViolation) => {
                const agentPoolCount = resource.count ?? 1;
                if (agentPoolCount <= 1) {
                    reportViolation(`AgentPool property [count] should be greater than [${agentPoolCount}].`);
                }
            }),
        },
        {
            name: "aks-agentpool-autoscaling",
            description: "Enforce autoscaling AgentPools.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(containerservice.AgentPool, (resource, args, reportViolation) => {
                if (resource.enableAutoScaling !== true) {
                    reportViolation(`AgentPool property [enableAutoScaling] should be [true].`);
                }
            }),
        },
        {
            name: "aks-required-tags",
            description: "The following tags are required on AKS clusters: cost-center, stack, Name.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(containerservice.ManagedCluster, (resource, _, reportViolation) => {
                const projectName = pulumi.getProject();
                if (resource.tags?.["cost-center"] !== projectName) {
                    reportViolation(`[cost-center] tag does not match [${projectName}]`);
                }

                const stackName = pulumi.getStack();
                if (resource.tags?.["stack"] !== stackName) {
                    reportViolation(`[stack] tag does not match [${stackName}]`);
                }

                if (resource.tags?.["Name"] === undefined) {
                    reportViolation(`[Name] tag is undefined`);
                }
            }),
        }
    ],
});

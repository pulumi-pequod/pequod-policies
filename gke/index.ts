import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as policy from "@pulumi/policy";

new policy.PolicyPack("gke-cluster-policy-pack", {
    policies: [
        {
            name: "gke-cluster-node-count",
            description: "Ensure GKE cluster node count is within the allowed range.",
            enforcementLevel: "advisory",
            validateResource: policy.validateResourceOfType(gcp.container.Cluster, (cluster, args, reportViolation) => {
                if (cluster.initialNodeCount && cluster.initialNodeCount < 3) {
                    reportViolation("GKE cluster must have at least 3 nodes.");
                }
            }),
        },
        {
            name: "gke-cluster-machine-type",
            description: "Ensure GKE cluster nodes use a specific machine type.",
            enforcementLevel: "advisory",
            validateResource: policy.validateResourceOfType(gcp.container.NodePool, (nodePool, args, reportViolation) => {
                const allowedMachineTypes = ["n1-standard-1", "n1-standard-2"];
                if (nodePool.nodeConfig?.machineType && !allowedMachineTypes.includes(nodePool.nodeConfig.machineType)) {
                    reportViolation(`GKE cluster nodes must use one of the following machine types: ${allowedMachineTypes.join(", ")}`);
                }
            }),
        },
    ],
});
